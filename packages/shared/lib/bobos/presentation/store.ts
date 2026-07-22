import "server-only";

import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { normalizePlayheadPayload } from "@/lib/broadcast/normalize-playhead";
import { opsStateDir } from "@/lib/ops/ops-state-path";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

import { injectBoothItemIntoQueue } from "@/lib/bobos/booth/publish";

import { loadBroadcastSnapshot, saveBroadcastSnapshot } from "./broadcast-snapshot";
import { pushBroadcastToPublic, type PublicPushResult } from "./push-public";
import {
  defaultPresentationState,
  type BoothPublisherState,
  type BroadcastSnapshot,
  type PlayheadCommand,
  type PlayheadMover,
  type PlayheadPayload,
  type PlayheadPayloadCore,
  type PlayheadVdjState,
  type Presentation,
  type PresentationItem,
  type PresentationQueue,
  type PresentationState,
} from "./types";
import { enabledItems, resolvePlayhead, stepIndex } from "./resolve-playhead";
import { BoothAuthorityError, isBoothSessionActive } from "./booth-authority";
import {
  applyVdjPresentationItem,
  buildPlayheadVdjStateFromSundayNights,
  normalizePresentationStateFields,
} from "./vdj-takeover";

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
      lastBoothPublishedKey: fields.lastBoothPublishedKey ?? null,
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

function applyBoothPublisherToSnapshot(
  snapshot: BroadcastSnapshot,
  booth: BoothPublisherState | null | undefined,
  nowIso: string,
): BroadcastSnapshot {
  if (!booth?.sessionActive) {
    return {
      ...snapshot,
      boothPublisher: booth ?? null,
    };
  }

  // Program owns The Air — authoritative queue + playhead already set. No inject.
  if (booth.source === "Program") {
    return {
      ...snapshot,
      boothPublisher: booth,
      autoFollowVdj: false,
      manualTakeActive: true,
      updatedAt: nowIso,
    };
  }

  if (!booth.item) {
    return {
      ...snapshot,
      boothPublisher: booth,
      autoFollowVdj: false,
      manualTakeActive: false,
      playhead: {
        ...snapshot.playhead,
        mode: "paused",
        movedBy: "cockpit",
        updatedAt: nowIso,
      },
      updatedAt: nowIso,
    };
  }

  // Interrupt Sources — inject Booth air item onto the snapshot.
  const queue = injectBoothItemIntoQueue(snapshot.queue, booth.item);
  return {
    ...snapshot,
    queue,
    boothPublisher: booth,
    autoFollowVdj: false,
    manualTakeActive: true,
    playhead: {
      presentationId: snapshot.presentationId,
      anchorItemId: booth.item.id,
      anchorStartedAt: nowIso,
      mode: "playing",
      movedBy: "cockpit",
      updatedAt: nowIso,
    },
    updatedAt: nowIso,
  };
}

/**
 * Rebuild the Broadcast Snapshot from the active published presentation and
 * its playhead, save it locally, and push it to the deployed site.
 * Called after every mutation (publish, transport) so localhost and the
 * public site stay in lockstep.
 *
 * When The Booth session is active, Booth ownership is re-applied onto the
 * snapshot so Mixer/transport sync cannot silently steal the air.
 */
export async function syncBroadcast(): Promise<PublicPushResult> {
  const state = await loadPresentationState();
  const activeId = state.activePresentationId;
  const presentation = activeId ? await getPresentation(activeId) : null;
  const published = presentation?.published ?? null;
  if (!presentation || !published) {
    return { status: "unconfigured", detail: "No published presentation on air" };
  }

  const nowIso = new Date().toISOString();
  const base: BroadcastSnapshot = {
    version: 1,
    presentationId: presentation.id,
    title: published.title,
    queue: published.queue,
    playhead: state.playhead,
    publishedAt: published.publishedAt,
    updatedAt: nowIso,
    autoFollowVdj: state.autoFollowVdj !== false,
    manualTakeActive: state.manualTakeActive === true,
    boothPublisher: state.boothPublisher ?? null,
  };
  const snapshot = applyBoothPublisherToSnapshot(base, state.boothPublisher, nowIso);
  await saveBroadcastSnapshot(snapshot);
  return pushBroadcastToPublic(snapshot);
}

/** Snapshot the draft queue as the published copy and put it on air. */
export async function publishPresentation(id: string): Promise<Presentation | null> {
  if (await isBoothSessionActive()) {
    throw new BoothAuthorityError(
      "The Booth owns The Air — publishing a presentation is rejected while Booth session is active",
    );
  }

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
 *
 * While a Booth session is active, only `authority: "booth"` may mutate.
 * Legacy callers receive BoothAuthorityError (clear rejection).
 */
export async function movePlayhead(
  command: PlayheadCommand,
  movedBy: PlayheadMover = "manual",
  options?: { sync?: boolean; authority?: "booth" | "legacy" },
): Promise<PresentationState> {
  const authority = options?.authority ?? "legacy";
  if (authority !== "booth" && (await isBoothSessionActive())) {
    throw new BoothAuthorityError();
  }

  const state = await loadPresentationState();
  const activeId = state.activePresentationId;
  if (!activeId) return state;

  const presentation = await getPresentation(activeId);
  const queue = presentation?.published?.queue;
  if (!queue) return state;

  const items = enabledItems(queue);
  const now = new Date();
  // Transport steps from the stored anchor — never from a duration-walked resolve.
  // (Walking is for audience display when Booth is not operator-driving Program.)
  const anchorIndex = items.findIndex((item) => item.id === state.playhead.anchorItemId);
  const anchorAvailable = anchorIndex >= 0;

  // Preserve last valid stored anchor when unavailable — never invent index 0.
  let anchorItemId = state.playhead.anchorItemId;
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
      if (!anchorAvailable) {
        // Fail closed — do not step from a missing anchor.
        return state;
      }
      const target = stepIndex(
        items.length,
        anchorIndex,
        command.op === "next" ? 1 : -1,
        queue.loop,
      );
      if (target === null) {
        // End/beginning with no loop — keep current anchor (no silent restart).
        return state;
      }
      anchorItemId = items[target]!.id;
      break;
    }
    case "jump": {
      // Exact id only — never fall back to first/current on miss.
      const target = items.find((item) => item.id === command.itemId);
      if (!target) return state;
      anchorItemId = target.id;
      break;
    }
  }

  const isOperatorTake = movedBy === "manual" || movedBy === "cockpit";
  const changesItem =
    command.op === "jump" || command.op === "next" || command.op === "previous";
  if (isOperatorTake && changesItem) {
    state.manualTakeActive = true;
    mode = "playing";
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
  if (options?.sync !== false) {
    await syncBroadcast();
  }
  return state;
}

