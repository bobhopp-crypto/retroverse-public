import "server-only";

import { slugFromArtistName } from "@/lib/artist/slug";
import { coverPathToUrl } from "@/lib/artist/cover-url";
import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import {
  winningArtworkPathSubquery,
  winningArtworkR2Subquery,
} from "@/lib/artwork/winning-artwork-link-sql";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { resolveCanonicalTracksBatch } from "@/lib/public/canonical-public-resolver";
import type { CanonicalTrackBatchItem } from "@/lib/public/canonical-public-resolver";
import { dedupeSearchEntities } from "@/lib/search/dedupe-search-entities";
import {
  applyCanonicalArtistDisplay,
  refineOverlayEntities,
} from "@/lib/search/refine-overlay-entities";
import {
  trackPageHref,
  yearSuggestionHref,
} from "@/lib/search/entity-routes";
import {
  normalizeSearchLabel,
  searchQueryTokens,
} from "@/lib/search/normalize-search-label";
import {
  overlaySearchEntityLimits,
  overlaySearchSqlFetchLimit,
  searchBreadthTier,
  searchEntityLimits,
  searchSqlFetchLimit,
} from "@/lib/search/search-breadth";
import type { SearchEntity, SearchEntityType } from "@/lib/search/search-entity-types";

const TYPE_SORT: Record<SearchEntityType, number> = {
  artist: 0,
  album: 1,
  track: 2,
  year: 3,
};

type EntityRow = {
  entity_type: string;
  label: string;
  normalized_label: string;
  rv_id: string | null;
  slug: string | null;
  artist_name: string | null;
  release_year: number | null;
  peak_hot100_position: number | null;
  chart_weeks: number | null;
  has_hot100: boolean | null;
  has_vdj_media: boolean | null;
  cover_path: string | null;
  match_rank: number;
  type_rank: number;
};

function sanitizePattern(query: string): string {
  return normalizeSearchLabel(query).replace(/[%_]/g, "");
}

function entityHref(row: EntityRow): string | null {
  const type = row.entity_type as SearchEntityType;
  if (type === "artist") {
    const artistId = row.rv_id?.trim() ?? "";
    return /^\d+$/.test(artistId) ? `/artist/${artistId}` : null;
  }
  if (type === "track") {
    const rvtr = row.rv_id?.trim().toUpperCase() ?? "";
    return /^RVTR\d{6}$/.test(rvtr) ? trackPageHref(rvtr) : null;
  }
  if (type === "album") {
    const rval = row.rv_id?.trim().toUpperCase() ?? "";
    return /^RVAL\d{6}$/.test(rval) ? `/album/${rval}` : null;
  }
  if (type === "year") {
    const y = row.release_year ?? Number.parseInt(row.label, 10);
    if (Number.isFinite(y)) return yearSuggestionHref(y);
  }
  return null;
}

function chartRankAdjustment(row: EntityRow): number {
  if (row.entity_type !== "track") return 0;
  const chartBonus = row.has_hot100 ? -1_200 : 0;
  const peak = row.peak_hot100_position != null ? row.peak_hot100_position * 5 : 900;
  const weeks = -Math.min(row.chart_weeks ?? 0, 100) * 3;
  const catalogBonus = row.has_vdj_media ? -80 : 0;
  return chartBonus + peak + weeks + catalogBonus;
}

function rowToEntity(row: EntityRow, includeArtwork: boolean): SearchEntity {
  const type = row.entity_type as SearchEntityType;
  return {
    entityType: type,
    label: row.label,
    normalizedLabel: row.normalized_label,
    rvId: row.rv_id,
    slug:
      type === "artist" && /^\d+$/.test(row.rv_id?.trim() ?? "")
        ? row.rv_id!.trim()
        : row.slug?.trim() || slugFromArtistName(row.label),
    href: entityHref(row) ?? "",
    artist: row.artist_name,
    year: row.release_year,
    // Keep the lightweight overlay unchanged; full catalog search uses canonical covers.
    coverUrl: includeArtwork ? coverPathToUrl(row.cover_path) : null,
    rank: row.match_rank * 10 + row.type_rank + chartRankAdjustment(row),
  };
}

let hasSearchEntitiesMatviewCached: boolean | undefined;
async function resolveSearchEntitiesMatview(): Promise<boolean> {
  if (hasSearchEntitiesMatviewCached === true) return true;
  const rows = await inspectQuery<{ relname: string }>(
    `
    SELECT relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'search_entities' AND c.relkind = 'm'
    `,
  );
  const exists = rows.length > 0;
  if (exists) hasSearchEntitiesMatviewCached = true;
  return exists;
}

