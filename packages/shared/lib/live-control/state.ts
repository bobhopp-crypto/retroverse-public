import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";
import { parseProducerEraId } from "@/lib/ops/year-workspace/producer/era";
import { pgSundayNightsGet, pgSundayNightsSet } from "@/lib/sunday-nights/pg-state";
import { usePostgresSundayNightsState } from "@/lib/sunday-nights/storage-mode";

import {
  DEFAULT_LIVE_CONTROL_CONFIG,
  emptyLiveControlState,
  type LiveControlConfig,
  type LiveControlState,
  type LiveContentSource,
  type LiveControlMode,
  type LiveDurationSeconds,
  type LiveOrder,
} from "./types";

const PG_KEY = "live-control";

function statePath(): string {
  return join(opsStateDir(), "live-control", "state.json");
}

function parseMode(value: unknown): LiveControlMode {
  if (value === "vdj" || value === "demo" || value === "playlist") return value;
  return DEFAULT_LIVE_CONTROL_CONFIG.mode;
}

function parseSource(value: unknown): LiveContentSource {
  const allowed: LiveContentSource[] = [
    "all_packages",
    "sunday_nights",
    "year",
    "era",
    "artist",
    "top_played",
  ];
  return allowed.includes(value as LiveContentSource)
    ? (value as LiveContentSource)
    : DEFAULT_LIVE_CONTROL_CONFIG.contentSource;
}

function parseOrder(value: unknown): LiveOrder {
  if (
    value === "random" ||
    value === "most_played" ||
    value === "chronological" ||
    value === "playlist_order"
  ) {
    return value;
  }
  return DEFAULT_LIVE_CONTROL_CONFIG.order;
}

function parseDuration(value: unknown): LiveDurationSeconds {
  if (value === 30 || value === 60 || value === 120) return value;
  return DEFAULT_LIVE_CONTROL_CONFIG.durationSeconds;
}

function normalizeState(raw: unknown): LiveControlState {
  if (!raw || typeof raw !== "object") return emptyLiveControlState();
  const obj = raw as Partial<LiveControlState>;
  const base = emptyLiveControlState();

  const year =
    typeof obj.year === "number" && Number.isFinite(obj.year) ? obj.year : base.year;
  const playlistYear =
    typeof obj.playlistYear === "number" && Number.isFinite(obj.playlistYear)
      ? obj.playlistYear
      : base.playlistYear;

  return {
    version: 1,
    running: obj.running === true,
    mode: parseMode(obj.mode),
    contentSource: parseSource(obj.contentSource),
    year,
    era: obj.era ? parseProducerEraId(obj.era) : base.era,
    artist: typeof obj.artist === "string" && obj.artist.trim() ? obj.artist.trim() : null,
    playlistYear,
    readyOnly: obj.readyOnly !== false,
    hasCover: obj.hasCover === true,
    hasExperience:
      obj.hasExperience === true ||
      (obj as { hasDeck?: boolean }).hasDeck === true,
    hasSongSheet: obj.hasSongSheet === true,
    order: parseOrder(obj.order),
    durationSeconds: parseDuration(obj.durationSeconds),
    queueRvtrs: Array.isArray(obj.queueRvtrs)
      ? obj.queueRvtrs
          .map((rvtr) => (typeof rvtr === "string" ? rvtr.trim().toUpperCase() : ""))
          .filter((rvtr) => /^RVTR\d{6}$/.test(rvtr))
      : [],
    queueCursor:
      typeof obj.queueCursor === "number" && Number.isFinite(obj.queueCursor)
        ? Math.max(0, Math.floor(obj.queueCursor))
        : 0,
    nextAdvanceAt:
      typeof obj.nextAdvanceAt === "string" && obj.nextAdvanceAt.trim()
        ? obj.nextAdvanceAt
        : null,
    lastChangeAt:
      typeof obj.lastChangeAt === "string" && obj.lastChangeAt.trim()
        ? obj.lastChangeAt
        : null,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}

async function loadFromJson(): Promise<LiveControlState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    return normalizeState(JSON.parse(raw));
  } catch {
    return emptyLiveControlState();
  }
}

async function saveToJson(state: LiveControlState): Promise<void> {
  const dir = join(opsStateDir(), "live-control");
  await mkdir(dir, { recursive: true });
  await writeFile(statePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function loadLiveControlState(): Promise<LiveControlState> {
  if (usePostgresSundayNightsState()) {
    const raw = await pgSundayNightsGet<Record<string, unknown>>(PG_KEY);
    return raw ? normalizeState(raw) : emptyLiveControlState();
  }
  return loadFromJson();
}

export async function saveLiveControlState(state: LiveControlState): Promise<LiveControlState> {
  const next: LiveControlState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  if (usePostgresSundayNightsState()) {
    await pgSundayNightsSet(PG_KEY, next as unknown as Record<string, unknown>);
  } else {
    await saveToJson(next);
  }
  return next;
}

export function mergeLiveControlConfig(
  state: LiveControlState,
  patch: Partial<LiveControlConfig>,
): LiveControlState {
  return normalizeState({ ...state, ...patch });
}
