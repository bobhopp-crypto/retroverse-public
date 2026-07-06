import "server-only";

import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { loadBroadcastSnapshot, saveBroadcastSnapshot } from "./broadcast-snapshot";
import { pushBroadcastToPublic, type PublicPushResult } from "./push-public";
import {
  defaultPresentationState,
  type BroadcastSnapshot,
  type PlayheadCommand,
  type PlayheadMover,
  type PlayheadPayload,
  type PlayheadVdjState,
  type Presentation,
  type PresentationItem,
  type PresentationQueue,
  type PresentationState,
} from "./types";
import { enabledItems, resolvePlayhead, stepIndex } from "./resolve-playhead";
import {
  applyVdjPresentationItem,
  buildPlayheadVdjState,
  maybeResumeBroadcastAfterVdjIdle,
  normalizePresentationStateFields,
  readAutoFollowVdj,
} from "./vdj-takeover";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

/* ── Storage: RETROVERSE_DATA/ops/bobos/presentation/{presentations,state}.json ── */

function presentationDir(): string {
  return join(opsStateDir(), "bobos", "presentation");
}

function presentationsPath(): string {
  return join(presentationDir(), "presentations.json");
}

function statePath(): string {
  return join(presentationDir(), "state.json");
}

type PresentationsFile = { version: 1; presentations: Presentation[] };