let hasPgTrgmCached: boolean | undefined;
async function resolvePgTrgm(): Promise<boolean> {
  if (hasPgTrgmCached === true) return true;
  const rows = await inspectQuery<{ extname: string }>(
    `SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'`,
  );
  const exists = rows.length > 0;
  if (exists) hasPgTrgmCached = true;
  return exists;
}

const INLINE_SOURCE = `
  SELECT
    'artist'::text AS entity_type,
    a.canonical_name AS label,
    regexp_replace(regexp_replace(lower(trim(a.canonical_name)), '^the\\s+', '', 'g'), '[^a-z0-9]+', ' ', 'g') AS normalized_label,
    a.id::text AS rv_id,
    regexp_replace(regexp_replace(lower(trim(a.canonical_name)), '^the\\s+', '', 'g'), '[^a-z0-9]+', '-', 'g') AS slug,
    NULL::text AS artist_name,
    NULL::int AS release_year,
    NULL::int AS peak_hot100_position,
    NULL::int AS chart_weeks,
    NULL::boolean AS has_hot100,
    NULL::boolean AS has_vdj_media,
    (
      SELECT al.canonical_cover_path FROM albums al
      WHERE al.artist_id = a.id AND al.canonical_cover_path IS NOT NULL
      ORDER BY al.release_year DESC NULLS LAST LIMIT 1
    ) AS cover_path
  FROM artists a
  UNION ALL
  SELECT 'album'::text, al.title,
    regexp_replace(lower(trim(al.title) || ' ' || trim(ar.canonical_name)), '[^a-z0-9]+', ' ', 'g'),
    upper(trim(aek.external_key)),
    regexp_replace(lower(trim(al.title)), '[^a-z0-9]+', '-', 'g'),
    ar.canonical_name, al.release_year,
    NULL::int, NULL::int, NULL::boolean, NULL::boolean,
    NULL::text
  FROM albums al
  JOIN artists ar ON ar.id = al.artist_id
  LEFT JOIN album_external_keys aek ON aek.album_id = al.id
  UNION ALL
  SELECT 'track'::text, ctd.canonical_title,
    regexp_replace(lower(trim(ctd.canonical_title) || ' ' || trim(ctd.canonical_artist_name)), '[^a-z0-9]+', ' ', 'g'),
    upper(trim(ctd.track_id)), regexp_replace(lower(trim(ctd.canonical_title)), '[^a-z0-9]+', '-', 'g'),
    ctd.canonical_artist_name, NULL::int,
    ctd.peak_hot100_position, ctd.chart_weeks, ctd.has_hot100, ctd.has_vdj_media,
    NULL::text
  FROM canonical_track_display ctd
  WHERE COALESCE(ctd.review_flag, 'ok') NOT LIKE 'duplicate_of:%'
  UNION ALL
  SELECT 'year'::text, y.year_label, y.year_label, NULL::text, y.year_label, NULL::text, y.year_num,
    NULL::int, NULL::int, NULL::boolean, NULL::boolean,
    NULL::text
  FROM (
    SELECT DISTINCT extract(year FROM ca.chart_date)::int AS year_num,
      extract(year FROM ca.chart_date)::text AS year_label
    FROM chart_appearances ca
    WHERE ca.chart_date IS NOT NULL AND extract(year FROM ca.chart_date) BETWEEN 1950 AND 2035
  ) y
`;

