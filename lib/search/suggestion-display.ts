import type { SearchSuggestionItem } from "./search-suggestion-types";

/** Spotlight-style secondary line: Artist | Album • 1969 | Song • 1986 | Year */
export function suggestionKindLabel(item: SearchSuggestionItem): string {
  if (item.kind === "artist") return "Artist";
  if (item.kind === "year") return "Year";
  if (item.kind === "album") {
    return item.year != null && item.year > 0 ? `Album • ${item.year}` : "Album";
  }
  if (item.kind === "song") {
    return item.year != null && item.year > 0 ? `Song • ${item.year}` : "Song";
  }
  return "";
}
