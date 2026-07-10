import type { PlaybackMode } from "./types";

/** Data-driven default playback mode per sidebar collection id. */
export const COLLECTION_DEFAULT_PLAYBACK_MODE: Record<string, PlaybackMode> = {
  "live-aid-1985": "manual",
  "sunday-nights": "auto",
  "slides-graphics": "auto",
  announcements: "auto",
  "sponsor-content": "loop",
};

/** Imported collections without an explicit entry default to Auto. */
export function defaultPlaybackModeForCollection(collectionId: string): PlaybackMode {
  return COLLECTION_DEFAULT_PLAYBACK_MODE[collectionId] ?? "auto";
}

export const AUTO_ADVANCE_PRESETS = [5, 8, 10, 15, 20] as const;

export const DEFAULT_AUTO_ADVANCE_SECONDS = 10;

export function normalizeAutoAdvanceSeconds(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_AUTO_ADVANCE_SECONDS;
  return Math.min(300, Math.round(n));
}