function buildMatchSql(
  pattern: string,
  tokens: string[],
  useTrgm: boolean,
  fromClause: string,
  perTypeLimits: Record<SearchEntityType, number>,
): { sql: string; params: unknown[] } {
  const matchTokens = tokens.length > 0 ? tokens : [pattern];
  const params: unknown[] = [...matchTokens];
  const tokenClauses = matchTokens.map(
    (_, i) => `se.normalized_label LIKE '%' || $${i + 1} || '%'`,
  );
  const where =
    useTrgm && matchTokens.length === 1
      ? `(${tokenClauses[0]} OR se.normalized_label % $1)`
      : tokenClauses.map((c) => `(${c})`).join(" AND ");

  const fullNorm = matchTokens.join(" ");

  const matchRank = `
    (CASE
      WHEN se.entity_type = 'artist' AND se.normalized_label = $1 THEN 0
      WHEN se.entity_type = 'artist' AND se.normalized_label LIKE $1 || '%' THEN 1
      WHEN se.entity_type = 'track'
        AND regexp_replace(lower(trim(se.label)), '[^a-z0-9]+', ' ', 'g') = $1 THEN 2
      WHEN se.entity_type = 'track'
        AND regexp_replace(lower(trim(se.label)), '[^a-z0-9]+', ' ', 'g') LIKE $1 || '%' THEN 3
      WHEN $${params.length + 1} <> '' AND se.normalized_label = $${params.length + 1} THEN 4
      WHEN se.normalized_label LIKE $1 || '%' THEN 5
      WHEN split_part(se.normalized_label, ' ', 1) LIKE $1 || '%' THEN 6
      WHEN se.normalized_label LIKE '% ' || $1 || '%' THEN 7
      WHEN se.normalized_label LIKE '%' || $1 || '%' THEN 8
      ELSE 9
    END)`;

  params.push(fullNorm);

  const typeRank = `
    (CASE se.entity_type
      WHEN 'artist' THEN 0
      WHEN 'album' THEN 1
      WHEN 'track' THEN 2
      WHEN 'year' THEN 3
      ELSE 4
    END)`;

  const trgmRank = useTrgm
    ? `, similarity(se.normalized_label, $1) AS trgm_score`
    : `, 0::real AS trgm_score`;

  const windowOrder = useTrgm
    ? `${matchRank} ASC, similarity(se.normalized_label, $1) DESC NULLS LAST`
    : `${matchRank} ASC`;

  const sql = `
    SELECT entity_type, label, normalized_label, rv_id, slug,
      artist_name, release_year, peak_hot100_position, chart_weeks, has_hot100,
      has_vdj_media, cover_path, match_rank, type_rank
    FROM (
      SELECT se.entity_type, se.label, se.normalized_label, se.rv_id, se.slug,
        se.artist_name, se.release_year, se.peak_hot100_position, se.chart_weeks,
        se.has_hot100, se.has_vdj_media, se.cover_path,
        ${matchRank} AS match_rank,
        ${typeRank} AS type_rank
        ${trgmRank},
        row_number() OVER (
          PARTITION BY se.entity_type
          ORDER BY ${windowOrder},
            length(se.normalized_label), se.label
        ) AS type_row
      FROM ${fromClause}
      WHERE ${where}
    ) ranked
    WHERE (entity_type = 'artist' AND type_row <= ${perTypeLimits.artist})
       OR (entity_type = 'album' AND type_row <= ${perTypeLimits.album})
       OR (entity_type = 'track' AND type_row <= ${perTypeLimits.track})
       OR (entity_type = 'year' AND type_row <= ${perTypeLimits.year})
    ORDER BY match_rank ASC, type_rank ASC,
      position($1 in normalized_label) ASC NULLS LAST,
      length(normalized_label) ASC, label ASC
  `;

  return { sql, params };
}

function capByType(
  entities: SearchEntity[],
  limits: Record<SearchEntityType, number>,
): SearchEntity[] {
  const counts: Record<SearchEntityType, number> = {
    artist: 0,
    album: 0,
    track: 0,
    year: 0,
  };
  const out: SearchEntity[] = [];

  for (const entity of entities) {
    const type = entity.entityType;
    if (counts[type] >= limits[type]) continue;
    counts[type] += 1;
    out.push(entity);
  }

  return out;
}

let pingOkUntil = 0;
async function ensurePgReady(): Promise<boolean> {
  if (Date.now() < pingOkUntil) return true;
  const ping = await inspectPing();
  if (ping.ok) pingOkUntil = Date.now() + 30_000;
  return ping.ok;
}

export type SearchEntityQueryMode = "overlay" | "full";

export type SearchEntityQueryMeta = {
  entitySource: "matview" | "inline";
  pgTrgm: boolean;
};

export type SearchEntityQueryResult = {
  entities: SearchEntity[];
  meta: SearchEntityQueryMeta;
};

