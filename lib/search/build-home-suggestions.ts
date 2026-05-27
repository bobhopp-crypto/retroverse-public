import "server-only";

import { displayArtistName } from "@/lib/artist/slug";
import {
  albumSuggestionHref,
  artistSuggestionHref,
  trackSuggestionHref,
  yearSuggestionHref,
} from "@/lib/search/entity-routes";
import { normalizeArtistMatchKey } from "@/lib/search/canonicalize-search";
import { formatDisplayArtist, formatDisplayTitle } from "@/lib/search/display-format";
import type { HomeSearchPayload } from "@/lib/search/home-search-types";
import {
  MAX_RV_YEAR,
  MIN_RV_YEAR,
  normalizeRVYear,
} from "@/lib/search/normalize-rv-year";
import {
  discoveryMatchScore,
  isDiscoverableSuggestion,
  shouldUseCanonicalSuggestionContext,
  suggestionBreadthTier,
  suggestionSlotLimits,
  type SuggestionBreadthTier,
  type SuggestionSlotLimits,
} from "@/lib/search/suggestion-scoring";
import { buildRvYearIntentSuggestions } from "@/lib/rv-year/rv-year-intent";
import {
  collapseFuzzyAliasGroups,
  groupSuggestionsByArtistKey,
} from "@/lib/search/suggestion-entity-grouping";
import type {
  SearchSuggestionGroups,
  SearchSuggestionItem,
  SearchSuggestionKind,
} from "@/lib/search/search-suggestion-types";

const SUGGESTION_GROUP_BY_KIND: Record<
  SearchSuggestionKind,
  keyof SearchSuggestionGroups
> = {
  artist: "artists",
  song: "songs",
  album: "albums",
  year: "years",
};

function suggestionId(kind: string, key: string): string {
  return `${kind}-${key}`;
}

