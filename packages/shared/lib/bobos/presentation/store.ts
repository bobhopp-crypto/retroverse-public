import "server-only";

import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

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
  type Presentation,
  type PresentationItem,
  type PresentationQueue,
  type PresentationState,
} from "./types";
import { enabledItems, resolvePlayhead, stepIndex } from "./resolve-playhead";
import { BoothAuthorityError, isBoothSessionActive } from "./booth-authority";
import { normalizePresentationStateFields } from "./vdj-takeover";

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

/**
 * Answer the only question every audience surface asks:
 * which experience is selected for retroverse.live?
 *
 * Experience Selector owns that answer. Booth ownership / auto-follow are not used.
 */
export async function buildPlayheadPayload(): Promise<PlayheadPayload> {
  const { buildSelectedPlayheadPayload } = await import(
    "@/lib/bobos/experience-selector/resolve"
  );
  return buildSelectedPlayheadPayload(new Date());
}
