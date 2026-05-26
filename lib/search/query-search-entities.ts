import "server-only";

import { artistPagePath } from "@/lib/artist/resolve-artist";
import { slugFromArtistName } from "@/lib/artist/slug";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { dedupeSearchEntities } from "@/lib/search/dedupe-search-entities";
import {
  albumSuggestionHref,
  trackPageHref,
  yearSuggestionHref,
} from "@/lib/search/entity-routes";
import {
  normalizeSearchLabel,
  searchQueryTokens,
} from "@/lib/search/normalize-search-label";
import {
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
  cover_path: string | null;
  match_rank: number;
  type_rank: number;
};

function sanitizePattern(query: string): string {
  return normalizeSearchLabel(query).replace(/[%_]/g, "");
}

function entityHref(row: EntityRow): string {
  const type = row.entity_type as SearchEntityType;
  if (type === "artist") {
    const slug = row.slug?.trim() || slugFromArtistName(row.label);
    return artistPagePath(row.label) || `/artist/${slug}`;
  }
  if (type === "track") {
    const id = row.rv_id?.trim() || row.slug?.trim() || row.label;
    return trackPageHref(id);
  }
  if (type === "album") {
    return albumSuggestionHref(
      row.label,
      row.rv_id ? `/albums/${row.rv_id}` : null,
    );
  }
  if (type === "year") {
    const y = row.release_year ?? Number.parseInt(row.label, 10);
    if (Number.isFinite(y)) return yearSuggestionHref(y);
  }
  return "/";
}

function rowToEntity(row: EntityRow): SearchEntity {
  const type = row.entity_type as SearchEntityType;
  return {
    entityType: type,
    label: row.label,
    normalizedLabel: row.normalized_label,
    rvId: row.rv_id,
    slug: row.slug?.trim() || slugFromArtistName(row.label),
    href: entityHref(row),
    artist: row.artist_name,
    year: row.release_year,
    // Overlay is a lightweight archive drawer; cover art is a hydration-time concern.
    coverUrl: null,
    rank: row.match_rank * 10 + row.type_rank,
  };
}

let hasSearchEntitiesMatviewCached: Promise<boolean> | null = null;
async function hasSearchEntitiesMatview(): Promise<boolean> {
  const rows = await inspectQuery<{ relname: string }>(
    `
    SELECT relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'search_entities' AND c.relkind = 'm'
    `,
  );
  return rows.length > 0;
}

let hasPgTrgmCached: Promise<boolean> | null = null;
async function hasPgTrgm(): Promise<boolean> {
  const rows = await inspectQuery<{ extname: string }>(
    `SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'`,
  );
  return rows.length > 0;
}

