import { artistKeysMatch, normalizeSearchQuery } from "@/lib/search/canonicalize-search";
import { textMatchScore } from "@/lib/search/display-format";
import {
  trackPageHref,
  yearSuggestionHref,
} from "@/lib/search/entity-routes";
import { resolveSuggestionHref } from "@/lib/search/resolve-suggestion-href";
import {
  EMPTY_SUGGESTION_GROUPS,
  type SearchSuggestionGroups,
  type SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";
import {
  isRvYearOnlyQuery,
  resolveInstantRvYearRoute,
  resolveRvYearOnlyQuery,
} from "@/lib/rv-year/rv-year-intent";

const RE_RVTR = /^RVTR\d{6}$/i;
const RE_RVTR_LABEL = /^(?:DK_|PK_)?(RVTR\d{6})$/i;

export type SearchDestinationKind = "artist" | "album" | "year" | "song" | "search";

export type SearchDestination = {
  kind: SearchDestinationKind;
  href: string;
};

function rvtrFromQuery(query: string): string | null {
  const trimmed = query.trim();
  const labeled = trimmed.match(RE_RVTR_LABEL)?.[1];
  if (labeled) return labeled.toUpperCase();
  if (RE_RVTR.test(trimmed)) return trimmed.toUpperCase();
  return null;
}

function isConfidentTitleMatch(query: string, title: string): boolean {
  return textMatchScore(title, query) <= 2;
}

function destinationFromSuggestion(item: SearchSuggestionItem): SearchDestination | null {
  const href = resolveSuggestionHref(item);
  if (!href) return null;
  const kind: SearchDestinationKind =
    item.kind === "artist"
      ? "artist"
      : item.kind === "album"
        ? "album"
        : item.kind === "year"
          ? "year"
          : "song";
  return { kind, href };
}

function uniqueDestination(items: SearchSuggestionItem[]): SearchDestination | null {
  const destinations = items
    .map(destinationFromSuggestion)
    .filter((item): item is SearchDestination => item != null);
  const unique = new Map(destinations.map((item) => [item.href, item]));
  return unique.size === 1 ? [...unique.values()][0]! : null;
}

export function searchDiscoveryHref(query: string): SearchDestination {
  const trimmed = query.trim();
  return {
    kind: "search",
    href: trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search",
  };
}

/**
 * High-confidence entity match only — no first-result fallback, no /search escape.
 * Used for optional Enter-key shortcuts; tap-to-navigate is primary.
 */
export function resolveHighConfidenceDestination(
  query: string,
  suggestions: SearchSuggestionGroups = EMPTY_SUGGESTION_GROUPS,
): SearchDestination | null {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;

  const rvtr = rvtrFromQuery(trimmed);
  if (rvtr) {
    return { kind: "song", href: trackPageHref(rvtr) };
  }

  if (isRvYearOnlyQuery(trimmed)) {
    const year = resolveInstantRvYearRoute(trimmed) ?? resolveRvYearOnlyQuery(trimmed);
    if (year != null) {
      return { kind: "year", href: yearSuggestionHref(year) };
    }
  }

  const artistMatches = suggestions.artists.filter((item) =>
    artistKeysMatch(item.title, trimmed),
  );
  if (artistMatches.length > 0) {
    return uniqueDestination(artistMatches);
  }

  const normalizedQuery = normalizeSearchQuery(trimmed);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  const albumMatches = suggestions.albums.filter((item) =>
    isConfidentTitleMatch(trimmed, item.title),
  );
  if (albumMatches.length > 0) {
    return uniqueDestination(albumMatches);
  }

  const songMatches = suggestions.songs.filter((item) => {
    const titleMatch = isConfidentTitleMatch(trimmed, item.title);
    const artistTitleMatch =
      item.artist != null &&
      queryTokens.length >= 2 &&
      isConfidentTitleMatch(trimmed, `${item.artist} ${item.title}`);
    return titleMatch || artistTitleMatch;
  });
  if (songMatches.length > 0) {
    return uniqueDestination(songMatches);
  }

  return null;
}

/**
 * Resolve only an exact canonical destination. Ambiguous input remains Search;
 * public navigation never chooses a first result.
 */
export function resolveSearchDestination(
  query: string,
  suggestions: SearchSuggestionGroups = EMPTY_SUGGESTION_GROUPS,
): SearchDestination {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return searchDiscoveryHref(trimmed);
  }

  const highConfidence = resolveHighConfidenceDestination(trimmed, suggestions);
  if (highConfidence) return highConfidence;

  return searchDiscoveryHref(trimmed);
}
