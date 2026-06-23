import { artistKeysMatch, normalizeSearchQuery } from "@/lib/search/canonicalize-search";
import { textMatchScore } from "@/lib/search/display-format";
import {
  artistPublicHrefFromName,
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

function searchDiscoveryHref(query: string): SearchDestination {
  const trimmed = query.trim();
  return {
    kind: "search",
    href: trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search",
  };
}

/**
 * Resolve a query to a patron destination.
 * Home search uses this for Enter-key direct navigation.
 * `/search` page does not auto-redirect — it renders discovery panels.
 */
export function resolveSearchDestination(
  query: string,
  suggestions: SearchSuggestionGroups = EMPTY_SUGGESTION_GROUPS,
): SearchDestination {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { kind: "search", href: "/search" };
  }

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

  for (const item of suggestions.artists) {
    if (artistKeysMatch(item.title, trimmed)) {
      const resolved = destinationFromSuggestion(item);
      if (resolved) return resolved;
      const href = artistPublicHrefFromName(item.title);
      if (href) return { kind: "artist", href };
    }
  }

  const normalizedQuery = normalizeSearchQuery(trimmed);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  for (const item of suggestions.albums) {
    if (isConfidentTitleMatch(trimmed, item.title)) {
      const resolved = destinationFromSuggestion(item);
      if (resolved) return resolved;
    }
  }

  for (const item of suggestions.songs) {
    const titleMatch = isConfidentTitleMatch(trimmed, item.title);
    const artistTitleMatch =
      item.artist != null &&
      queryTokens.length >= 2 &&
      isConfidentTitleMatch(trimmed, `${item.artist} ${item.title}`);
    if (titleMatch || artistTitleMatch) {
      const resolved = destinationFromSuggestion(item);
      if (resolved) return resolved;
    }
  }

  const priority: (keyof SearchSuggestionGroups)[] = ["artists", "albums", "songs", "years"];
  for (const key of priority) {
    const item = suggestions[key][0];
    if (!item) continue;
    const resolved = destinationFromSuggestion(item);
    if (resolved) return resolved;
  }

  return searchDiscoveryHref(trimmed);
}
