import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { pgSundayNightsGet, pgSundayNightsSet } from "./pg-state";
import { usePostgresSundayNightsState } from "./storage-mode";
import type { SundayNightsLiveSelection, SundayNightsState } from "./types";

const PG_KEY = "live";
const RE_RVTR = /^RVTR\d{6}$/i;

function statePath(): string {
  return join(opsStateDir(), "sunday-nights", "state.json");
}

function emptyState(): SundayNightsState {
  return {
    version: 2,
    currentTrackId: null,
    live: null,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeLive(raw: unknown): SundayNightsLiveSelection | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<SundayNightsLiveSelection>;
  const artist = typeof obj.artist === "string" ? obj.artist.trim() : "";
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  if (!artist || !title) return null;

  const rvtrRaw = typeof obj.rvtr === "string" ? obj.rvtr.trim().toUpperCase() : null;
  const rvtr = rvtrRaw && RE_RVTR.test(rvtrRaw) ? rvtrRaw : null;
  const year =
    typeof obj.year === "number" && Number.isFinite(obj.year) ? obj.year : null;
  const coverUrl =
    typeof obj.coverUrl === "string" && obj.coverUrl.trim() ? obj.coverUrl.trim() : null;
  const songKey =
    typeof obj.songKey === "string" && obj.songKey.trim() ? obj.songKey.trim() : null;

  return { rvtr, artist, title, year, coverUrl, songKey };
}

function normalizeState(raw: unknown): SundayNightsState {
  if (!raw || typeof raw !== "object") return emptyState();
  const obj = raw as Partial<SundayNightsState> & { version?: number };

  const trackIdRaw =
    typeof obj.currentTrackId === "string" && obj.currentTrackId.trim()
      ? obj.currentTrackId.trim().toUpperCase()
      : null;
  const currentTrackId =
    trackIdRaw && RE_RVTR.test(trackIdRaw) ? trackIdRaw : null;

  const live = normalizeLive(obj.live);

  return {
    version: 2,
    currentTrackId: live?.rvtr ?? currentTrackId,
    live,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : new Date().toISOString(),
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
  const normalized =
    trackId?.trim() && RE_RVTR.test(trackId.trim())
      ? trackId.trim().toUpperCase()
      : null;
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
): Promise<SundayNightsState> {
  const live = selection ? normalizeLive(selection) : null;
  const next: SundayNightsState = {
    version: 2,
    currentTrackId: live?.rvtr ?? null,
    live,
    updatedAt: new Date().toISOString(),
  };
  await saveSundayNightsState(next);
  return next;
}
