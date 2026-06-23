import type {
  SearchSuggestionGroups,
  SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";

import {
  resolveSearchDestination,
  type SearchDestination,
} from "./resolve-search-destination";

export function pickFirstSuggestion(
  groups: SearchSuggestionGroups,
  query = "",
): SearchSuggestionItem | null {
  const destination = resolveSearchDestination(query, groups);
  if (destination.kind === "search") return null;

  const priority: (keyof SearchSuggestionGroups)[] = ["artists", "albums", "songs", "years"];
  for (const key of priority) {
    const item = groups[key][0];
    if (!item) continue;
    return item;
  }
  return null;
}

export function resolveSearchNavigation(
  query: string,
  groups: SearchSuggestionGroups,
): SearchDestination {
  return resolveSearchDestination(query, groups);
}

export function suggestionGroupsHaveResults(groups: SearchSuggestionGroups): boolean {
  return (
    groups.artists.length > 0 ||
    groups.songs.length > 0 ||
    groups.albums.length > 0 ||
    groups.years.length > 0
  );
}
