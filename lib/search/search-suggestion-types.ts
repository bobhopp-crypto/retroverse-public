/** Client-safe suggestion types — no server / PG imports. */

export type SearchSuggestionKind = "artist" | "song" | "album" | "year";

export type SearchSuggestionItem = {
  id: string;
  kind: SearchSuggestionKind;
  label: string;
  /** Value for `/search?q=` */
  routeQuery: string;
};

export type SearchSuggestionGroups = {
  artists: SearchSuggestionItem[];
  songs: SearchSuggestionItem[];
  albums: SearchSuggestionItem[];
  years: SearchSuggestionItem[];
};

export const EMPTY_SUGGESTION_GROUPS: SearchSuggestionGroups = {
  artists: [],
  songs: [],
  albums: [],
  years: [],
};