/** Deterministic entity narrowing — primary overlay search source. */
export async function querySearchEntities(
  query: string,
  options: { mode?: SearchEntityQueryMode } = {},
): Promise<SearchEntityQueryResult> {
  const mode = options.mode ?? "full";
  const pingOk = await ensurePgReady();
  if (!pingOk) {
    return {
      entities: [],
      meta: { entitySource: "inline", pgTrgm: false },
    };
  }

  const pattern = sanitizePattern(query);
  if (pattern.length < 1) {
    return {
      entities: [],
      meta: { entitySource: "inline", pgTrgm: false },
    };
  }

  const tier = searchBreadthTier(query);
  const limits =
    mode === "overlay" ? overlaySearchEntityLimits(tier) : searchEntityLimits(tier);
  const sqlPerType =
    mode === "overlay" ? overlaySearchSqlFetchLimit(tier) : searchSqlFetchLimit(tier);
  const tokens = searchQueryTokens(query);
  const useTrgmRaw = await resolvePgTrgm();
  // Overlay: skip fuzzy trgm — prefix + artist/title ranks are more trustworthy.
  const useTrgm = useTrgmRaw && mode !== "overlay";
  const hasMatview = await resolveSearchEntitiesMatview();
  const entitySource = hasMatview ? "matview" : ("inline" as const);
  const fromClause = hasMatview ? "search_entities se" : `(${INLINE_SOURCE}) se`;

  const { sql, params } = buildMatchSql(
    pattern,
    tokens,
    useTrgm,
    fromClause,
    {
      artist: sqlPerType,
      album: sqlPerType,
      track: sqlPerType,
      year: Math.min(sqlPerType, 24),
    },
  );
  const rows = await inspectQuery<EntityRow & { trgm_score?: number }>(sql, params);

  const deduped = dedupeSearchEntities(
    rows.map((row) => rowToEntity(row, mode === "full")),
  );
  deduped.sort(
    (a, b) =>
      a.rank - b.rank ||
      TYPE_SORT[a.entityType] - TYPE_SORT[b.entityType] ||
      a.normalizedLabel.length - b.normalizedLabel.length ||
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );

  const limited = capByType(deduped, limits);
  const refined =
    mode === "overlay"
      ? refineOverlayEntities(limited, query)
      : applyCanonicalArtistDisplay(limited);
  const meta: SearchEntityQueryMeta = { entitySource, pgTrgm: useTrgmRaw };

  // Overlay skips year enrichment — avoid blocking first paint on a second PG round-trip.
  if (mode === "overlay") {
    return { entities: refined, meta };
  }

  // Full mode: hydrate song year and artwork from the same canonical graph used by Song pages.
  const trackRvIds = refined
    .filter((e) => e.entityType === "track" && e.rvId)
    .map((e) => e.rvId!.trim().toUpperCase());

  const uniqueTrackRvIds = [...new Set(trackRvIds)];
  const albumRvals = [
    ...new Set(
      refined
        .filter((e) => e.entityType === "album" && e.rvId)
        .map((e) => e.rvId!.trim().toUpperCase()),
    ),
  ];

  if (uniqueTrackRvIds.length > 0 || albumRvals.length > 0) {
    const [canonicalTracks, albumRows] = await Promise.all([
      uniqueTrackRvIds.length > 0
        ? resolveCanonicalTracksBatch(uniqueTrackRvIds)
        : Promise.resolve(new Map<string, CanonicalTrackBatchItem>()),
      albumRvals.length > 0
        ? inspectQuery<{
            rval: string;
            cover_path: string | null;
            artwork_path: string | null;
            r2_cover_key: string | null;
          }>(
            `
            SELECT upper(trim(aek.external_key)) AS rval,
                   al.canonical_cover_path AS cover_path,
                   ${winningArtworkPathSubquery()},
                   ${winningArtworkR2Subquery()}
            FROM album_external_keys aek
            JOIN albums al ON al.id = aek.album_id
            WHERE upper(trim(aek.external_key)) = ANY($1::text[])
            `,
            [albumRvals],
          )
        : Promise.resolve([]),
    ]);

    const albumCoverMap = new Map(
      albumRows.map((r) => [
        r.rval.trim().toUpperCase(),
        resolveAlbumCoverUrlFromRow(r),
      ]),
    );

    return {
      entities: refined.map((e) => {
        if (e.entityType === "album") {
          const key = e.rvId?.trim().toUpperCase() ?? "";
          return { ...e, coverUrl: albumCoverMap.get(key) ?? e.coverUrl };
        }
        if (e.entityType !== "track") return e;
        const key = e.rvId?.trim().toUpperCase() ?? "";
        const canonicalTrack = canonicalTracks.get(key);
        return {
          ...e,
          artist: canonicalTrack?.artist.displayName ?? e.artist,
          year: e.year ?? canonicalTrack?.canonicalYear ?? null,
          coverUrl:
            canonicalTrack
              ? canonicalTrack.albumResolution.primaryAlbum?.coverUrl ?? null
              : e.coverUrl,
        };
      }),
      meta,
    };
  }

  return { entities: refined, meta };
}
