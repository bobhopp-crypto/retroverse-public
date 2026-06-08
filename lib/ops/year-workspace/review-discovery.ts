import { inspectQuery } from "@/lib/inspect/pg";
import { searchVdjVideoLibrary } from "@/lib/ops/load-vdj-search";

import {
  REVIEW_PILOT_ACTIVE_YEARS,
  type ReviewPilotYear,
} from "./review-pilot";

export type ReviewDiscoveryHit = {
  kind:
    | "same_artist_active_year"
    | "same_song_other_year"
    | "chart_appearance"
    | "retroverse_catalog"
    | "vdj_catalog";
  year: number | null;
  peak: number | null;
  weeks: number | null;
  artist: string;
  title: string;
  rvtr: string | null;
  graphTrackId: number | null;
  detail: string | null;
};

export type ReviewDiscoveryBundle = {
  focusYear: number;
  focusArtist: string;
  focusTitle: string;
  focusRvtr: string | null;
  sameArtistActiveYears: ReviewDiscoveryHit[];
  sameSongOtherYears: ReviewDiscoveryHit[];
  relatedAppearances: ReviewDiscoveryHit[];
  retroverseCatalog: ReviewDiscoveryHit[];
  vdjCatalog: ReviewDiscoveryHit[];
};

function normText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

type ChartHitRow = {
  chart_year: number;
  peak: number | null;
  weeks: number | null;
  artist: string;
  title: string;
  rvtr: string | null;
  graph_track_id: number;
};

const CHART_BY_ARTIST_SQL = `
  WITH chart_raw AS (
    SELECT
      extract(year from ca.chart_date)::int AS chart_year,
      ca.chart_position,
      t.id AS graph_track_id,
      ar.canonical_name AS artist,
      t.title AS title,
      nullif(upper(trim(ctd.track_id)), '') AS rvtr,
      lower(regexp_replace(trim(ar.canonical_name), '\\s+', ' ', 'g')) AS artist_norm,
      lower(regexp_replace(trim(t.title), '\\s+', ' ', 'g')) AS title_norm
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN canonical_track_versions ctv
      ON ctv.graph_track_id = t.id AND ctv.is_primary IS TRUE
    LEFT JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
    LEFT JOIN canonical_track_display ctd ON ctd.id = ct.id
    WHERE ca.chart_name = 'Billboard Hot 100'
      AND extract(year from ca.chart_date) = ANY($1::int[])
  ),
  chart_agg AS (
    SELECT
      chart_year,
      graph_track_id,
      max(artist) AS artist,
      max(title) AS title,
      max(rvtr) AS rvtr,
      min(chart_position)::int AS peak,
      count(DISTINCT chart_position)::int AS weeks
    FROM chart_raw
    WHERE artist_norm = $2
    GROUP BY chart_year, graph_track_id, title_norm
  )
  SELECT chart_year, peak, weeks, artist, title, rvtr, graph_track_id
  FROM chart_agg
  ORDER BY chart_year ASC, peak ASC NULLS LAST, title ASC
  LIMIT 40
`;

const CHART_SAME_SONG_SQL = `
  WITH chart_raw AS (
    SELECT
      extract(year from ca.chart_date)::int AS chart_year,
      ca.chart_position,
      t.id AS graph_track_id,
      ar.canonical_name AS artist,
      t.title AS title,
      nullif(upper(trim(ctd.track_id)), '') AS rvtr,
      lower(regexp_replace(trim(t.title), '\\s+', ' ', 'g')) AS title_norm
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN canonical_track_versions ctv
      ON ctv.graph_track_id = t.id AND ctv.is_primary IS TRUE
    LEFT JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
    LEFT JOIN canonical_track_display ctd ON ctd.id = ct.id
    WHERE ca.chart_name = 'Billboard Hot 100'
  ),
  chart_agg AS (
    SELECT
      chart_year,
      graph_track_id,
      max(artist) AS artist,
      max(title) AS title,
      max(rvtr) AS rvtr,
      min(chart_position)::int AS peak,
      count(DISTINCT chart_position)::int AS weeks,
      title_norm
    FROM chart_raw
    GROUP BY chart_year, graph_track_id, title_norm
  )
  SELECT chart_year, peak, weeks, artist, title, rvtr, graph_track_id
  FROM chart_agg
  WHERE title_norm = $1
    AND chart_year <> $2
  ORDER BY chart_year ASC, peak ASC NULLS LAST
  LIMIT 30
`;

