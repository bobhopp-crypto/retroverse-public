import type { ProducerEraId } from "@/lib/ops/year-workspace/producer/types";

export type LiveControlMode = "vdj" | "demo" | "playlist";

export type LiveContentSource =
  | "all_packages"
  | "sunday_nights"
  | "year"
  | "era"
  | "artist"
  | "top_played";

export type LiveOrder = "random" | "most_played" | "chronological" | "playlist_order";

export type LiveDurationSeconds = 30 | 60 | 120;

export type LiveControlConfig = {
  mode: LiveControlMode;
  contentSource: LiveContentSource;
  year: number | null;
  era: ProducerEraId | null;
  artist: string | null;
  playlistYear: number | null;
  readyOnly: boolean;
  hasCover: boolean;
  hasDeck: boolean;
  hasSongSheet: boolean;
  order: LiveOrder;
  durationSeconds: LiveDurationSeconds;
};

export type LiveControlState = LiveControlConfig & {
  version: 1;
  running: boolean;
  queueRvtrs: string[];
  queueCursor: number;
  nextAdvanceAt: string | null;
  lastChangeAt: string | null;
  updatedAt: string;
};

export const DEFAULT_LIVE_CONTROL_CONFIG: LiveControlConfig = {
  mode: "demo",
  contentSource: "year",
  year: 1971,
  era: "1978",
  artist: null,
  playlistYear: 1967,
  readyOnly: true,
  hasCover: false,
  hasDeck: false,
  hasSongSheet: false,
  order: "random",
  durationSeconds: 60,
};

export function emptyLiveControlState(): LiveControlState {
  const now = new Date().toISOString();
  return {
    version: 1,
    running: false,
    ...DEFAULT_LIVE_CONTROL_CONFIG,
    queueRvtrs: [],
    queueCursor: 0,
    nextAdvanceAt: null,
    lastChangeAt: null,
    updatedAt: now,
  };
}
