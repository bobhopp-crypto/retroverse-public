import "server-only";

import { coverPathToUrl } from "@/lib/artist/cover-url";
import { artistPagePath } from "@/lib/artist/resolve-artist";
import { slugFromArtistName } from "@/lib/artist/slug";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import {
  albumSuggestionHref,
  trackPageHref,
  yearSuggestionHref,
} from "@/lib/search/entity-routes";
import {
  normalizeSearchLabel,
  searchQueryTokens,
} from "@/lib/search/normalize-search-label";
import type { SearchEntity, SearchEntityType } from "@/lib/search/search-entity-types";

const LIMITS: Record<SearchEntityType, number> = {
  artist: 10,
  album: 8,
  track: 10,
  year: 4,
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
  rank_score: number;
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
    coverUrl: coverPathToUrl(row.cover_path),
    rank: row.rank_score,
  };
}

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
    lower(regexp_replace(regexp_replace(trim(a.canonical_name), '^the\\s+', '', 'i'), '[^a-z0-9]+', ' ', 'g')) AS normalized_label,
    NULL::text AS rv_id,
    lower(regexp_replace(regexp_replace(trim(a.canonical_name), '^the\\s+', '', 'i'), '[^a-z0-9]+', '-', 'g')) AS slug,
    NULL::text AS artist_name,
    NULL::int AS release_year,
    (SELECT al.canonical_cover_path FROM albums al WHERE al.artist_id = a.id AND al.canonical_cover_path IS NOT NULL ORDER BY al.release_year DESC NULLS LAST LIMIT 1) AS cover_path
  FROM artists a
  UNION ALL
  SELECT 'album'::text, al.title,
    lower(regexp_replace(trim(al.title) || ' ' || trim(ar.canonical_name), '[^a-z0-9]+', ' ', 'g')),
    upper(trim(aek.external_key)),
    lower(regexp_replace(trim(al.title), '[^a-z0-9]+', '-', 'g')),
    ar.canonical_name, al.release_year, al.canonical_cover_path
  FROM albums al
  JOIN artists ar ON ar.id = al.artist_id
  LEFT JOIN album_external_keys aek ON aek.album_id = al.id
  UNION ALL
  SELECT 'track'::text, ctd.canonical_title,
    lower(regexp_replace(trim(ctd.canonical_title) || ' ' || trim(ctd.canonical_artist_name), '[^a-z0-9]+', ' ', 'g')),
    upper(trim(ctd.track_id)), lower(regexp_replace(trim(ctd.canonical_title), '[^a-z0-9]+', '-', 'g')),
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

  const rankExpr = `
    (CASE
      WHEN se.normalized_label LIKE $1 || '%' THEN 0
      WHEN se.normalized_label LIKE '% ' || $1 || '%' THEN 1
      WHEN se.normalized_label LIKE '%' || $1 || '%' THEN 2
      ELSE 3
    END)`; // $1 = primary match token

  const trgmRank = useTrgm
    ? `, similarity(se.normalized_label, $1) AS trgm_score`
    : `, 0::real AS trgm_score`;

  const sql = `
    SELECT se.entity_type, se.label, se.normalized_label, se.rv_id, se.slug,
      se.artist_name, se.release_year, se.cover_path,
      ${rankExpr} AS rank_score
      ${trgmRank}
    FROM (${fromClause}) se
    WHERE ${where}
    ORDER BY rank_score ASC, trgm_score DESC NULLS LAST, length(se.normalized_label), se.label
    LIMIT 80
  `;

  return { sql, params };
}

/** Deterministic entity narrowing — primary overlay search source. */
export async function querySearchEntities(query: string): Promise<SearchEntity[]> {
  const ping = await inspectPing();
  if (!ping.ok) return [];

  const pattern = sanitizePattern(query);
  if (pattern.length < 1) return [];

  const tokens = searchQueryTokens(query);
  const useTrgm = await hasPgTrgm();
  const useMatview = await hasSearchEntitiesMatview();
  const fromClause = useMatview ? `search_entities` : INLINE_SOURCE;

  const { sql, params } = buildMatchSql(pattern, tokens, useTrgm, fromClause);
  const rows = await inspectQuery<EntityRow & { trgm_score?: number }>(sql, params);

  const byType: Record<SearchEntityType, SearchEntity[]> = {
    artist: [],
    album: [],
    track: [],
    year: [],
  };

  for (const row of rows) {
    const type = row.entity_type as SearchEntityType;
    if (!LIMITS[type]) continue;
    if (byType[type].length >= LIMITS[type]) continue;
    byType[type].push(rowToEntity(row));
  }

  return [
    ...byType.artist,
    ...byType.track,
    ...byType.album,
    ...byType.year,
  ];
}
