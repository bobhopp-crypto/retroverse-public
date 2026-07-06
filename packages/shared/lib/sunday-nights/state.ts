import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { pgSundayNightsGet, pgSundayNightsSet } from "./pg-state";
import { normalizeLiveTrackId } from "./resolve-live-track";
import { usePostgresSundayNightsState } from "./storage-mode";
import type { SundayNightsLiveSelection, SundayNightsState } from "./types";

const PG_KEY = "live";

function statePath(): string {
  return join(opsStateDir(), "sunday-nights", "state.json");
}

function emptyState(): SundayNightsState {
  return {
    version: 2,
    currentTrackId: null,
    live: null,
    updatedAt: new Date().toISOString(),
    bridgePlaying: false,
    bridgeStoppedAt: null,
    vdjTakeoverActive: false,
    vdjStoppedAt: null,
  };
}

function normalizeLive(raw: unknown): SundayNightsLiveSelection | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<SundayNightsLiveSelection>;
  const artist = typeof obj.artist === "string" ? obj.artist.trim() : "";
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  if (!artist || !title) return null;

  const rvtr = normalizeLiveTrackId(typeof obj.rvtr === "string" ? obj.rvtr : null);
  const year =
    typeof obj.year === "number" && Number.isFinite(obj.year) ? obj.year : null;
  const coverUrl =
    typeof obj.coverUrl === "string" && obj.coverUrl.trim() ? obj.coverUrl.trim() : null;
  const songKey =
    typeof obj.songKey === "string" && obj.songKey.trim() ? obj.songKey.trim() : null;

  const source =
    obj.source === "manual" || obj.source === "bridge" || obj.source === "channel"
      ? obj.source
      : null;
  const filepath =
    typeof obj.filepath === "string" && obj.filepath.trim() ? obj.filepath.trim() : null;
  const deck = typeof obj.deck === "number" && Number.isFinite(obj.deck) ? obj.deck : null;
  const bridgeTimestamp =
    typeof obj.bridgeTimestamp === "string" && obj.bridgeTimestamp.trim()
      ? obj.bridgeTimestamp.trim()
      : null;
  const resolution =
    obj.resolution === "filepath" ||
    obj.resolution === "vdj-library" ||
    obj.resolution === "fallback" ||
    obj.resolution === "unresolved"
      ? obj.resolution
      : null;

  return {
    rvtr,
    artist,
    title,
    year,
    coverUrl,
    songKey,
    source,
    filepath,
    deck,
    bridgeTimestamp,
    resolution,
  };
}

function normalizeState(raw: unknown): SundayNightsState {
  if (!raw || typeof raw !== "object") return emptyState();
  const obj = raw as Partial<SundayNightsState> & { version?: number };

  const currentTrackId = normalizeLiveTrackId(
    typeof obj.currentTrackId === "string" ? obj.currentTrackId : null,
  );

  const live = normalizeLive(obj.live);

  return {
    version: 2,
    currentTrackId: live?.rvtr ?? currentTrackId,
    live,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : new Date().toISOString(),
    bridgePlaying: obj.bridgePlaying === true,
    bridgeStoppedAt:
      typeof obj.bridgeStoppedAt === "string" && obj.bridgeStoppedAt.trim()
        ? obj.bridgeStoppedAt.trim()
        : null,
    vdjTakeoverActive: obj.vdjTakeoverActive === true,
    vdjStoppedAt:
      typeof obj.vdjStoppedAt === "string" && obj.vdjStoppedAt.trim()
        ? obj.vdjStoppedAt.trim()
        : null,
  };
}

async function loadStateFromJson(): Promise<SundayNightsState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    return normalizeState(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

async function saveStateToJson(state: SundayNightsState): Promise<void> {
  const dir = join(opsStateDir(), "sunday-nights");
  await mkdir(dir, { recursive: true });
  await writeFile(statePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function loadSundayNightsState(): Promise<SundayNightsState> {
  if (usePostgresSundayNightsState()) {
    const raw = await pgSundayNightsGet<Record<string, unknown>>(PG_KEY);
    return raw ? normalizeState(raw) : emptyState();
  }
  return loadStateFromJson();
}

export async function saveSundayNightsState(state: SundayNightsState): Promise<void> {
  if (usePostgresSundayNightsState()) {
    await pgSundayNightsSet(PG_KEY, state as unknown as Record<string, unknown>);
    return;
  }
  await saveStateToJson(state);
}

export async function setCurrentTrackId(trackId: string | null): Promise<SundayNightsState> {
  const normalized = normalizeLiveTrackId(trackId);
  return setLiveTrack(
    normalized
      ? {
          rvtr: normalized,
          artist: "—",
          title: "—",
          year: null,
        }
      : null,
  );
}

export async function setLiveTrack(
  selection: SundayNightsLiveSelection | null,
  options?: { bridgePlaying?: boolean },
): Promise<SundayNightsState> {
  const live = selection ? normalizeLive(selection) : null;
  const prev = await loadSundayNightsState();
  const next: SundayNightsState = {
    version: 2,
    currentTrackId: live?.rvtr ?? null,
    live,
    updatedAt: new Date().toISOString(),
    bridgePlaying: options?.bridgePlaying ?? prev.bridgePlaying ?? false,
    bridgeStoppedAt:
      options?.bridgePlaying === true ? null : (prev.bridgeStoppedAt ?? null),
    vdjTakeoverActive: prev.vdjTakeoverActive ?? false,
    vdjStoppedAt: options?.bridgePlaying === true ? null : (prev.vdjStoppedAt ?? null),
  };
  await saveSundayNightsState(next);
  return next;
}