const CHART_BY_RVTR_OR_TRACK_SQL = `
  WITH chart_raw AS (
    SELECT
      extract(year from ca.chart_date)::int AS chart_year,
      ca.chart_position,
      t.id AS graph_track_id,
      ar.canonical_name AS artist,
      t.title AS title,
      nullif(upper(trim(ctd.track_id)), '') AS rvtr
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN canonical_track_versions ctv
      ON ctv.graph_track_id = t.id AND ctv.is_primary IS TRUE
    LEFT JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
    LEFT JOIN canonical_track_display ctd ON ctd.id = ct.id
    WHERE ca.chart_name = 'Billboard Hot 100'
      AND (
        ($1::text IS NOT NULL AND upper(trim(ctd.track_id)) = upper(trim($1)))
        OR ($2::bigint IS NOT NULL AND t.id = $2)
      )
  ),
  chart_agg AS (
    SELECT
      chart_year,
      graph_track_id,
      max(artist) AS artist,
      max(title) AS title,
      max(rvtr) AS rvtr,
      min(chart_position)::int AS peak,
      count(*)::int AS weeks
    FROM chart_raw
    GROUP BY chart_year, graph_track_id
  )
  SELECT chart_year, peak, weeks, artist, title, rvtr, graph_track_id
  FROM chart_agg
  ORDER BY chart_year ASC, peak ASC NULLS LAST
  LIMIT 40
`;

const RETROVERSE_CATALOG_SQL = `
  SELECT
    upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
    ctd.canonical_title AS title,
    ctd.canonical_artist_name AS artist,
    ctd.peak_hot100_position AS peak_hot100
  FROM canonical_track_display ctd
  WHERE (
    lower(ctd.canonical_artist_name) LIKE '%' || $1 || '%'
    OR lower(ctd.canonical_title) LIKE '%' || $2 || '%'
    OR ($3::text IS NOT NULL AND (
      upper(trim(ctd.track_id)) = upper(trim($3))
      OR upper(trim(coalesce(ctd.retroverse_track_id, ''))) = upper(trim($3))
    ))
  )
  ORDER BY ctd.canonical_artist_name ASC, ctd.canonical_title ASC
  LIMIT 25
`;

function mapChartRow(
  row: ChartHitRow,
  kind: ReviewDiscoveryHit["kind"],
  detail?: string,
): ReviewDiscoveryHit {
  return {
    kind,
    year: row.chart_year,
    peak: row.peak,
    weeks: row.weeks,
    artist: row.artist,
    title: row.title,
    rvtr: row.rvtr,
    graphTrackId: row.graph_track_id,
    detail: detail ?? null,
  };
}

export async function loadReviewDiscovery(input: {
  year: number;
  artist: string;
  title: string;
  rvtr: string | null;
  graphTrackId: number | null;
}): Promise<ReviewDiscoveryBundle> {
  const artistNorm = normText(input.artist);
  const titleNorm = normText(input.title);
  const activeYears = [...REVIEW_PILOT_ACTIVE_YEARS] as number[];
  const rvtr = input.rvtr?.trim().toUpperCase() ?? null;

  const [byArtist, byTitle, byTrack, catalogRows, vdjHits] = await Promise.all([
    inspectQuery<ChartHitRow>(CHART_BY_ARTIST_SQL, [activeYears, artistNorm]),
    inspectQuery<ChartHitRow>(CHART_SAME_SONG_SQL, [titleNorm, input.year]),
    inspectQuery<ChartHitRow>(CHART_BY_RVTR_OR_TRACK_SQL, [
      rvtr,
      input.graphTrackId,
    ]),
    inspectQuery<{
      rvtr: string | null;
      title: string;
      artist: string;
      peak_hot100: number | null;
    }>(RETROVERSE_CATALOG_SQL, [artistNorm.slice(0, 60), titleNorm.slice(0, 60), rvtr]),
    searchVdjVideoLibrary(`${input.artist} ${input.title}`.trim()),
  ]);

  const sameArtistActiveYears = byArtist.map((r) =>
      mapChartRow(
        r,
        "same_artist_active_year",
        `Peak #${r.peak ?? "?"} in ${r.chart_year}`,
      ),
    );

  const sameSongOtherYears = byTitle.map((r) =>
    mapChartRow(r, "same_song_other_year", `Also charted in ${r.chart_year}`),
  );

  const relatedAppearances = byTrack.map((r) =>
    mapChartRow(
      r,
      "chart_appearance",
      r.chart_year === input.year ? "This focus year" : `Chart year ${r.chart_year}`,
    ),
  );

  const retroverseCatalog = catalogRows.map((r) => ({
    kind: "retroverse_catalog" as const,
    year: null,
    peak: r.peak_hot100,
    weeks: null,
    artist: r.artist,
    title: r.title,
    rvtr: r.rvtr,
    graphTrackId: null,
    detail: r.peak_hot100 != null ? `Hot 100 peak #${r.peak_hot100}` : "Canonical track",
  }));

  const vdjCatalog = vdjHits.map((h) => ({
    kind: "vdj_catalog" as const,
    year: h.vdjYear,
    peak: null,
    weeks: null,
    artist: h.artist,
    title: h.title,
    rvtr: null,
    graphTrackId: null,
    detail: h.filepath,
  }));

  return {
    focusYear: input.year,
    focusArtist: input.artist,
    focusTitle: input.title,
    focusRvtr: rvtr,
    sameArtistActiveYears,
    sameSongOtherYears,
    relatedAppearances,
    retroverseCatalog,
    vdjCatalog,
  };
}

export function pilotYearLabel(year: ReviewPilotYear): string {
  return String(year);
}
