import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import {
  DECK_IDS,
  MIXER_OUTPUTS,
  PLAYBACK_MODES,
  defaultMixerState,
  newDeck,
  type Deck,
  type DeckId,
  type DeckPlaylistEntry,
  type MixerOutputId,
  type MixerState,
  type PlaybackMode,
} from "./types";
import { normalizeAutoAdvanceSeconds } from "./playback-defaults";

/* ── Storage: RETROVERSE_DATA/ops/bobos/mixer/state.json ── */

function mixerDir(): string {
  return join(opsStateDir(), "bobos", "mixer");
}

function statePath(): string {
  return join(mixerDir(), "state.json");
}

function normalizeEntry(raw: unknown): DeckPlaylistEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<DeckPlaylistEntry>;
  if (typeof obj.entryId !== "string" || typeof obj.assetId !== "string" || typeof obj.kind !== "string") {
    return null;
  }
  return {
    entryId: obj.entryId,
    assetId: obj.assetId,
    kind: obj.kind as DeckPlaylistEntry["kind"],
    title: typeof obj.title === "string" ? obj.title : obj.assetId,
    subtitle: typeof obj.subtitle === "string" ? obj.subtitle : "",
    coverUrl: typeof obj.coverUrl === "string" ? obj.coverUrl : null,
    durationSeconds: typeof obj.durationSeconds === "number" ? obj.durationSeconds : null,
    loop: obj.loop === true,
  };
}

function normalizeOutput(raw: unknown): MixerOutputId | null {
  return typeof raw === "string" && (MIXER_OUTPUTS as readonly string[]).includes(raw)
    ? (raw as MixerOutputId)
    : null;
}

function normalizePlaybackMode(raw: unknown, legacyLoop?: boolean): PlaybackMode {
  if (typeof raw === "string" && (PLAYBACK_MODES as readonly string[]).includes(raw)) {
    return raw as PlaybackMode;
  }
  return legacyLoop === true ? "loop" : "auto";
}

function normalizeDeck(id: DeckId, raw: unknown): Deck {
  const fallback = newDeck(id);
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Partial<Deck> & { loop?: boolean };
  const playlist = Array.isArray(obj.playlist)
    ? obj.playlist.map(normalizeEntry).filter((entry): entry is DeckPlaylistEntry => entry !== null)
    : [];
  const currentIndex =
    typeof obj.currentIndex === "number" && obj.currentIndex >= 0 && obj.currentIndex < playlist.length
      ? obj.currentIndex
      : 0;
  return {
    id,
    playlist,
    currentIndex,
    output: normalizeOutput(obj.output) ?? fallback.output,
    playbackMode: normalizePlaybackMode(obj.playbackMode, obj.loop),
    autoReturnToLive: obj.autoReturnToLive !== false,
  };
}

function normalizeState(raw: unknown): MixerState {
  const fallback = defaultMixerState();
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Partial<MixerState>;
  return {
    version: 1,
    left: normalizeDeck("left", obj.left),
    right: normalizeDeck("right", obj.right),
    autoAdvanceSeconds: normalizeAutoAdvanceSeconds(obj.autoAdvanceSeconds),
    liveDeckId: (DECK_IDS as readonly string[]).includes(obj.liveDeckId ?? "")
      ? (obj.liveDeckId as DeckId)
      : null,
  };
}

export async function loadMixerState(): Promise<MixerState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultMixerState();
  }
}

export async function saveMixerState(state: MixerState): Promise<void> {
  await mkdir(mixerDir(), { recursive: true });
  await writeFile(statePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
