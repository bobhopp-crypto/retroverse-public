import "server-only";

import { resolveArtistForSearchQuery } from "@/lib/artist/resolve-artist";
import {
  artistMatchKeys,
  formatCanonicalSearchHeader,
  normalizeArtistMatchKey,
  normalizeSearchQuery,
} from "./canonicalize-search";

export type CanonicalSearchEntity = {
  artistId: number;
  matchKey: string;
  canonicalName: string;
  displayName: string;
  headerLabel: string;
  slug: string;
};

/** Static alias groups — optional hints before PG resolve. */
const FUZZY_ALIAS_GROUPS: Record<string, string[]> = {
  beatles: ["the beatles", "beatles"],
  eagles: ["the eagles", "eagles"],
  madonna: ["madonna"],
};

export function normalizedLookupKey(query: string): string {
  return normalizeSearchQuery(query);
}

export function artistEntityLookupKey(query: string): string {
  return normalizeArtistMatchKey(query);
}

export function expandLookupKeys(query: string): string[] {
  return artistMatchKeys(query);
}

export function resolveFuzzyAliasRoot(query: string): string | null {
  const key = normalizeArtistMatchKey(query);
  if (!key) return null;
  for (const [root, aliases] of Object.entries(FUZZY_ALIAS_GROUPS)) {
    if (key === root) return root;
    if (aliases.some((a) => normalizeArtistMatchKey(a) === key)) return root;
  }
  return null;
}

export async function resolveCanonicalEntity(
  query: string,
  artistHints: string[] = [],
): Promise<CanonicalSearchEntity | null> {
  const resolved = await resolveArtistForSearchQuery(query, artistHints);
  if (!resolved) return null;
  return {
    artistId: resolved.artistId,
    matchKey: normalizeArtistMatchKey(resolved.canonicalName),
    canonicalName: resolved.canonicalName,
    displayName: resolved.displayName,
    headerLabel: formatCanonicalSearchHeader(resolved.canonicalName),
    slug: resolved.slug,
  };
}
