import { unstable_cache } from "next/cache";

import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { WINNING_ARTWORK_LINK_ORDER } from "@/lib/artwork/winning-artwork-link-sql";
import type { ArtistChartHistory, ChartHistoryEntry } from "@/lib/artist/chart-history-types";
import { inspectQuery } from "@/lib/inspect/pg";
import { normalizeRVYear } from "@/lib/search/normalize-rv-year";

function pickCoverUrl(...candidates: (string | null | undefined)[]): string | null {
  return resolveAlbumCoverUrlFromRow({
    cover_path: candidates[0],
    artwork_path: candidates[1],
    r2_cover_key: candidates[2],
  });
}

type ChartHistoryRow = {
  track_id: string;
  track_title: string;
  chart_date: string;
  chart_position: number;
  weeks_on_chart: number;
  chart_name: string;
  artist_name: string;
  cover_path: string | null;
  artwork_path: string | null;
  r2_cover_key: string | null;
  release_year: number | null;
};

const COVER_SUBQUERY = `
  (
    SELECT aal.canonical_cover_path FROM album_artwork_links aal
    WHERE aal.album_id = al.id
    ${WINNING_ARTWORK_LINK_ORDER}
  ) AS artwork_path,
  (
    SELECT aal.r2_cover_key FROM album_artwork_links aal
    WHERE aal.album_id = al.id
    ${WINNING_ARTWORK_LINK_ORDER}
  ) AS r2_cover_key
`;

function hot100Branch(
  artistIdClause: string,
  yearClause: string,
  artistNameFallback = "$1::text",
): string {
  return `
    SELECT
      t.id::text AS track_id,
      t.title AS track_title,
      ca.chart_date::text AS chart_date,
      ca.chart_position,
      COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart,
      ca.chart_name,
      COALESCE(ar.canonical_name, ${artistNameFallback}) AS artist_name,
      al.canonical_cover_path AS cover_path,
      NULL::int AS release_year,
      ${COVER_SUBQUERY}
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN LATERAL (
      SELECT cat.album_id
      FROM canonical_album_tracks cat
      WHERE upper(trim(cat.canonical_track_key::text)) = upper(trim(t.id::text))
      ORDER BY cat.position
      LIMIT 1
    ) link ON true
    LEFT JOIN albums al ON al.id = link.album_id
    WHERE ca.chart_name = 'Billboard Hot 100'
    ${artistIdClause}
    ${yearClause}
  `;
}

function album200Branch(artistIdClause: string, yearClause: string): string {
  return `
    SELECT
      COALESCE(
        (
          SELECT upper(aek.external_key)
          FROM album_external_keys aek
          WHERE aek.album_id = al.id
            AND aek.external_key ~* '^RVAL\\d{6}$'
          LIMIT 1
        ),
        'album-' || al.id::text
      ) AS track_id,
      al.title AS track_title,
      ca.chart_date::text AS chart_date,
      ca.chart_position,
      COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart,
      ca.chart_name,
      ar.canonical_name AS artist_name,
      al.canonical_cover_path AS cover_path,
      al.release_year AS release_year,
      ${COVER_SUBQUERY}
    FROM chart_appearances ca
    JOIN albums al ON al.id = ca.album_id
    JOIN artists ar ON ar.id = al.artist_id
    WHERE ca.chart_name = 'Billboard 200'
    ${artistIdClause}
    ${yearClause}
  `;
}

/** RV year — #1 weekly rows only; canonical cover path, no artwork subqueries. */
function rvYearHot100Branch(yearClause: string): string {
  return `
    SELECT
      (
        SELECT upper(trim(coalesce(nullif(trim(ct.retroverse_track_id::text), ''), ctd.track_id)))
        FROM canonical_tracks ct
        JOIN canonical_track_display ctd ON ctd.id = ct.id
        WHERE ct.graph_track_id = t.id
          AND upper(trim(coalesce(nullif(trim(ct.retroverse_track_id::text), ''), ctd.track_id))) ~ '^RVTR\\d{6}$'
        LIMIT 1
      ) AS track_id,
      t.title AS track_title,
      ca.chart_date::text AS chart_date,
      ca.chart_position,
      COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart,
      ca.chart_name,
      COALESCE(ar.canonical_name, '') AS artist_name,
      al.canonical_cover_path AS cover_path,
      NULL::int AS release_year,
      NULL::text AS artwork_path,
      NULL::text AS r2_cover_key
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN LATERAL (
      SELECT cat.album_id
      FROM canonical_album_tracks cat
      WHERE upper(trim(cat.canonical_track_key::text)) = upper(trim(t.id::text))
      ORDER BY cat.position
      LIMIT 1
    ) link ON true
    LEFT JOIN albums al ON al.id = link.album_id
    WHERE ca.chart_name = 'Billboard Hot 100'
      AND ca.chart_position = 1
    ${yearClause}
  `;
}