function sortByDiscovery(
  items: SearchSuggestionItem[],
  query: string,
  tier: SuggestionBreadthTier,
): SearchSuggestionItem[] {
  return [...items].sort((a, b) => {
    const scoreA = discoveryMatchScore(a.label, query, tier);
    const scoreB = discoveryMatchScore(b.label, query, tier);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}

function orderDiscoveryItems(
  items: SearchSuggestionItem[],
  query: string,
  tier: SuggestionBreadthTier,
): SearchSuggestionItem[] {
  // Wide/medium: keep upstream crate order — local re-sort was hiding exploratory matches.
  if (tier === "wide" || tier === "medium") return items;
  return sortByDiscovery(items, query, tier);
}

function suggestionLabel(
  title: string,
  artist?: string | null,
  year?: number | null,
): string {
  const parts = [title];
  if (artist?.trim()) parts.push(artist.trim());
  if (year != null && year > 0) parts.push(String(year));
  return parts.join(" · ");
}

function buildArtistSuggestions(
  payload: HomeSearchPayload,
  query: string,
  tier: SuggestionBreadthTier,
  canonicalArtist: string | null,
): SearchSuggestionItem[] {
  const items: SearchSuggestionItem[] = [];
  const seen = new Set<string>();

  if (tier === "wide") {
    for (const row of payload.artists) {
      const label = displayArtistName(row.name);
      const matchKey = normalizeArtistMatchKey(label);
      if (!matchKey || seen.has(matchKey)) continue;
      seen.add(matchKey);
      const href = artistSuggestionHref(label, row.href);
      if (!href) continue;
      items.push({
        id: suggestionId("artist", matchKey),
        kind: "artist",
        title: label,
        artist: null,
        year: null,
        coverUrl: row.coverUrl ?? null,
        label,
        href,
        routeQuery: matchKey,
      });
    }
    return items;
  }

  const useCanonical = shouldUseCanonicalSuggestionContext(query);
  const grouped = groupSuggestionsByArtistKey(payload.artists, (a) => a.name);
  const groups = useCanonical
    ? collapseFuzzyAliasGroups(grouped, canonicalArtist)
    : grouped;

  for (const group of groups) {
    const matchKey = group.matchKey;
    if (!matchKey || seen.has(matchKey)) continue;

    const label = displayArtistName(group.label);
    if (!isDiscoverableSuggestion(label, query, tier)) continue;

    seen.add(matchKey);
    const row = group.items.find((entry) => entry.href?.trim()) ?? group.items[0];
    const href = artistSuggestionHref(label, row?.href);
    if (!href) continue;
    items.push({
      id: suggestionId("artist", matchKey),
      kind: "artist",
      title: label,
      artist: null,
      year: null,
      coverUrl: row?.coverUrl ?? null,
      label,
      href,
      routeQuery: matchKey,
    });
  }

  return orderDiscoveryItems(items, query, tier);
}

function buildSongSuggestions(
  payload: HomeSearchPayload,
  query: string,
  tier: SuggestionBreadthTier,
): SearchSuggestionItem[] {
  const seen = new Set<string>();
  const items: SearchSuggestionItem[] = [];

  for (const row of payload.tracks) {
    const title = formatDisplayTitle(row.title);
    const artist = formatDisplayArtist(row.artist);
    const key = `${normalizeArtistMatchKey(artist)}::${title.trim().toLowerCase()}`;
    if (!key || seen.has(key)) continue;
    if (tier === "tight" && !isDiscoverableSuggestion(title, query, tier)) continue;
    seen.add(key);
    const year = row.year != null && row.year > 0 ? row.year : null;
    const href = trackSuggestionHref(title, row.href);
    if (!href) continue;
    items.push({
      id: suggestionId("song", key),
      kind: "song",
      title,
      artist,
      year,
      coverUrl: row.coverUrl ?? null,
      label: suggestionLabel(title, artist, year),
      href,
      routeQuery: title,
    });
  }

  return orderDiscoveryItems(items, query, tier);
}

function buildAlbumSuggestions(
  payload: HomeSearchPayload,
  query: string,
  tier: SuggestionBreadthTier,
): SearchSuggestionItem[] {
  const seen = new Set<string>();
  const items: SearchSuggestionItem[] = [];

  for (const row of payload.albums) {
    const title = formatDisplayTitle(row.title);
    const artist = formatDisplayArtist(row.artist);
    const label = artist ? `${title} — ${artist}` : title;
    const key = `${normalizeArtistMatchKey(artist)}::${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    if (
      tier === "tight" &&
      !isDiscoverableSuggestion(label, query, tier) &&
      !isDiscoverableSuggestion(title, query, tier)
    ) {
      continue;
    }
    seen.add(key);
    const year = row.year != null && row.year > 0 ? row.year : null;
    const href = albumSuggestionHref(title, row.href);
    if (!href) continue;
    items.push({
      id: suggestionId("album", key),
      kind: "album",
      title,
      artist,
      year,
      coverUrl: row.coverUrl ?? null,
      label: suggestionLabel(title, artist, year),
      href,
      routeQuery: title,
    });
  }

  return orderDiscoveryItems(items, query, tier);
}

/** RV years whose 4-digit string contains the query (e.g. "76" → 1976). */
export function suggestRvYearsFromQuery(query: string): SearchSuggestionItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const direct = normalizeRVYear(q);
  const years = new Set<number>();
  if (direct != null) years.add(direct);

  for (let y = MIN_RV_YEAR; y <= MAX_RV_YEAR; y += 1) {
    if (String(y).includes(q)) years.add(y);
  }

  return [...years]
    .sort((a, b) => a - b)
    .map((year) => ({
      id: suggestionId("year", String(year)),
      kind: "year" as const,
      title: String(year),
      artist: null,
      year,
      coverUrl: null,
      label: String(year),
      href: yearSuggestionHref(year),
      routeQuery: String(year),
    }));
}

/** Per-group caps — avoid cross-group maxTotal collapse that hides whole categories. */
export function capSuggestionGroups(
  groups: SearchSuggestionGroups,
  limits: SuggestionSlotLimits,
): SearchSuggestionGroups {
  return {
    artists: groups.artists.slice(0, limits.artists),
    songs: groups.songs.slice(0, limits.songs),
    albums: groups.albums.slice(0, limits.albums),
    years: groups.years.slice(0, limits.years),
  };
}

export function buildHomeSearchSuggestions(
  payload: HomeSearchPayload,
  query: string,
  canonicalArtist: string | null = null,
): SearchSuggestionGroups {
  const yearIntent = buildRvYearIntentSuggestions(query);
  if (yearIntent) return yearIntent;

  const tier = suggestionBreadthTier(query.trim().length);
  const limits = suggestionSlotLimits(query.trim().length);
  const canonical =
    shouldUseCanonicalSuggestionContext(query) ? canonicalArtist : null;

  const artists = buildArtistSuggestions(payload, query, tier, canonical);
  const songs = buildSongSuggestions(payload, query, tier);
  const albums = buildAlbumSuggestions(payload, query, tier);
  const years = suggestRvYearsFromQuery(query);

  return capSuggestionGroups({ artists, songs, albums, years }, limits);
}

export function suggestionGroupCount(groups: SearchSuggestionGroups): number {
  return (
    groups.artists.length +
    groups.songs.length +
    groups.albums.length +
    groups.years.length
  );
}
