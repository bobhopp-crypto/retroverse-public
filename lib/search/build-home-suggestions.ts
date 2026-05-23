import "server-only";

import { displayArtistName } from "@/lib/artist/slug";
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
  shouldUseCanonicalSuggestionContext,
  suggestionBreadthTier,
  suggestionSlotLimits,
  type SuggestionBreadthTier,
  type SuggestionSlotLimits,
} from "@/lib/search/suggestion-scoring";
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

function isDiscoverableMatch(label: string, query: string, tier: SuggestionBreadthTier): boolean {
  if (tier === "wide") return true;
  return discoveryMatchScore(label, query, tier) < 50;
}

function orderDiscoveryItems(
  items: SearchSuggestionItem[],
  query: string,
  tier: SuggestionBreadthTier,
): SearchSuggestionItem[] {
  if (tier === "wide") {
    return [...items].sort((a, b) => {
      const scoreA = discoveryMatchScore(a.label, query, tier);
      const scoreB = discoveryMatchScore(b.label, query, tier);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });
  }
  return sortByDiscovery(items, query, tier);
}

function buildArtistSuggestions(
  payload: HomeSearchPayload,
  query: string,
  tier: SuggestionBreadthTier,
  canonicalArtist: string | null,
): SearchSuggestionItem[] {
  const useCanonical = shouldUseCanonicalSuggestionContext(query);
  const grouped = groupSuggestionsByArtistKey(payload.artists, (a) => a.name);
  const groups = useCanonical
    ? collapseFuzzyAliasGroups(grouped, canonicalArtist)
    : grouped;

  const items: SearchSuggestionItem[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    const matchKey = group.matchKey;
    if (!matchKey || seen.has(matchKey)) continue;

    const label = displayArtistName(group.label);
    if (!isDiscoverableMatch(label, query, tier)) continue;

    seen.add(matchKey);
    items.push({
      id: suggestionId("artist", matchKey),
      kind: "artist",
      label,
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
    const key = title.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    if (!isDiscoverableMatch(title, query, tier)) continue;
    seen.add(key);
    items.push({
      id: suggestionId("song", key),
      kind: "song",
      label: title,
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
    if (!isDiscoverableMatch(label, query, tier) && !isDiscoverableMatch(title, query, tier)) {
      continue;
    }
    seen.add(key);
    items.push({
      id: suggestionId("album", key),
      kind: "album",
      label,
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
      label: String(year),
      routeQuery: String(year),
    }));
}

/** Keep balanced slots per category before applying max total. */
export function capSuggestionGroups(
  groups: SearchSuggestionGroups,
  limits: SuggestionSlotLimits,
): SearchSuggestionGroups {
  const trimmed: SearchSuggestionGroups = {
    artists: groups.artists.slice(0, limits.artists),
    songs: groups.songs.slice(0, limits.songs),
    albums: groups.albums.slice(0, limits.albums),
    years: groups.years.slice(0, limits.years),
  };

  const order: (keyof SearchSuggestionGroups)[] = [
    "artists",
    "songs",
    "albums",
    "years",
  ];
  const flat: SearchSuggestionItem[] = [];
  for (const key of order) {
    for (const item of trimmed[key]) flat.push(item);
  }

  if (flat.length <= limits.maxTotal) return trimmed;

  const capped = flat.slice(0, limits.maxTotal);
  const out: SearchSuggestionGroups = {
    artists: [],
    songs: [],
    albums: [],
    years: [],
  };
  for (const item of capped) {
    out[SUGGESTION_GROUP_BY_KIND[item.kind]].push(item);
  }
  return out;
}

export function buildHomeSearchSuggestions(
  payload: HomeSearchPayload,
  query: string,
  canonicalArtist: string | null = null,
): SearchSuggestionGroups {
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
