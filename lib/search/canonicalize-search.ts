import { displayArtistName } from "@/lib/artist/slug";

/** Lowercase, trim, collapse internal whitespace. */
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Artist identity key: normalized query with leading "the " removed. */
export function normalizeArtistMatchKey(raw: string): string {
  return normalizeSearchQuery(raw).replace(/^the\s+/, "");
}

/** Distinct lookup strings for artist resolution (with/without leading "the"). */
export function artistMatchKeys(raw: string): string[] {
  const base = normalizeSearchQuery(raw);
  const stripped = normalizeArtistMatchKey(raw);
  const keys = new Set<string>();
  if (base) keys.add(base);
  if (stripped) keys.add(stripped);
  if (stripped && stripped !== base) keys.add(`the ${stripped}`);
  return [...keys];
}

export function artistKeysMatch(a: string, b: string): boolean {
  const ka = normalizeArtistMatchKey(a);
  const kb = normalizeArtistMatchKey(b);
  return ka.length > 0 && ka === kb;
}

export type SearchDetectedType = "empty" | "year" | "artist" | "broad";

export function detectSearchType(
  normalizedQuery: string,
  hasYear: boolean,
): SearchDetectedType {
  if (!normalizedQuery) return "empty";
  if (hasYear) return "year";
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length <= 4 && !/\d/.test(normalizedQuery)) return "artist";
  return "broad";
}

export type SearchNormalizationLog = {
  rawQuery: string;
  normalizedQuery: string;
  detectedType: SearchDetectedType;
  canonicalArtist: string | null;
  matchedArtistCount: number;
  matchedSongCount: number;
  matchedAlbumCount: number;
};

/** Search results header — canonical DB name in uppercase (e.g. THE BEATLES, EAGLES). */
export function formatCanonicalSearchHeader(canonicalName: string): string {
  return displayArtistName(canonicalName).toUpperCase();
}

export function logSearchCanonical(log: SearchNormalizationLog): void {
  console.log("[search-canonical]", log);
}

/** @deprecated Use logSearchCanonical */
export function logSearchNormalized(log: SearchNormalizationLog): void {
  logSearchCanonical(log);
}

export function logSearchDedupe(stats: SearchDedupeLog): void {
  console.log("[search-dedupe]", stats);
}

export function logSearchOrder(stats: SearchOrderLog): void {
  console.log("[search-order]", stats);
}

export type SearchDedupeLog = {
  artistsBefore: number;
  artistsAfter: number;
  albumsBefore: number;
  albumsAfter: number;
  songsBefore: number;
  songsAfter: number;
  canonicalArtist: string | null;
};

export type SearchOrderLog = {
  mode: "chronology" | "relevance";
  canonicalArtist: string | null;
  albumCount: number;
  songCount: number;
};
