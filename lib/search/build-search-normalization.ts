import { resolveArtistForSearchQuery } from "@/lib/artist/resolve-artist";
import {
  detectSearchType,
  formatCanonicalSearchHeader,
  logSearchCanonical,
  normalizeArtistMatchKey,
  normalizeSearchQuery,
  type SearchNormalizationLog,
} from "@/lib/search/canonicalize-search";
import { detectYearContext } from "@/lib/search/normalize-rv-year";

export type ResolvedSearchArtist = {
  artistId: number;
  canonicalName: string;
  displayName: string;
  slug: string;
  matchKey: string;
};

export async function resolveCanonicalArtistForQuery(
  rawQuery: string,
  artistHints: string[] = [],
): Promise<ResolvedSearchArtist | null> {
  const resolved = await resolveArtistForSearchQuery(rawQuery, artistHints);
  if (!resolved) return null;
  return {
    ...resolved,
    matchKey: normalizeArtistMatchKey(resolved.canonicalName),
  };
}

export async function buildSearchNormalization(
  rawQuery: string,
  counts?: { artists: number; songs: number; albums: number },
): Promise<{
  log: SearchNormalizationLog;
  resolved: ResolvedSearchArtist | null;
  upstreamQuery: string;
}> {
  const raw = rawQuery.trim();
  const normalizedQuery = normalizeSearchQuery(raw);
  const yearContext = detectYearContext(raw);
  const detectedType = detectSearchType(normalizedQuery, yearContext.hasYear);
  const resolved = await resolveCanonicalArtistForQuery(raw);

  const log: SearchNormalizationLog = {
    rawQuery: raw,
    normalizedQuery,
    detectedType,
    canonicalArtist: resolved?.canonicalName ?? null,
    matchedArtistCount: counts?.artists ?? 0,
    matchedSongCount: counts?.songs ?? 0,
    matchedAlbumCount: counts?.albums ?? 0,
  };

  return {
    log,
    resolved,
    upstreamQuery: resolved?.canonicalName ?? raw,
    queryDisplay: resolved
      ? formatCanonicalSearchHeader(resolved.canonicalName)
      : null,
  };
}

export { logSearchCanonical };
