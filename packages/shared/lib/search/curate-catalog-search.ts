import "server-only";

import { loadArtistAlbums } from "@/lib/artist/load-artist-albums";
import { loadArtistChartedSongs } from "@/lib/artist/load-artist-charted-songs";
import { inspectQuery } from "@/lib/inspect/pg";
import { entityToSuggestionItem } from "@/lib/search/entities-to-suggestions";
import { albumSuggestionHref } from "@/lib/search/entity-routes";
import {
  normalizeSearchLabel,
  searchQueryTokens,
  slugFromNormalizedLabel,
} from "@/lib/search/normalize-search-label";
import type { SearchEntity } from "@/lib/search/search-entity-types";
import {
  EMPTY_CURATED_SEARCH_GROUPS,
  type CuratedSearchGroups,
  type SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";

type TrackSignal = {
  peak: number | null;
  weeks: number;
  charted: boolean;
  inCatalog: boolean;
};

type AlbumSignal = {
  peak: number | null;
  weeks: number;
};

type RankedCandidate = {
  entity: SearchEntity;
  item: SearchSuggestionItem;
  score: number;
  isCompilation: boolean;
  isCompoundArtist: boolean;
};

type ExpandedCandidates = {
  entities: SearchEntity[];
  trackSignals: Map<string, TrackSignal>;
  albumSignals: Map<string, AlbumSignal>;
  focusArtistNorm: string | null;
};

const TYPE_BEST_MATCH_ORDER: Record<SearchEntity["entityType"], number> = {
  artist: 0,
  album: 1,
  track: 2,
  year: 3,
};

const COMPILATION_TITLE =
  /\b(greatest hits?|best of|very best|essential|collection|anthology|compilation|singles collection|gold|platinum collection|ultimate|box(?:ed)? set)\b/i;
const REISSUE_TITLE = /\b(deluxe|expanded|anniversary|remaster(?:ed)?|reissue|bonus tracks?)\b/i;
const VARIOUS_ARTISTS = /\b(various artists?|soundtrack|tribute|karaoke)\b/i;
const COMPOUND_ARTIST = /(?:\b(?:feat(?:uring)?|with|and)\b|[&,/+])/i;

function exactTitle(entity: SearchEntity, queryNorm: string): boolean {
  return normalizeSearchLabel(entity.label) === queryNorm;
}

function titleMatchScore(label: string, queryNorm: string, tokens: string[]): number {
  const title = normalizeSearchLabel(label);
  if (title === queryNorm) return 0;
  if (title.startsWith(`${queryNorm} `)) return 700;
  if (title.includes(` ${queryNorm} `) || title.endsWith(` ${queryNorm}`)) return 1_300;
  if (tokens.length > 0 && tokens.every((token) => title.includes(token))) return 2_100;
  return 4_000;
}

function artistMatchScore(label: string, queryNorm: string): number {
  const artist = normalizeSearchLabel(label);
  if (artist === queryNorm) return 0;
  if (artist.startsWith(`${queryNorm} `)) return 500;
  if (artist.includes(` ${queryNorm} `) || artist.endsWith(` ${queryNorm}`)) return 1_100;
  if (artist.includes(queryNorm)) return 1_700;
  return 2_800;
}

function isCompilationAlbum(entity: SearchEntity): boolean {
  const text = `${entity.label} ${entity.artist ?? ""}`;
  return COMPILATION_TITLE.test(text) || REISSUE_TITLE.test(text) || VARIOUS_ARTISTS.test(text);
}

function entityKey(entity: SearchEntity): string {
  const identity = entity.rvId?.trim().toUpperCase() || entity.href.trim().toLowerCase();
  return `${entity.entityType}:${identity}`;
}

function catalogSupportForArtist(entities: SearchEntity[], artistNorm: string): number {
  return entities.reduce((support, entity) => {
    if (normalizeSearchLabel(entity.artist ?? "") !== artistNorm) return support;
    if (entity.entityType === "track") return support + 3;
    if (entity.entityType === "album") return support + 2;
    return support;
  }, 0);
}

async function expandFocalArtistCandidates(
  queryNorm: string,
  entities: SearchEntity[],
): Promise<ExpandedCandidates> {
  const focusArtist = entities
    .filter((entity) => {
      if (entity.entityType !== "artist" || COMPOUND_ARTIST.test(entity.label)) return false;
      const artistNorm = normalizeSearchLabel(entity.label);
      return artistNorm === queryNorm || (queryNorm.length >= 3 && artistNorm.startsWith(queryNorm));
    })
    .sort((a, b) => {
      const aNorm = normalizeSearchLabel(a.label);
      const bNorm = normalizeSearchLabel(b.label);
      return (
        Number(aNorm !== queryNorm) - Number(bNorm !== queryNorm) ||
        catalogSupportForArtist(entities, bNorm) - catalogSupportForArtist(entities, aNorm) ||
        a.rank - b.rank ||
        aNorm.length - bNorm.length
      );
    })[0];
  if (!focusArtist) {
    return {
      entities,
      trackSignals: new Map(),
      albumSignals: new Map(),
      focusArtistNorm: null,
    };
  }

  try {
    const [songData, albumData] = await Promise.all([
      loadArtistChartedSongs(focusArtist.slug),
      loadArtistAlbums(focusArtist.slug, { skipSearchCoverFallback: true }),
    ]);
    const artist = focusArtist.label;
    const focusArtistNorm = normalizeSearchLabel(artist);
    const albumCoverByTitle = new Map(
      albumData.albums
        .filter((album) => album.coverUrl)
        .map((album) => [normalizeSearchLabel(album.title), album.coverUrl]),
    );
    const trackSignals = new Map<string, TrackSignal>();
    const albumSignals = new Map<string, AlbumSignal>();
    const supplements: SearchEntity[] = [];

    for (const song of songData.songs) {
      const rvtr = song.rvtr.trim().toUpperCase();
      trackSignals.set(rvtr, {
        peak: song.peakHot100,
        weeks: song.chartWeeks,
        charted: true,
        inCatalog: song.inLibrary,
      });
      supplements.push({
        entityType: "track",
        label: song.title,
        normalizedLabel: normalizeSearchLabel(`${song.title} ${artist}`),
        rvId: rvtr,
        slug: slugFromNormalizedLabel(song.title),
        href: song.trackHref,
        artist,
        year: song.firstChartYear,
        coverUrl: song.albumTitle
          ? (albumCoverByTitle.get(normalizeSearchLabel(song.albumTitle)) ?? null)
          : null,
        rank: 0,
      });
    }

    for (const album of albumData.albums) {
      const rval = album.rval?.trim().toUpperCase();
      if (!rval) continue;
      albumSignals.set(rval, { peak: album.b200Peak, weeks: 0 });
      supplements.push({
        entityType: "album",
        label: album.title,
        normalizedLabel: normalizeSearchLabel(`${album.title} ${artist}`),
        rvId: rval,
        slug: slugFromNormalizedLabel(album.title),
        href: albumSuggestionHref(album.title, `/albums/${rval}`) ?? `/album/${rval}`,
        artist,
        year: album.releaseYear,
        coverUrl: album.coverUrl,
        rank: 0,
      });
    }

    const merged = new Map<string, SearchEntity>();
    for (const entity of [...entities, ...supplements]) {
      const key = entityKey(entity);
      const current = merged.get(key);
      merged.set(
        key,
        current
          ? {
              ...current,
              ...entity,
              year: current.year ?? entity.year,
              coverUrl: current.coverUrl ?? entity.coverUrl,
              rank: Math.min(current.rank, entity.rank),
            }
          : entity,
      );
    }

    return { entities: [...merged.values()], trackSignals, albumSignals, focusArtistNorm };
  } catch (error) {
    console.warn("[catalog-search:artist-expansion]", error);
    return {
      entities,
      trackSignals: new Map(),
      albumSignals: new Map(),
      focusArtistNorm: null,
    };
  }
}

async function loadTrackSignals(
  entities: SearchEntity[],
  seed: Map<string, TrackSignal>,
): Promise<Map<string, TrackSignal>> {
  const rvtrs = [
    ...new Set(
      entities
        .filter((entity) => entity.entityType === "track" && entity.rvId)
        .map((entity) => entity.rvId!.trim().toUpperCase())
        .filter((rvtr) => !seed.has(rvtr)),
    ),
  ];
  if (rvtrs.length === 0) return seed;

  try {
    const rows = await inspectQuery<{
      rvtr: string;
      peak_hot100_position: number | null;
      chart_weeks: number | null;
      has_hot100: boolean | null;
      has_vdj_media: boolean | null;
    }>(
      `
      SELECT upper(trim(track_id)) AS rvtr,
             peak_hot100_position,
             chart_weeks,
             has_hot100,
             has_vdj_media
      FROM canonical_track_display
      WHERE upper(trim(track_id)) = ANY($1::text[])
      `,
      [rvtrs],
    );

    return new Map([
      ...seed,
      ...rows.map((row) => [
        row.rvtr,
        {
          peak: row.peak_hot100_position,
          weeks: row.chart_weeks ?? 0,
          charted: row.has_hot100 === true || row.peak_hot100_position != null,
          inCatalog: row.has_vdj_media === true,
        } satisfies TrackSignal,
      ] as const),
    ]);
  } catch (error) {
    console.warn("[catalog-search:track-ranking]", error);
    return seed;
  }
}

async function loadAlbumSignals(
  entities: SearchEntity[],
  seed: Map<string, AlbumSignal>,
): Promise<Map<string, AlbumSignal>> {
  const rvals = [
    ...new Set(
      entities
        .filter((entity) => entity.entityType === "album" && entity.rvId)
        .map((entity) => entity.rvId!.trim().toUpperCase())
        .filter((rval) => !seed.has(rval)),
    ),
  ];
  if (rvals.length === 0) return seed;

  try {
    const rows = await inspectQuery<{
      rval: string;
      b200_peak: number | null;
      chart_weeks: number | null;
    }>(
      `
      SELECT upper(trim(aek.external_key)) AS rval,
             min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_peak,
             count(ca.id) FILTER (WHERE ca.chart_name = 'Billboard 200')::int AS chart_weeks
      FROM albums al
      JOIN album_external_keys aek ON aek.album_id = al.id
      LEFT JOIN chart_appearances ca ON ca.album_id = al.id
      WHERE upper(trim(aek.external_key)) = ANY($1::text[])
      GROUP BY upper(trim(aek.external_key))
      `,
      [rvals],
    );

    return new Map([
      ...seed,
      ...rows.map((row) => [
        row.rval,
        { peak: row.b200_peak, weeks: row.chart_weeks ?? 0 } satisfies AlbumSignal,
      ] as const),
    ]);
  } catch (error) {
    console.warn("[catalog-search:album-ranking]", error);
    return seed;
  }
}

function trackScore(
  entity: SearchEntity,
  queryNorm: string,
  tokens: string[],
  signal: TrackSignal | undefined,
  focusArtistNorm: string | null,
): number {
  const titleScore = titleMatchScore(entity.label, queryNorm, tokens);
  const artistNorm = normalizeSearchLabel(entity.artist ?? "");
  const exactArtist = artistNorm === queryNorm;
  const focusArtist = focusArtistNorm != null && artistNorm === focusArtistNorm;
  const chartScore = signal?.charted ? -1_200 : 0;
  const peakScore = signal?.peak != null ? signal.peak * 5 : 900;
  const durationScore = -Math.min(signal?.weeks ?? 0, 100) * 3;
  const catalogScore = signal?.inCatalog ? -80 : 0;
  return (
    titleScore +
    (exactArtist ? -4_500 : focusArtist ? -4_000 : 0) +
    chartScore +
    peakScore +
    durationScore +
    catalogScore +
    entity.rank
  );
}

function albumScore(
  entity: SearchEntity,
  queryNorm: string,
  tokens: string[],
  signal: AlbumSignal | undefined,
  compilation: boolean,
  focusArtistNorm: string | null,
): number {
  const artistNorm = normalizeSearchLabel(entity.artist ?? "");
  const exactArtist = artistNorm === queryNorm;
  const focusArtist = focusArtistNorm != null && artistNorm === focusArtistNorm;
  const chartScore = signal?.peak != null ? -700 + signal.peak * 4 : 500;
  const durationScore = -Math.min(signal?.weeks ?? 0, 100) * 2;
  return (
    titleMatchScore(entity.label, queryNorm, tokens) +
    (exactArtist ? -4_500 : focusArtist ? -4_000 : 0) +
    chartScore +
    durationScore +
    (compilation ? 5_000 : 0) +
    entity.rank
  );
}

function candidateKey(candidate: RankedCandidate): string {
  return candidate.item.id;
}

function takeUnique(
  candidates: RankedCandidate[],
  used: Set<string>,
  limit: number,
): SearchSuggestionItem[] {
  const selected: SearchSuggestionItem[] = [];
  for (const candidate of candidates) {
    const key = candidateKey(candidate);
    if (used.has(key)) continue;
    used.add(key);
    selected.push(candidate.item);
    if (selected.length >= limit) break;
  }
  return selected;
}

/**
 * Ranks real catalog candidates for the public Search surface. This never creates
 * entities; it only reorders and groups candidates returned by querySearchEntities.
 */
export async function curateCatalogSearch(
  query: string,
  entities: SearchEntity[],
): Promise<CuratedSearchGroups> {
  const queryNorm = normalizeSearchLabel(query);
  if (!queryNorm) return EMPTY_CURATED_SEARCH_GROUPS;

  const expanded = await expandFocalArtistCandidates(queryNorm, entities);
  const visibleEntities = expanded.entities.filter(
    (entity) => entity.href?.trim() && entity.entityType !== "year",
  );
  if (visibleEntities.length === 0) return EMPTY_CURATED_SEARCH_GROUPS;

  const tokens = searchQueryTokens(query);
  const [trackSignals, albumSignals] = await Promise.all([
    loadTrackSignals(visibleEntities, expanded.trackSignals),
    loadAlbumSignals(visibleEntities, expanded.albumSignals),
  ]);

  const candidates: RankedCandidate[] = visibleEntities.map((entity) => {
    const isCompilation = entity.entityType === "album" && isCompilationAlbum(entity);
    const isCompoundArtist =
      entity.entityType === "artist" &&
      normalizeSearchLabel(entity.label) !== queryNorm &&
      COMPOUND_ARTIST.test(entity.label);
    const key = entity.rvId?.trim().toUpperCase() ?? "";
    let score = entity.rank;

    if (entity.entityType === "artist") {
      const support = catalogSupportForArtist(visibleEntities, normalizeSearchLabel(entity.label));
      score =
        artistMatchScore(entity.label, queryNorm) +
        (isCompoundArtist ? 4_000 : 0) -
        Math.min(support, 200) * 20 +
        entity.rank;
    } else if (entity.entityType === "track") {
      score = trackScore(
        entity,
        queryNorm,
        tokens,
        trackSignals.get(key),
        expanded.focusArtistNorm,
      );
    } else if (entity.entityType === "album") {
      score = albumScore(
        entity,
        queryNorm,
        tokens,
        albumSignals.get(key),
        isCompilation,
        expanded.focusArtistNorm,
      );
    }

    return {
      entity,
      item: entityToSuggestionItem(entity),
      score,
      isCompilation,
      isCompoundArtist,
    };
  });

  const byScore = (a: RankedCandidate, b: RankedCandidate) =>
    a.score - b.score || a.entity.label.localeCompare(b.entity.label, undefined, { sensitivity: "base" });

  const exactCandidates = candidates
    .filter((candidate) => exactTitle(candidate.entity, queryNorm))
    .sort(
      (a, b) =>
        TYPE_BEST_MATCH_ORDER[a.entity.entityType] - TYPE_BEST_MATCH_ORDER[b.entity.entityType] ||
        byScore(a, b),
    );

  const used = new Set<string>();
  const bestMatch = takeUnique(exactCandidates, used, 1);

  const artists = takeUnique(
    candidates
      .filter((candidate) => candidate.entity.entityType === "artist" && !candidate.isCompoundArtist)
      .sort(byScore),
    used,
    6,
  );

  const popularSongs = takeUnique(
    candidates.filter((candidate) => candidate.entity.entityType === "track").sort(byScore),
    used,
    8,
  );

  const albums = takeUnique(
    candidates
      .filter((candidate) => candidate.entity.entityType === "album" && !candidate.isCompilation)
      .sort(byScore),
    used,
    8,
  );

  const kindOffset: Record<SearchEntity["entityType"], number> = {
    artist: 0,
    track: 200,
    album: 400,
    year: 600,
  };
  const remaining = candidates.filter((candidate) => !used.has(candidateKey(candidate)));
  const otherMatches = [
    ...takeUnique(
      remaining.filter((candidate) => candidate.entity.entityType === "artist").sort(byScore),
      used,
      3,
    ),
    ...takeUnique(
      remaining
        .filter((candidate) => candidate.entity.entityType === "album" && candidate.isCompilation)
        .sort(byScore),
      used,
      3,
    ),
    ...takeUnique(
      remaining.filter((candidate) => candidate.entity.entityType === "album").sort(byScore),
      used,
      4,
    ),
    ...takeUnique(
      remaining.filter((candidate) => candidate.entity.entityType === "track").sort(byScore),
      used,
      6,
    ),
  ];
  if (otherMatches.length < 16) {
    otherMatches.push(
      ...takeUnique(
        remaining.sort(
          (a, b) =>
            a.score + kindOffset[a.entity.entityType] -
              (b.score + kindOffset[b.entity.entityType]) ||
            byScore(a, b),
        ),
        used,
        16 - otherMatches.length,
      ),
    );
  }

  return { bestMatch, artists, popularSongs, albums, otherMatches };
}