function rvYearAlbum200Branch(yearClause: string): string {
  return `
    SELECT
      (
        SELECT upper(aek.external_key)
        FROM album_external_keys aek
        WHERE aek.album_id = al.id
          AND aek.external_key ~* '^RVAL\\d{6}$'
        LIMIT 1
      ) AS track_id,
      al.title AS track_title,
      ca.chart_date::text AS chart_date,
      ca.chart_position,
      COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart,
      ca.chart_name,
      ar.canonical_name AS artist_name,
      al.canonical_cover_path AS cover_path,
      al.release_year AS release_year,
      NULL::text AS artwork_path,
      NULL::text AS r2_cover_key
    FROM chart_appearances ca
    JOIN albums al ON al.id = ca.album_id
    JOIN artists ar ON ar.id = al.artist_id
    WHERE ca.chart_name = 'Billboard 200'
      AND ca.chart_position = 1
    ${yearClause}
  `;
}

function rowsToChartHistory(
  rows: ChartHistoryRow[],
  coverByTrackId: Map<string, string>,
  fallbackCover: string | null,
  rvYear?: number | null,
): ArtistChartHistory | null {
  if (rows.length === 0) return null;

  const entries: ChartHistoryEntry[] = rows.map((r) => {
    const dateKey = r.chart_date.slice(0, 10);
    const year = Number(dateKey.slice(0, 4));
    const month = Number(dateKey.slice(5, 7));
    const trackId = r.track_id?.trim() ?? "";
    const coverUrl =
      coverByTrackId.get(trackId.toUpperCase()) ??
      pickCoverUrl(r.cover_path, r.artwork_path, r.r2_cover_key) ??
      fallbackCover;
    const releaseYear =
      typeof r.release_year === "number" && Number.isFinite(r.release_year) && r.release_year > 0
        ? r.release_year
        : null;

    return {
      id: `${dateKey}|${trackId}|${r.chart_name}`,
      trackId,
      title: r.track_title.trim(),
      artist: r.artist_name.trim(),
      chartDate: dateKey,
      year: Number.isFinite(year) ? year : 0,
      month: Number.isFinite(month) ? month : 1,
      peakPosition: r.chart_position,
      weeksOnChart: r.weeks_on_chart,
      chartName: r.chart_name,
      coverUrl,
      releaseYear,
    };
  });

  const yearSet = new Set<number>();
  for (const e of entries) {
    if (e.year >= 1950 && e.year <= 2035) yearSet.add(e.year);
  }
  let activeYears = [...yearSet].sort((a, b) => a - b);

  const resolvedYear = normalizeRVYear(rvYear);
  if (resolvedYear != null) {
    activeYears = activeYears.includes(resolvedYear) ? [resolvedYear] : [];
    if (activeYears.length === 0) return null;
  }

  return { entries, activeYears };
}

async function queryWeeklyChartRows(
  sql: string,
  params: unknown[],
): Promise<ChartHistoryRow[]> {
  return inspectQuery<ChartHistoryRow>(sql, params);
}

/** Artist exhibit preview — recent weekly rows only (full history on /charts). */
export const ARTIST_CHART_PREVIEW_LIMIT = 400;

/** Full artist chart route — matches prior default cap. */
export const ARTIST_CHART_FULL_LIMIT = 2000;

export type ArtistChartHistoryScope = "preview" | "full";

function artistWeeklyChartSql(
  artistClause: string,
  albumArtistClause: string,
  yearClause: string,
  scope: ArtistChartHistoryScope,
): string {
  const union = `
    ${hot100Branch(artistClause, yearClause)}
    UNION ALL
    ${album200Branch(albumArtistClause, yearClause)}
  `;
  if (yearClause) {
    return `${union} ORDER BY chart_date ASC`;
  }
  if (scope === "preview") {
    return `
      SELECT * FROM (
        ${union}
        ORDER BY chart_date DESC
        LIMIT ${ARTIST_CHART_PREVIEW_LIMIT}
      ) recent
      ORDER BY chart_date ASC
    `;
  }
  return `${union} ORDER BY chart_date ASC LIMIT ${ARTIST_CHART_FULL_LIMIT}`;
}

