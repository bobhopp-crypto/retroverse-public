import type { SearchSuggestionGroups } from "@/lib/search/search-suggestion-types";
import { EMPTY_SUGGESTION_GROUPS } from "@/lib/search/search-suggestion-types";

/** Homepage pad scope — narrows overlay results, not a separate route. */
export type HomeSearchScope = "all" | "artists" | "albums" | "songs";

export function filterSuggestionGroupsByScope(
  groups: SearchSuggestionGroups,
  scope: HomeSearchScope,
): SearchSuggestionGroups {
  if (scope === "all") return groups;
  if (scope === "artists") {
    return { ...EMPTY_SUGGESTION_GROUPS, artists: groups.artists };
  }
  if (scope === "albums") {
    return { ...EMPTY_SUGGESTION_GROUPS, albums: groups.albums };
  }
  return { ...EMPTY_SUGGESTION_GROUPS, songs: groups.songs };
}

export function scopeSearchPlaceholder(scope: HomeSearchScope): string {
  if (scope === "artists") return "Search artists…";
  if (scope === "albums") return "Search albums…";
  if (scope === "songs") return "Search songs…";
  return "Search the stacks…";
}

export function scopeSearchLabel(scope: HomeSearchScope): string | null {
  if (scope === "artists") return "Artists";
  if (scope === "albums") return "Albums";
  if (scope === "songs") return "Songs";
  return null;
}
