import type { ReviewClassification } from "./review-types";

/**
 * VirtualDJ PlayCount is a manually adjusted rotation / ranking signal — not a factual
 * usage count. Use only to suggest initial Class; never treat as popularity truth.
 */
export const VDJ_ROTATION_COCKTAIL_THRESHOLD = 5;

/** UI label for VDJ PlayCount on review cards. */
export const VDJ_ROTATION_LABEL = "Plays";
export const VDJ_ROTATION_STATS_LABEL = "With play counts";

export function formatRotationSignal(playCount: number | null): string {
  if (playCount == null) return "—";
  return String(playCount);
}

/** Suggested initial Class from rotation signal (persisted on init only). */
export function suggestedClassFromRotation(
  playCount: number | null,
): ReviewClassification {
  if (playCount != null && playCount >= VDJ_ROTATION_COCKTAIL_THRESHOLD) {
    return "Cocktail";
  }
  return "Fill";
}

export function rotationSuggestsCocktail(playCount: number | null): boolean {
  return playCount != null && playCount >= VDJ_ROTATION_COCKTAIL_THRESHOLD;
}