async function fetchArtistWeeklyChartRows(
  artistId: number,
  artistName: string,
  scope: ArtistChartHistoryScope,
  rvYear?: number | null,
): Promise<ChartHistoryRow[]> {
  const resolvedYear = normalizeRVYear(rvYear);
  const artistClause = "AND t.artist_id = $2";
  const albumArtistClause = "AND al.artist_id = $2";
  const yearClause =
    resolvedYear != null ? "AND EXTRACT(YEAR FROM ca.chart_date)::int = $3" : "";
  const albumYearClause =
    resolvedYear != null ? "AND EXTRACT(YEAR FROM ca.chart_date)::int = $3" : "";

  const params: (string | number)[] =
    resolvedYear != null ? [artistName, artistId, resolvedYear] : [artistName, artistId];

  return queryWeeklyChartRows(
    artistWeeklyChartSql(artistClause, albumArtistClause, yearClause, scope),
    params,
  );
}

const cachedArtistWeeklyChartRows = (
  artistId: number,
  scope: ArtistChartHistoryScope,
) =>
  unstable_cache(
    () => fetchArtistWeeklyChartRows(artistId, "", scope, null),
    [`artist-chart-rows-v1-${artistId}-${scope}`],
    { revalidate: 3600, tags: [`artist-chart-${artistId}`] },
  );

export async function loadArtistChartHistory(
  artistId: number,
  artistName: string,
  coverByTrackId: Map<string, string>,
  fallbackCover: string | null,
  rvYear?: number | null,
  scope: ArtistChartHistoryScope = "preview",
): Promise<ArtistChartHistory | null> {
  const resolvedYear = normalizeRVYear(rvYear);
  const useCache =
    resolvedYear == null && coverByTrackId.size === 0 && fallbackCover == null;

  const rows = useCache
    ? await cachedArtistWeeklyChartRows(artistId, scope)()
    : await fetchArtistWeeklyChartRows(artistId, artistName, scope, rvYear);

  const history = rowsToChartHistory(rows, coverByTrackId, fallbackCover, resolvedYear);
  if (!history) return null;
  return { ...history, weeklyEntries: history.entries };
}

/** RV year snapshot — Hot 100 + Album 200 #1 weekly rows for one RV Year. */
async function loadRvYearChartHistoryCore(
  resolvedYear: number,
  coverByTrackId: Map<string, string>,
  fallbackCover: string | null,
): Promise<ArtistChartHistory | null> {
  const yearClause = "AND EXTRACT(YEAR FROM ca.chart_date)::int = $1";

  const rows = await queryWeeklyChartRows(
    `
    ${rvYearHot100Branch(yearClause)}
    UNION ALL
    ${rvYearAlbum200Branch(yearClause)}
    ORDER BY chart_date ASC
    `,
    [resolvedYear],
  );

  const history = rowsToChartHistory(rows, coverByTrackId, fallbackCover, resolvedYear);
  if (!history) return null;
  return { ...history, weeklyEntries: history.entries };
}

const cachedRvYearChartHistory = (resolvedYear: number) =>
  unstable_cache(
    () => loadRvYearChartHistoryCore(resolvedYear, new Map(), null),
    [`rv-year-chart-history-v4-${resolvedYear}`],
    { revalidate: 3600, tags: [`rv-year-${resolvedYear}`] },
  );

export async function loadRvYearChartHistory(
  rvYear: number,
  coverByTrackId: Map<string, string> = new Map(),
  fallbackCover: string | null = null,
): Promise<ArtistChartHistory | null> {
  const resolvedYear = normalizeRVYear(rvYear);
  if (resolvedYear == null) return null;

  if (coverByTrackId.size === 0 && fallbackCover == null) {
    return cachedRvYearChartHistory(resolvedYear)();
  }

  return loadRvYearChartHistoryCore(resolvedYear, coverByTrackId, fallbackCover);
}

/** Tooling — bypass unstable_cache when auditing chart rows. */
export { loadRvYearChartHistoryCore };
