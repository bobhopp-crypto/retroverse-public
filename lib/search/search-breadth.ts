import type { SearchEntityType } from "@/lib/search/search-entity-types";

export type SearchBreadthTier = "narrow" | "medium" | "broad";

/** Shorter queries converge; longer/common terms expose archive depth. */
export function searchBreadthTier(query: string): SearchBreadthTier {
  const len = query.trim().length;
  if (len <= 3) return "narrow";
  if (len <= 6) return "medium";
  return "broad";
}

export function searchEntityLimits(
  tier: SearchBreadthTier,
): Record<SearchEntityType, number> {
  if (tier === "narrow") {
    return { artist: 14, album: 12, track: 16, year: 4 };
  }
  if (tier === "medium") {
    return { artist: 22, album: 28, track: 36, year: 6 };
  }
  return { artist: 32, album: 48, track: 64, year: 8 };
}

/** Max rows per entity_type from Postgres (before UI caps + dedupe). */
export function searchSqlFetchLimit(tier: SearchBreadthTier): number {
  if (tier === "narrow") return 120;
  if (tier === "medium") return 280;
  return 480;
}

export const OVERLAY_VISIBLE_INITIAL = {
  artists: 8,
  albums: 10,
  songs: 12,
  years: 4,
} as const;

/** Tighter caps for mobile overlay — prioritize strongest matches, less song flooding. */
export function overlaySearchEntityLimits(
  tier: SearchBreadthTier,
): Record<SearchEntityType, number> {
  if (tier === "narrow") {
    return { artist: 6, album: 8, track: 10, year: 3 };
  }
  if (tier === "medium") {
    return { artist: 6, album: 10, track: 14, year: 4 };
  }
  return { artist: 8, album: 12, track: 16, year: 4 };
}

/** Smaller SQL window for overlay — avoids scanning hundreds of rows per type. */
export function overlaySearchSqlFetchLimit(tier: SearchBreadthTier): number {
  if (tier === "narrow") return 48;
  if (tier === "medium") return 72;
  return 96;
}
