import { inspectQuery } from "@/lib/inspect/pg";
import { opsVideoMediaAndClause } from "@/lib/ops/ops-video-media";
import type { VdjLibraryHit } from "@/lib/ops/vdj-search-types";
import {
  VDJ_SEARCH_MAX_RESULTS,
  VDJ_SEARCH_MIN_QUERY_LEN,
} from "@/lib/ops/vdj-search-constants";
import { parseVdjMetadataYear } from "@/lib/ops/year-authority";

export type { VdjLibraryHit } from "@/lib/ops/vdj-search-types";
export { VDJ_SEARCH_MAX_RESULTS, VDJ_SEARCH_MIN_QUERY_LEN } from "@/lib/ops/vdj-search-constants";

type SearchRow = {
  id: number;
  filename: string | null;
  source_path: string | null;
  directory_path: string | null;
  artist_text: string | null;
  title_text: string | null;
  year_text: string | null;
  file_extension: string | null;
  duration_seconds: number | null;
};

const VIDEO_FILTER = opsVideoMediaAndClause("ma");

function filepath(row: SearchRow): string {
  if (row.source_path?.trim()) return row.source_path.trim();
  if (row.directory_path?.trim() && row.filename?.trim()) {
    return `${row.directory_path.replace(/\/+$/, "")}/${row.filename}`;
  }
  return row.filename?.trim() || "—";
}

function mapRow(row: SearchRow): VdjLibraryHit {
  const path = filepath(row);
  return {
    mediaId: row.id,
    filename: row.filename,
    filepath: path,
    artist: row.artist_text?.trim() || "—",
    title: row.title_text?.trim() || row.filename?.trim() || "—",
    vdjYear: parseVdjMetadataYear(row.year_text, path),
    extension: row.file_extension?.trim().toLowerCase() || null,
    durationSeconds: row.duration_seconds,
  };
}

export async function searchVdjVideoLibrary(
  query: string,
): Promise<VdjLibraryHit[]> {
  const q = query.trim();
  if (q.length < VDJ_SEARCH_MIN_QUERY_LEN) return [];

  const rows = await inspectQuery<SearchRow>(
    `
    SELECT
      ma.id,
      ma.filename,
      ma.source_path,
      ma.directory_path,
      ma.artist_text,
      ma.title_text,
      ma.year_text,
      ma.file_extension,
      ma.duration_seconds
    FROM media_assets ma
    WHERE (
      lower(coalesce(ma.artist_text, '')) LIKE '%' || lower($1) || '%'
      OR lower(coalesce(ma.title_text, '')) LIKE '%' || lower($1) || '%'
      OR lower(coalesce(ma.filename, '')) LIKE '%' || lower($1) || '%'
      OR lower(coalesce(ma.source_path, '')) LIKE '%' || lower($1) || '%'
      OR lower(coalesce(ma.directory_path, '')) LIKE '%' || lower($1) || '%'
      OR lower(coalesce(ma.year_text, '')) LIKE '%' || lower($1) || '%'
    )
    ${VIDEO_FILTER}
    AND coalesce(ma.source_path, ma.directory_path, '') NOT ILIKE '%/MUSIC/%'
    AND coalesce(ma.source_path, ma.directory_path, '') NOT ILIKE '%karaoke%'
    AND coalesce(ma.source_path, ma.directory_path, '') NOT ILIKE '%scratch%'
    ORDER BY ma.updated_at DESC NULLS LAST
    LIMIT $2
    `,
    [q.slice(0, 80), VDJ_SEARCH_MAX_RESULTS],
  );

  return rows.map(mapRow);
}
