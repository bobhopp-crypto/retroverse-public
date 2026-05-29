import { inspectQuery } from "@/lib/inspect/pg";
import { parseVdjMetadataYear } from "@/lib/ops/year-authority";
import { vdjPerformanceYearSql } from "@/lib/ops/vdj-performance-filter";

export type VdjPerformanceRow = {
  mediaId: number;
  artist: string;
  title: string;
  vdjYear: number | null;
  label: string;
  sourcePath: string | null;
  graphTrackId: number | null;
};

type MediaRow = {
  id: number;
  artist_text: string | null;
  title_text: string | null;
  year_text: string | null;
  source_path: string | null;
  directory_path: string | null;
  filename: string | null;
  graph_track_id: number | null;
};

function mediaLabel(row: MediaRow): string {
  const artist = row.artist_text?.trim() ?? "";
  const title = row.title_text?.trim() ?? row.filename?.trim() ?? "";
  if (artist && title) return `${artist} · ${title}`;
  return title || artist || row.filename?.trim() || `media-${row.id}`;
}

export async function loadVdjPerformanceUniverse(
  year: number,
): Promise<VdjPerformanceRow[]> {
  const rows = await inspectQuery<MediaRow>(
    `
    SELECT
      ma.id,
      ma.artist_text,
      ma.title_text,
      ma.year_text,
      ma.source_path,
      ma.directory_path,
      ma.filename,
      link.graph_track_id
    FROM media_assets ma
    LEFT JOIN LATERAL (
      SELECT mtl.track_id AS graph_track_id
      FROM media_track_links mtl
      WHERE mtl.media_asset_id = ma.id
      ORDER BY mtl.confidence_score DESC NULLS LAST, ma.updated_at DESC NULLS LAST
      LIMIT 1
    ) link ON true
    WHERE ma.id IS NOT NULL
    ${vdjPerformanceYearSql(year, "ma")}
    ORDER BY lower(coalesce(ma.artist_text, ma.filename)), lower(coalesce(ma.title_text, ma.filename))
    `,
    [],
  );

  return rows.map((row) => {
    const path = row.source_path ?? row.directory_path;
    return {
      mediaId: row.id,
      artist: (row.artist_text ?? "").trim() || "Unknown artist",
      title: (row.title_text ?? row.filename ?? "").trim() || "Untitled",
      vdjYear: parseVdjMetadataYear(row.year_text, path),
      label: mediaLabel(row),
      sourcePath: path,
      graphTrackId: row.graph_track_id,
    };
  });
}

export async function loadChartTrackIdsInPerformanceUniverse(
  year: number,
  graphTrackIds: number[],
): Promise<Set<number>> {
  if (graphTrackIds.length === 0) return new Set();

  const rows = await inspectQuery<{ track_id: number }>(
    `
    SELECT DISTINCT mtl.track_id::int AS track_id
    FROM media_track_links mtl
    JOIN media_assets ma ON ma.id = mtl.media_asset_id
    WHERE mtl.track_id = ANY($1::int[])
    ${vdjPerformanceYearSql(year, "ma")}
    `,
    [graphTrackIds],
  );

  return new Set(rows.map((r) => r.track_id));
}
