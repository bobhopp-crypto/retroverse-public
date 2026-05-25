import type {
  SearchSuggestionGroups,
  SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";

const ORDER: (keyof SearchSuggestionGroups)[] = [
  "artists",
  "songs",
  "albums",
  "years",
];

export function pickFirstSuggestion(
  groups: SearchSuggestionGroups,
): SearchSuggestionItem | null {
  for (const key of ORDER) {
    const item = groups[key][0];
    if (item) return item;
  }
  return null;
}

export function suggestionGroupsHaveResults(groups: SearchSuggestionGroups): boolean {
  return ORDER.some((key) => groups[key].length > 0);
}