const INLINE_SOURCE = `
  SELECT
    'artist'::text AS entity_type,
    a.canonical_name AS label,
    regexp_replace(regexp_replace(lower(trim(a.canonical_name)), '^the\\s+', '', 'g'), '[^a-z0-9]+', ' ', 'g') AS normalized_label,
    NULL::text AS rv_id,
    regexp_replace(regexp_replace(lower(trim(a.canonical_name)), '^the\\s+', '', 'g'), '[^a-z0-9]+', '-', 'g') AS slug,
    NULL::text AS artist_name,
    NULL::int AS release_year,
    NULL::text AS cover_path
  FROM artists a
  UNION ALL
  SELECT 'album'::text, al.title,
    regexp_replace(lower(trim(al.title) || ' ' || trim(ar.canonical_name)), '[^a-z0-9]+', ' ', 'g'),
    upper(trim(aek.external_key)),
    regexp_replace(lower(trim(al.title)), '[^a-z0-9]+', '-', 'g'),
    ar.canonical_name, al.release_year, NULL::text
  FROM albums al
  JOIN artists ar ON ar.id = al.artist_id
  LEFT JOIN album_external_keys aek ON aek.album_id = al.id
  UNION ALL
  SELECT 'track'::text, ctd.canonical_title,
    regexp_replace(lower(trim(ctd.canonical_title) || ' ' || trim(ctd.canonical_artist_name)), '[^a-z0-9]+', ' ', 'g'),
    upper(trim(ctd.track_id)), regexp_replace(lower(trim(ctd.canonical_title)), '[^a-z0-9]+', '-', 'g'),
    ctd.canonical_artist_name, NULL::int, NULL::text
  FROM canonical_track_display ctd
  UNION ALL
  SELECT 'year'::text, y.year_label, y.year_label, NULL::text, y.year_label, NULL::text, y.year_num, NULL::text
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
      WHEN se.normalized_label = $1 THEN 0
      WHEN $${params.length + 1} <> '' AND se.normalized_label = $${params.length + 1} THEN 1
      WHEN se.normalized_label LIKE $1 || '%' THEN 2
      WHEN split_part(se.normalized_label, ' ', 1) LIKE $1 || '%' THEN 3
      WHEN se.normalized_label LIKE '% ' || $1 || '%' THEN 4
      WHEN se.normalized_label LIKE '%' || $1 || '%' THEN 5
      ELSE 6
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
      artist_name, release_year, cover_path, match_rank, type_rank
    FROM (
      SELECT se.entity_type, se.label, se.normalized_label, se.rv_id, se.slug,
        se.artist_name, se.release_year, se.cover_path,
        ${matchRank} AS match_rank,
        ${typeRank} AS type_rank
        ${trgmRank},
        row_number() OVER (
          PARTITION BY se.entity_type
          ORDER BY ${windowOrder},
            length(se.normalized_label), se.label
        ) AS type_row
      FROM (${fromClause}) se
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

/** Deterministic entity narrowing — primary overlay search source. */
export async function querySearchEntities(query: string): Promise<SearchEntity[]> {
  const ping = await inspectPing();
  if (!ping.ok) return [];

  const pattern = sanitizePattern(query);
  if (pattern.length < 1) return [];

  const tier = searchBreadthTier(query);
  const limits = searchEntityLimits(tier);
  const sqlPerType = searchSqlFetchLimit(tier);
  const tokens = searchQueryTokens(query);
  if (!hasPgTrgmCached) hasPgTrgmCached = hasPgTrgm();
  if (!hasSearchEntitiesMatviewCached) hasSearchEntitiesMatviewCached = hasSearchEntitiesMatview();
  const useTrgm = await hasPgTrgmCached;
  const useMatview = await hasSearchEntitiesMatviewCached;
  const fromClause = useMatview ? `search_entities` : INLINE_SOURCE;

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

  const deduped = dedupeSearchEntities(rows.map(rowToEntity));
  deduped.sort(
    (a, b) =>
      a.rank - b.rank ||
      TYPE_SORT[a.entityType] - TYPE_SORT[b.entityType] ||
      a.normalizedLabel.length - b.normalizedLabel.length ||
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );

  const limited = capByType(deduped, limits);

  // Matview track rows historically omit release_year; fill it cheaply from canonical_track_display.
  const trackRvIds = limited
    .filter((e) => e.entityType === "track" && !e.year && e.rvId)
    .map((e) => e.rvId!.trim().toUpperCase());

  const uniqueTrackRvIds = [...new Set(trackRvIds)];

  if (uniqueTrackRvIds.length > 0) {
    const yearRows = await inspectQuery<{
      rvtr: string;
      release_year: number | null;
    }>(
      `
      SELECT
        track_id AS rvtr,
        extract(year FROM first_chart_date)::int AS release_year
      FROM canonical_track_display
      WHERE track_id = ANY($1::text[])
      `,
      [uniqueTrackRvIds],
    );

    const yearMap = new Map(
      yearRows.map((r) => [r.rvtr.trim().toUpperCase(), r.release_year]),
    );

    return limited.map((e) => {
      if (e.entityType !== "track") return e;
      if (e.year != null) return e;
      const key = e.rvId?.trim().toUpperCase() ?? "";
      return { ...e, year: yearMap.get(key) ?? null };
    });
  }

  return limited;
}
