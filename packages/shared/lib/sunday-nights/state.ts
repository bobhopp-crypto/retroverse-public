import { loadLiveStateRecord, saveLiveStateRecord } from "./live-state-io";
import { normalizeLiveTrackId } from "./resolve-live-track";
import type { SundayNightsLiveSelection, SundayNightsState } from "./types";

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
    startedAt: typeof obj.startedAt === "string" && Number.isFinite(Date.parse(obj.startedAt)) ? obj.startedAt : bridgeTimestamp,
    durationSeconds: typeof obj.durationSeconds === "number" && Number.isFinite(obj.durationSeconds) && obj.durationSeconds > 0 ? obj.durationSeconds : null,
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

export async function loadSundayNightsState(): Promise<SundayNightsState> {
  const raw = await loadLiveStateRecord();
  return raw ? normalizeState(raw) : emptyState();
}

export async function saveSundayNightsState(state: SundayNightsState): Promise<void> {
  await saveLiveStateRecord(state);
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
