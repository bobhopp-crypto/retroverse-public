import { ensureUniqueRowIds } from "@/lib/ops/ensure-unique-ids";
import {
  acquisitionPriority,
  deriveMatchStatus,
  importanceScoreFromPeak,
} from "@/lib/ops/match-status";
import type { AcquisitionRow, YearMatchRow } from "@/lib/ops/reconciliation-model";
import { inspectQuery } from "@/lib/inspect/pg";
import { opsVideoMediaAndClause } from "@/lib/ops/ops-video-media";
import {
  chartYearFromBillboardFilter,
  parseVdjMetadataYear,
} from "@/lib/ops/year-authority";

const OPS_VIDEO_MA = opsVideoMediaAndClause("ma");
const OPS_VIDEO_MA_V = opsVideoMediaAndClause("ma_v");

const DEFAULT_YEAR = 1967;

type ChartYearRow = {
  graph_track_id: number;
  chart_title: string;
  chart_artist: string;
  peak: number | null;
  weeks: number | null;
  first_chart_date: string | null;
  last_chart_date: string | null;
  chart_source: string;
  rvtr: string | null;
  has_vdj_media: boolean | null;
  has_video: boolean | null;
  best_match_label: string | null;
  link_confidence: number | null;
  release_year: number | null;
  best_match_year_text: string | null;
  best_match_source_path: string | null;
};

