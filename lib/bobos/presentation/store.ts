import "server-only";

import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import {
  defaultPresentationState,
  type PlayheadCommand,
  type PlayheadMover,
  type PlayheadPayload,
  type Presentation,
  type PresentationState,
} from "./types";
import { enabledItems, resolvePlayhead, stepIndex } from "./resolve-playhead";

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
    return {
      version: 1,
      activePresentationId: parsed.activePresentationId ?? null,
      playhead: parsed.playhead,
    };
  } catch {
    return defaultPresentationState();
  }
}

async function savePresentationState(state: PresentationState): Promise<void> {
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
  return state;
}

/* ── Public payload ── */

const OFF_AIR: Omit<PlayheadPayload, "updatedAt"> = {
  onAir: false,
  presentation: null,
  item: null,
  itemIndex: -1,
  itemCount: 0,
  mode: "paused",
  elapsedSeconds: 0,
};

/** Answer the only question the public player asks: what is the current Playhead? */
export async function buildPlayheadPayload(): Promise<PlayheadPayload> {
  const state = await loadPresentationState();
  const now = new Date();

  const activeId = state.activePresentationId;
  const presentation = activeId ? await getPresentation(activeId) : null;
  const published = presentation?.published ?? null;
  if (!presentation || !published) {
    return { ...OFF_AIR, updatedAt: state.playhead.updatedAt };
  }

  const resolved = resolvePlayhead(published.queue, state.playhead, now);
  return {
    onAir: resolved.item !== null,
    presentation: { id: presentation.id, title: published.title },
    item: resolved.item,
    itemIndex: resolved.index,
    itemCount: resolved.enabledCount,
    mode: state.playhead.mode,
    elapsedSeconds: resolved.elapsedSeconds,
    updatedAt: state.playhead.updatedAt,
  };
}