/* ── Public payload ── */

const OFF_AIR_VDJ: PlayheadVdjState = {
  playing: false,
  rvtr: null,
  takeoverActive: false,
  resumeBroadcastAt: null,
};

const OFF_AIR: Omit<PlayheadPayloadCore, "updatedAt"> = {
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
  manualTakeActive: false,
  vdj: OFF_AIR_VDJ,
};

/**
 * The Broadcast Output Contract: derive CurrentBroadcast + Rvba from the
 * fully-resolved payload core and attach them. This is the only place a
 * PlayheadPayloadCore becomes a real PlayheadPayload.
 */
function withCurrentBroadcast(payload: PlayheadPayloadCore, now: Date): PlayheadPayload {
  return normalizePlayheadPayload(payload, now);
}

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
 * MANUAL take (manualTakeActive): queue item wins even when autoFollowVdj is on.
 * AUTO mode (autoFollowVdj on, no manual take): item is the current VirtualDJ track.
 * One resolver — Broadcast Panel, retroverse.live, and all renderers call here.
 */
export async function buildPlayheadPayload(): Promise<PlayheadPayload> {
  // Read-only: never resume / change ownership as a side effect of GET/poll.
  const now = new Date();
  const [snapshot, sn] = await Promise.all([loadBroadcastSnapshot(), loadSundayNightsState()]);
  const vdj = buildPlayheadVdjStateFromSundayNights(sn);

  if (snapshot) {
    const boothActive = snapshot.boothPublisher?.sessionActive === true;
    const boothSource = snapshot.boothPublisher?.source ?? null;
    // Booth Program is operator-driven — hold the anchor (no duration auto-walk).
    // AUTO is out of scope for Booth V1; NEXT/PREVIOUS/JUMP move the anchor explicitly.
    const playheadForResolve =
      boothActive && boothSource === "Program"
        ? { ...snapshot.playhead, mode: "paused" as const }
        : snapshot.playhead;
    const resolved = resolvePlayhead(snapshot.queue, playheadForResolve, now);
    // Program: public item is the authoritative playhead (pause must keep asset).
    // Interrupts: public item is the Booth-injected air item.
    const boothPublicItem =
      boothSource === "Program"
        ? resolved.item
        : snapshot.boothPublisher?.item ?? null;
    const boothOnAir = boothActive && boothPublicItem != null;
    const core: PlayheadPayloadCore = {
      onAir: boothActive ? boothOnAir : resolved.available && resolved.item !== null,
      presentation: { id: snapshot.presentationId, title: snapshot.title },
      item: boothActive && boothSource !== "Program" ? boothPublicItem : resolved.item,
      itemIndex:
        boothActive && boothSource !== "Program"
          ? boothPublicItem
            ? 0
            : -1
          : resolved.index,
      itemCount: resolved.enabledCount,
      mode: snapshot.playhead.mode,
      elapsedSeconds: resolved.elapsedSeconds,
      nextItem: nextEnabledItem(snapshot.queue, resolved.index),
      queue: snapshot.queue,
      publishedAt: snapshot.publishedAt,
      updatedAt: snapshot.updatedAt,
      autoFollowVdj: boothActive ? false : snapshot.autoFollowVdj !== false,
      manualTakeActive: boothActive ? boothOnAir : snapshot.manualTakeActive === true,
      vdj,
    };
    // Booth session owns the air — do not let VDJ auto-follow override.
    const resolvedCore = boothActive ? core : applyVdjPresentationItem(core, sn, now);
    return withCurrentBroadcast(resolvedCore, now);
  }

  const state = await loadPresentationState();
  const autoFollowVdj = state.autoFollowVdj !== false;
  const manualTakeActive = state.manualTakeActive === true;
  const activeId = state.activePresentationId;
  const presentation = activeId ? await getPresentation(activeId) : null;
  const published = presentation?.published ?? null;
  if (!presentation || !published) {
    return withCurrentBroadcast(
      applyVdjPresentationItem(
        { ...OFF_AIR, autoFollowVdj, manualTakeActive, vdj, updatedAt: state.playhead.updatedAt },
        sn,
        now,
      ),
      now,
    );
  }

  const resolved = resolvePlayhead(published.queue, state.playhead, now);
  return withCurrentBroadcast(
    applyVdjPresentationItem(
      {
        onAir: resolved.available && resolved.item !== null,
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
        manualTakeActive,
        vdj,
      },
      sn,
      now,
    ),
    now,
  );
}
