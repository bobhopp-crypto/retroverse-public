import { yearSuggestionHref } from "@/lib/search/entity-routes";
import type { SearchSuggestionGroups } from "@/lib/search/search-suggestion-types";
import { normalizeRVYear } from "@/lib/search/normalize-rv-year";

/** Query is only a 2- or 4-digit RV year token — no artist/album text mixed in. */
export function isRvYearOnlyQuery(query: string): boolean {
  const q = query.trim();
  if (!/^\d{2}$/.test(q) && !/^(19[5-9]\d|20[0-3]\d)$/.test(q)) {
    return false;
  }
  return normalizeRVYear(q) != null;
}

export function resolveRvYearOnlyQuery(query: string): number | null {
  if (!isRvYearOnlyQuery(query)) return null;
  return normalizeRVYear(query.trim());
}

/** Immediate `/rv/{year}` when the query is year-only — used by search routing. */
export function resolveYearOnlySearchHref(query: string): string | null {
  const year = resolveRvYearOnlyQuery(query);
  return year != null ? yearSuggestionHref(year) : null;
}

/**
 * Power-user year routing — immediate transition, no suggestion drawer.
 * Waits for complete 4-digit years; 2-digit routes at once (except 19/20 prefixes).
 */
export function resolveInstantRvYearRoute(query: string): number | null {
  const q = query.trim();
  if (!q) return null;

  if (/^(19[5-9]\d|20[0-3]\d)$/.test(q)) {
    return normalizeRVYear(q);
  }

  if (/^\d{2}$/.test(q)) {
    if (q.startsWith("19") || q.startsWith("20")) return null;
    return normalizeRVYear(q);
  }

  return null;
}

/** Year-intent suggestions — single RV Year destination, no fuzzy universe. */
export function buildRvYearIntentSuggestions(query: string): SearchSuggestionGroups | null {
  const year = resolveRvYearOnlyQuery(query);
  if (year == null) return null;

  return {
    artists: [],
    songs: [],
    albums: [],
    years: [
      {
        id: `year-${year}`,
        kind: "year",
        title: `RV YEAR · ${year}`,
        artist: "RV History · chart exploration",
        year,
        coverUrl: null,
        label: `RV YEAR · ${year}`,
        href: yearSuggestionHref(year),
        routeQuery: String(year),
        actionLabel: "OPEN RV YEAR",
      },
    ],
  };
}
