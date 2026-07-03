import type { SearchEntityType } from "@/lib/search/search-entity-types";

export type SearchBreadthTier = "narrow" | "medium" | "broad";

/** Shorter queries converge; longer/common terms expose archive depth. */
export function searchBreadthTier(query: string): SearchBreadthTier {
  const len = query.trim().length;
  if (len <= 3) return "narrow";
  if (len <= 10) return "medium";
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
  artists: 5,
  albums: 8,
  songs: 10,
  years: 3,
} as const;

/** Tighter caps for mobile overlay — prioritize strongest matches, less song flooding. */
export function overlaySearchEntityLimits(
  tier: SearchBreadthTier,
): Record<SearchEntityType, number> {
  if (tier === "narrow") {
    return { artist: 4, album: 6, track: 8, year: 3 };
  }
  if (tier === "medium") {
    return { artist: 4, album: 8, track: 12, year: 3 };
  }
  return { artist: 6, album: 10, track: 14, year: 4 };
}

/** Smaller SQL window for overlay — avoids scanning hundreds of rows per type. */
export function overlaySearchSqlFetchLimit(tier: SearchBreadthTier): number {
  if (tier === "narrow") return 40;
  if (tier === "medium") return 56;
  return 72;
}
