/** Client-safe suggestion types — no server / PG imports. */

export type SearchSuggestionKind = "artist" | "song" | "album" | "year";

export type SearchSuggestionItem = {
  id: string;
  kind: SearchSuggestionKind;
  /** Primary line — artist name, song title, album title, or year */
  title: string;
  /** Secondary line — artist for songs/albums */
  artist?: string | null;
  year?: number | null;
  coverUrl?: string | null;
  /** Legacy display string for accessibility */
  label: string;
  /** Direct in-app entity route — suggestion tap navigates here. */
  href: string;
  /** Text query for Enter-key /search fallback. */
  routeQuery: string;
  /** Primary CTA pill — e.g. OPEN RV YEAR */
  actionLabel?: string | null;
  /** Canonical RV id when known (RVTR/RVAL/RVAR). */
  rvId?: string | null;
};

export type SearchSuggestionGroups = {
  artists: SearchSuggestionItem[];
  songs: SearchSuggestionItem[];
  albums: SearchSuggestionItem[];
  years: SearchSuggestionItem[];
};

/** Search-page presentation groups after catalog candidates have been ranked. */
export type CuratedSearchGroups = {
  bestMatch: SearchSuggestionItem[];
  artists: SearchSuggestionItem[];
  popularSongs: SearchSuggestionItem[];
  albums: SearchSuggestionItem[];
  otherMatches: SearchSuggestionItem[];
};

export const EMPTY_SUGGESTION_GROUPS: SearchSuggestionGroups = {
  artists: [],
  songs: [],
  albums: [],
  years: [],
};

export const EMPTY_CURATED_SEARCH_GROUPS: CuratedSearchGroups = {
  bestMatch: [],
  artists: [],
  popularSongs: [],
  albums: [],
  otherMatches: [],
};