async function loadPresentationsFile(): Promise<PresentationsFile> {
  try {
    const raw = await readFile(presentationsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<PresentationsFile>;
    if (!Array.isArray(parsed.presentations)) throw new Error("bad file");
    return { version: 1, presentations: parsed.presentations as Presentation[] };
  } catch {
    return { version: 1, presentations: [] };
  }
}

async function savePresentationsFile(file: PresentationsFile): Promise<void> {
  await mkdir(presentationDir(), { recursive: true });
  await writeFile(presentationsPath(), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

export async function loadPresentationState(): Promise<PresentationState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<PresentationState>;
    if (!parsed.playhead) throw new Error("bad file");
    const fields = normalizePresentationStateFields(parsed);
    return {
      version: 1,
      activePresentationId: parsed.activePresentationId ?? null,
      playhead: parsed.playhead,
      ...fields,
    };
  } catch {
    return defaultPresentationState();
  }
}

export async function savePresentationState(state: PresentationState): Promise<void> {
  await mkdir(presentationDir(), { recursive: true });
  await writeFile(statePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

/* ── Presentations ── */

export async function listPresentations(): Promise<Presentation[]> {
  const file = await loadPresentationsFile();
  return [...file.presentations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPresentation(id: string): Promise<Presentation | null> {
  const file = await loadPresentationsFile();
  return file.presentations.find((presentation) => presentation.id === id) ?? null;
}

export async function createPresentation(title: string): Promise<Presentation> {
  const now = new Date().toISOString();
  const presentation: Presentation = {
    id: randomUUID(),
    title: title.trim() || "Untitled Presentation",
    description: "",
    createdAt: now,
    updatedAt: now,
    queue: { items: [], loop: true },
    published: null,
  };

  const file = await loadPresentationsFile();
  file.presentations.push(presentation);
  await savePresentationsFile(file);
  return presentation;
}

/** Replace the draft (title, description, queue) of a presentation. */
export async function saveDraft(
  id: string,
  patch: Pick<Presentation, "title" | "description" | "queue">,
): Promise<Presentation | null> {
  const file = await loadPresentationsFile();
  const presentation = file.presentations.find((p) => p.id === id);
  if (!presentation) return null;

  presentation.title = patch.title.trim() || presentation.title;
  presentation.description = patch.description;
  presentation.queue = patch.queue;
  presentation.updatedAt = new Date().toISOString();

  await savePresentationsFile(file);
  return presentation;
}

/* ── Broadcast sync ── */

/**
 * Rebuild the Broadcast Snapshot from the active published presentation and
 * its playhead, save it locally, and push it to the deployed site.
 * Called after every mutation (publish, transport) so localhost and the
 * public site stay in lockstep.
 */
export async function syncBroadcast(): Promise<PublicPushResult> {
  const state = await loadPresentationState();
  const activeId = state.activePresentationId;
  const presentation = activeId ? await getPresentation(activeId) : null;
  const published = presentation?.published ?? null;
  if (!presentation || !published) {
    return { status: "unconfigured", detail: "No published presentation on air" };
  }

  const snapshot: BroadcastSnapshot = {
    version: 1,
    presentationId: presentation.id,
    title: published.title,
    queue: published.queue,
    playhead: state.playhead,
    publishedAt: published.publishedAt,
    updatedAt: new Date().toISOString(),
    autoFollowVdj: state.autoFollowVdj !== false,
  };
  await saveBroadcastSnapshot(snapshot);
  return pushBroadcastToPublic(snapshot);
}

/** Snapshot the draft queue as the published copy and put it on air. */
export async function publishPresentation(id: string): Promise<Presentation | null> {
  const file = await loadPresentationsFile();
  const presentation = file.presentations.find((p) => p.id === id);
  if (!presentation) return null;

  const now = new Date().toISOString();
  presentation.published = {
    title: presentation.title,
    queue: structuredClone(presentation.queue),
    publishedAt: now,
  };
  presentation.updatedAt = now;
  await savePresentationsFile(file);

  const state = await loadPresentationState();
  state.activePresentationId = id;
  const firstEnabled = enabledItems(presentation.published.queue)[0] ?? null;
  // Re-anchor only when the playhead isn't already inside this presentation,
  // so republishing mid-show doesn't restart it from the top.
  if (state.playhead.presentationId !== id) {
    state.playhead = {
      presentationId: id,
      anchorItemId: firstEnabled?.id ?? null,
      anchorStartedAt: now,
      mode: firstEnabled ? "playing" : "paused",
      movedBy: "system",
      updatedAt: now,
    };
  }
  await savePresentationState(state);
  await syncBroadcast();

  return presentation;
}

/* ── Playhead control ── */

/**
 * Apply a transport command to the on-air playhead.
 * All commands re-anchor: the resolved current item becomes the new anchor.
 */
export async function movePlayhead(
  command: PlayheadCommand,
  movedBy: PlayheadMover = "manual",
): Promise<PresentationState> {
  const state = await loadPresentationState();
  const activeId = state.activePresentationId;
  if (!activeId) return state;

  const presentation = await getPresentation(activeId);
  const queue = presentation?.published?.queue;
  if (!queue) return state;

  const items = enabledItems(queue);
  const now = new Date();
  const resolved = resolvePlayhead(queue, state.playhead, now);

  let anchorItemId = resolved.item?.id ?? null;
  let mode = state.playhead.mode;

  switch (command.op) {
    case "play":
      mode = "playing";
      break;
    case "pause":
      mode = "paused";
      break;
    case "next":
    case "previous": {
      const target = stepIndex(
        items.length,
        resolved.index,
        command.op === "next" ? 1 : -1,
        queue.loop,
      );
      if (target !== null) anchorItemId = items[target].id;
      break;
    }
    case "jump": {
      const target = items.find((item) => item.id === command.itemId);
      if (target) anchorItemId = target.id;
      break;
    }
  }

  state.playhead = {
    presentationId: activeId,
    anchorItemId,
    anchorStartedAt: now.toISOString(),
    mode,
    movedBy,
    updatedAt: now.toISOString(),
  };
  await savePresentationState(state);
  await syncBroadcast();
  return state;
}

/* ── Public payload ── */

const OFF_AIR_VDJ: PlayheadVdjState = {
  playing: false,
  rvtr: null,
  takeoverActive: false,
  resumeBroadcastAt: null,
};

const OFF_AIR: Omit<PlayheadPayload, "updatedAt"> = {
  onAir: false,
  presentation: null,
  item: null,
  itemIndex: -1,
  itemCount: 0,
  mode: "paused",
  elapsedSeconds: 0,
  nextItem: null,
  queue: null,
  publishedAt: null,
  autoFollowVdj: true,
  vdj: OFF_AIR_VDJ,
};

function nextEnabledItem(
  queue: PresentationQueue,
  currentIndex: number,
): PresentationItem | null {
  const items = enabledItems(queue);
  if (items.length === 0 || currentIndex < 0) return null;
  if (currentIndex + 1 < items.length) return items[currentIndex + 1];
  return queue.loop && items.length > 1 ? items[0] : null;
}

/**
 * Answer the only question every audience surface asks: what is the current
 * presentation item?
 *
 * MANUAL mode (autoFollowVdj off): resolved from the Broadcast Snapshot queue.
 * AUTO mode: the item is the current VirtualDJ track from Sunday Nights state.
 * One resolver — Broadcast Panel, retroverse.live, and all renderers call here.
 */
export async function buildPlayheadPayload(): Promise<PlayheadPayload> {
  await maybeResumeBroadcastAfterVdjIdle();

  const autoFollowVdj = await readAutoFollowVdj();
  const [vdj, sn] = await Promise.all([buildPlayheadVdjState(), loadSundayNightsState()]);

  const now = new Date();
  const snapshot = await loadBroadcastSnapshot();

  if (snapshot) {
    const resolved = resolvePlayhead(snapshot.queue, snapshot.playhead, now);
    return applyVdjPresentationItem(
      {
        onAir: resolved.item !== null,
        presentation: { id: snapshot.presentationId, title: snapshot.title },
        item: resolved.item,
        itemIndex: resolved.index,
        itemCount: resolved.enabledCount,
        mode: snapshot.playhead.mode,
        elapsedSeconds: resolved.elapsedSeconds,
        nextItem: nextEnabledItem(snapshot.queue, resolved.index),
        queue: snapshot.queue,
        publishedAt: snapshot.publishedAt,
        updatedAt: snapshot.updatedAt,
        autoFollowVdj: snapshot.autoFollowVdj !== false,
        vdj,
      },
      sn,
      now,
    );
  }

  const state = await loadPresentationState();
  const activeId = state.activePresentationId;
  const presentation = activeId ? await getPresentation(activeId) : null;
  const published = presentation?.published ?? null;
  if (!presentation || !published) {
    return applyVdjPresentationItem(
      { ...OFF_AIR, autoFollowVdj, vdj, updatedAt: state.playhead.updatedAt },
      sn,
      now,
    );
  }

  const resolved = resolvePlayhead(published.queue, state.playhead, now);
  return applyVdjPresentationItem(
    {
      onAir: resolved.item !== null,
      presentation: { id: presentation.id, title: published.title },
      item: resolved.item,
      itemIndex: resolved.index,
      itemCount: resolved.enabledCount,
      mode: state.playhead.mode,
      elapsedSeconds: resolved.elapsedSeconds,
      nextItem: nextEnabledItem(published.queue, resolved.index),
      queue: published.queue,
      publishedAt: published.publishedAt,
      updatedAt: state.playhead.updatedAt,
      autoFollowVdj,
      vdj,
    },
    sn,
    now,
  );
}