export async function loadYearMatchConsole(
  year: number = DEFAULT_YEAR,
): Promise<YearMatchRow[]> {
  const rows = await inspectQuery<ChartYearRow>(
    `
    WITH chart_raw AS (
      SELECT
        ca.chart_date,
        ca.chart_position,
        t.id AS graph_track_id,
        t.title AS chart_title,
        ar.canonical_name AS chart_artist,
        nullif(trim(ctd.track_id), '') AS rvtr,
        lower(regexp_replace(trim(ar.canonical_name), '\\s+', ' ', 'g')) AS artist_norm,
        lower(regexp_replace(trim(t.title), '\\s+', ' ', 'g')) AS title_norm,
        coalesce(
          nullif(trim(ctd.track_id), ''),
          'norm:' || lower(regexp_replace(trim(ar.canonical_name), '\\s+', ' ', 'g'))
            || '|' || lower(regexp_replace(trim(t.title), '\\s+', ' ', 'g'))
        ) AS song_key
      FROM chart_appearances ca
      JOIN tracks t ON t.id = ca.track_id
      JOIN artists ar ON ar.id = t.artist_id
      LEFT JOIN canonical_track_versions ctv
        ON ctv.graph_track_id = t.id AND ctv.is_primary IS TRUE
      LEFT JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
      LEFT JOIN canonical_track_display ctd ON ctd.id = ct.id
      WHERE ca.chart_name = 'Billboard Hot 100'
        AND extract(year from ca.chart_date) = $1
    ),
    chart_agg AS (
      SELECT
        song_key,
        min(chart_position)::int AS peak,
        count(DISTINCT chart_date)::int AS weeks,
        min(chart_date)::text AS first_chart_date,
        max(chart_date)::text AS last_chart_date
      FROM chart_raw
      GROUP BY song_key
    ),
    chart_rep AS (
      SELECT DISTINCT ON (cr.song_key)
        cr.song_key,
        cr.graph_track_id,
        cr.chart_title,
        cr.chart_artist,
        cr.rvtr
      FROM chart_raw cr
      ORDER BY cr.song_key, cr.chart_position ASC NULLS LAST, cr.chart_date ASC
    )
    SELECT
      rep.graph_track_id,
      rep.chart_title,
      rep.chart_artist,
      agg.peak,
      agg.weeks,
      agg.first_chart_date,
      agg.last_chart_date,
      'Billboard Hot 100' AS chart_source,
      rep.rvtr,
      EXISTS (
        SELECT 1
        FROM media_track_links mtl_v
        JOIN media_assets ma_v ON ma_v.id = mtl_v.media_asset_id
        WHERE mtl_v.track_id = rep.graph_track_id
        ${OPS_VIDEO_MA_V}
      ) AS has_vdj_media,
      EXISTS (
        SELECT 1
        FROM media_track_links mtl_v
        JOIN media_assets ma_v ON ma_v.id = mtl_v.media_asset_id
        WHERE mtl_v.track_id = rep.graph_track_id
        ${OPS_VIDEO_MA_V}
      ) AS has_video,
      best.best_match_label,
      best.link_confidence,
      extract(year from ctd.first_chart_date)::int AS release_year,
      best.best_match_year_text,
      best.best_match_source_path
    FROM chart_rep rep
    JOIN chart_agg agg ON agg.song_key = rep.song_key
    LEFT JOIN canonical_track_versions ctv
      ON ctv.graph_track_id = rep.graph_track_id AND ctv.is_primary IS TRUE
    LEFT JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
    LEFT JOIN canonical_track_display ctd ON ctd.id = ct.id
    LEFT JOIN LATERAL (
      SELECT
        trim(concat(
          coalesce(ma.artist_text, ''),
          CASE
            WHEN ma.title_text IS NOT NULL AND ma.title_text <> '' THEN ' · '
            ELSE ''
          END,
          coalesce(ma.title_text, ma.filename, '')
        )) AS best_match_label,
        mtl.confidence_score AS link_confidence,
        ma.year_text AS best_match_year_text,
        ma.source_path AS best_match_source_path
      FROM media_track_links mtl
      JOIN media_assets ma ON ma.id = mtl.media_asset_id
      WHERE mtl.track_id = rep.graph_track_id
      ${OPS_VIDEO_MA}
      ORDER BY mtl.confidence_score DESC NULLS LAST, ma.updated_at DESC NULLS LAST
      LIMIT 1
    ) best ON true
    ORDER BY agg.peak ASC NULLS LAST, agg.weeks DESC NULLS LAST, rep.chart_title
    `,
    [year],
  );

  const chartYear = chartYearFromBillboardFilter(year);

  const mapped: YearMatchRow[] = rows.map((row) => {
    const peak = row.peak;
    const weeks = row.weeks ?? 0;
    const vdjYear = parseVdjMetadataYear(
      row.best_match_year_text,
      row.best_match_source_path,
    );
    const { status, confidence } = deriveMatchStatus({
      hasVdjMedia: row.has_vdj_media === true,
      hasVideo: row.has_video === true,
      bestMatch: row.best_match_label,
      linkConfidence: row.link_confidence,
    });

    return {
      id: `ym-${year}-${row.graph_track_id}`,
      chartItemId: `chart-track-${row.graph_track_id}`,
      graphTrackId: row.graph_track_id,
      rvtr: row.rvtr,
      artist: row.chart_artist.trim(),
      title: row.chart_title.trim(),
      year: chartYear,
      chartYear,
      releaseYear: row.release_year,
      vdjYear,
      performanceYear: null,
      editorialYear: null,
      chartSource: row.chart_source,
      peak,
      weeks,
      firstChartDate: row.first_chart_date,
      lastChartDate: row.last_chart_date,
      importanceScore: importanceScoreFromPeak(peak, weeks),
      displayRank: peak,
      matchStatus: status,
      confidence,
      bestMatch: row.best_match_label,
      manualOverride: false,
      notes: null,
      mediaId: null,
      label: row.best_match_label,
      hasVdjMedia: row.has_vdj_media === true,
      hasVideo: row.has_video === true,
      hasR2: false,
      sourcePath: row.best_match_source_path?.trim() || null,
    };
  });

  return ensureUniqueRowIds(mapped);
}

export function acquisitionFromYearMatch(
  yearMatch: YearMatchRow[],
  limit = 50,
): AcquisitionRow[] {
  const candidates = yearMatch.filter(
    (r) => r.matchStatus === "missing" || r.matchStatus === "needs_review",
  );

  const rows: AcquisitionRow[] = candidates
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, limit)
    .map((row) => ({
      id: `acq-${row.chartItemId}`,
      chartItemId: row.chartItemId,
      artist: row.artist,
      title: row.title,
      year: row.chartYear,
      priority: acquisitionPriority(row.peak),
      peak: row.peak,
      acquisitionStatus: "queued" as const,
      rvtr: row.rvtr,
    }));

  return ensureUniqueRowIds(rows);
}
