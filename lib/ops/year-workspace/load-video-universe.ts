import { inspectQuery } from "@/lib/inspect/pg";
import { parseVdjMetadataYear } from "@/lib/ops/year-authority";
import { vdjPerformanceYearSql } from "@/lib/ops/vdj-performance-filter";

import { enrichYearWorkspaceRows } from "./enrich-vdj-meta";
import { normalizeGraphTrackId } from "./graph-track-id";
import { chartWorkspaceKey, videoUniverseWorkspaceKey } from "./keys";
import type { YearWorkspaceStateFile } from "./state";
import type { YearReviewEnrichmentMetrics } from "./enrich-vdj-meta";
import type { YearWorkspaceRow } from "./types";
type VideoUniverseDbRow = {
  media_id: number;
  artist_text: string | null;
  title_text: string | null;
  filename: string | null;
  source_path: string | null;
  directory_path: string | null;
  year_text: string | null;
  graph_track_id: number | null;
  link_confidence: number | null;
  chart_artist: string | null;
  chart_title: string | null;
  chart_peak: number | null;
  chart_weeks: number | null;
  rvtr: string | null;
};

function videoUniverseQuery(year: number): string {
  const perf = vdjPerformanceYearSql(year, "ma");
  return `
    SELECT
      ma.id AS media_id,
      ma.artist_text,
      ma.title_text,
      ma.filename,
      ma.source_path,
      ma.directory_path,
      ma.year_text,
      link.graph_track_id,
      link.link_confidence,
      chart.chart_artist,
      chart.chart_title,
      chart.chart_peak,
      chart.chart_weeks,
      chart.rvtr
    FROM media_assets ma
    LEFT JOIN LATERAL (
      SELECT
        mtl.track_id::int AS graph_track_id,
        mtl.confidence_score AS link_confidence
      FROM media_track_links mtl
      WHERE mtl.media_asset_id = ma.id
      ORDER BY mtl.confidence_score DESC NULLS LAST
      LIMIT 1
    ) link ON true
    LEFT JOIN LATERAL (
      SELECT
        ar.canonical_name AS chart_artist,
        t.title AS chart_title,
        agg.peak AS chart_peak,
        agg.weeks AS chart_weeks,
        nullif(upper(trim(ctd.track_id)), '') AS rvtr
      FROM tracks t
      JOIN artists ar ON ar.id = t.artist_id
      LEFT JOIN canonical_track_versions ctv
        ON ctv.graph_track_id = t.id AND ctv.is_primary IS TRUE
      LEFT JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
      LEFT JOIN canonical_track_display ctd ON ctd.id = ct.id
      JOIN LATERAL (
        SELECT
          min(ca.chart_position)::int AS peak,
          count(DISTINCT ca.chart_date)::int AS weeks
        FROM chart_appearances ca
        WHERE ca.chart_name = 'Billboard Hot 100'
          AND ca.track_id = t.id
          AND extract(year from ca.chart_date) = ${year}
      ) agg ON true
      WHERE link.graph_track_id IS NOT NULL
        AND t.id = link.graph_track_id
        AND agg.peak IS NOT NULL
    ) chart ON true
    WHERE ma.id IS NOT NULL
    ${perf}
    ORDER BY lower(coalesce(ma.artist_text, ma.filename)), lower(coalesce(ma.title_text, ma.filename))
  `;
}

function mediaPath(row: VideoUniverseDbRow): string | null {
  return row.source_path?.trim() || row.directory_path?.trim() || null;
}

function dbRowToWorkspace(row: VideoUniverseDbRow, year: number): YearWorkspaceRow {
  const path = mediaPath(row);
  const graphTrackId = normalizeGraphTrackId(row.graph_track_id);
  const hasChartLink = graphTrackId != null;

  const artist =
    row.artist_text?.trim() ||
    row.chart_artist?.trim() ||
    "Unknown artist";
  const title =
    row.title_text?.trim() ||
    row.filename?.trim() ||
    row.chart_title?.trim() ||
    "Untitled";

  /** One key per media file — never chart-track (multiple videos can share a graph link). */
  const workspaceKey = videoUniverseWorkspaceKey(row.media_id);

  return {
    id: `vu-${row.media_id}`,
    workspaceKey,
    bucket: hasChartLink ? "in_both" : "vdj_only",
    artist,
    title,
    matchStatus: hasChartLink ? "matched" : "missing",
    peak: row.chart_peak,
    weeks: row.chart_weeks,
    keywords: [],
    workflowAction: null,
    reviewReason: null,
    chartItemId: hasChartLink ? `chart-track-${graphTrackId}` : null,
    graphTrackId,
    rvtr: row.rvtr,
    mediaId: row.media_id,
    vdjLabel: `${artist} · ${title}`,
    vdjYear: parseVdjMetadataYear(row.year_text, path),
    sourcePath: path,
    bestMatch: hasChartLink ? `${artist} · ${title}` : null,
    playCount: null,
    vdjUser2Raw: null,
    historicalTags: [],
    historicalTagsFromVdj: false,
    classification: "Fill",
    classificationAutoPromoted: false,
    vdjMatch: hasChartLink ? "matched" : "missing",
    ownership: "video",
    retroverseTagsSource: "none",
  };
}

export async function loadVideoUniverseRows(
  year: number,
): Promise<YearWorkspaceRow[]> {
  const rows = await inspectQuery<VideoUniverseDbRow>(videoUniverseQuery(year), []);
  return rows.map((r) => dbRowToWorkspace(r, year));
}

export type VideoUniverseBundle = {
  year: number;
  videoUniverseCount: number;
  chartLinkedCount: number;
  videoOnlyCount: number;
  reviewRows: YearWorkspaceRow[];
  reviewMetrics: YearReviewEnrichmentMetrics;
};

export async function loadVideoUniverse(
  year: number,
  reviewState: YearWorkspaceStateFile,
): Promise<VideoUniverseBundle> {
  const base = await loadVideoUniverseRows(year);
  const { rows: reviewRows, metrics } = await enrichYearWorkspaceRows(base, reviewState);

  let chartLinkedCount = 0;
  let videoOnlyCount = 0;
  for (const row of reviewRows) {
    if (row.graphTrackId != null) chartLinkedCount += 1;
    else videoOnlyCount += 1;
  }

  return {
    year,
    videoUniverseCount: reviewRows.length,
    chartLinkedCount,
    videoOnlyCount,
    reviewRows,
    reviewMetrics: metrics,
  };
}
