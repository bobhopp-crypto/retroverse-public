import "server-only";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { normalizeRvtr } from "@/lib/studio/status";

export type MediaLinkRow = {
  mediaId: number;
  filename: string | null;
  sourcePath: string | null;
  artistText: string | null;
  titleText: string | null;
  yearText: string | null;
  fileExtension: string | null;
  durationSeconds: number | null;
};

/**
 * Read-only Postgres lookup: media_assets linked toward a canonical RVTR.
 * Join path mirrors video-identification (graph track → canonical display).
 */
export async function loadMediaLinksForRvtr(rvtrInput: string): Promise<MediaLinkRow[]> {
  const rvtr = normalizeRvtr(rvtrInput);
  if (!rvtr) return [];

  const ping = await inspectPing();
  if (!ping.ok) {
    throw new Error(ping.error ?? "Postgres offline");
  }

  const rows = await inspectQuery<{
    id: number;
    filename: string | null;
    source_path: string | null;
    artist_text: string | null;
    title_text: string | null;
    year_text: string | null;
    file_extension: string | null;
    duration_seconds: number | null;
  }>(
    `
    SELECT DISTINCT ON (ma.id)
      ma.id,
      ma.filename,
      ma.source_path,
      ma.artist_text,
      ma.title_text,
      ma.year_text,
      ma.file_extension,
      ma.duration_seconds
    FROM media_assets ma
    INNER JOIN media_track_links mtl ON mtl.media_asset_id = ma.id
    INNER JOIN tracks t ON t.id = mtl.track_id::int
    INNER JOIN canonical_track_versions ctv
      ON ctv.graph_track_id = t.id AND ctv.is_primary IS TRUE
    INNER JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
    INNER JOIN canonical_track_display ctd ON ctd.id = ct.id
    WHERE upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))) = $1
    ORDER BY ma.id, mtl.confidence_score DESC NULLS LAST
    LIMIT 50
    `,
    [rvtr],
  );

  return rows.map((row) => ({
    mediaId: row.id,
    filename: row.filename,
    sourcePath: row.source_path,
    artistText: row.artist_text,
    titleText: row.title_text,
    yearText: row.year_text,
    fileExtension: row.file_extension,
    durationSeconds: row.duration_seconds,
  }));
}
