import type { WeeklyRefreshStatus } from "@/lib/ops/reconciliation-model";
import { inspectQuery } from "@/lib/inspect/pg";

const VIDEO_EXT = ["mp4", "mov", "m4v", "mkv", "avi", "webm"];

export async function loadWeeklyRefreshStatus(): Promise<WeeklyRefreshStatus> {
  const extList = VIDEO_EXT.map((e) => `'${e}'`).join(", ");

  const [snapshotRows, newVideoRows, missingR2Rows, unmatchedRows] = await Promise.all([
    inspectQuery<{ last_snapshot: string | null }>(
      `SELECT max(updated_at)::text AS last_snapshot FROM media_assets`,
    ),
    inspectQuery<{ count: number }>(
      `
      SELECT count(*)::int AS count
      FROM media_assets ma
      WHERE ma.updated_at >= now() - interval '7 days'
        AND lower(coalesce(ma.file_extension, '')) IN (${extList})
      `,
    ),
    inspectQuery<{ count: number }>(
      `
      SELECT count(*)::int AS count
      FROM media_assets ma
      WHERE ma.source_path IS NOT NULL AND trim(ma.source_path) <> ''
        AND (ma.r2_media_key IS NULL OR trim(ma.r2_media_key) = '')
        AND lower(coalesce(ma.file_extension, '')) IN (${extList})
      `,
    ),
    inspectQuery<{ count: number }>(
      `
      SELECT count(*)::int AS count
      FROM media_assets ma
      WHERE NOT EXISTS (
        SELECT 1 FROM media_track_links mtl WHERE mtl.media_asset_id = ma.id
      )
      `,
    ),
  ]);

  const lastVdjSnapshot = snapshotRows[0]?.last_snapshot;
  const missingR2 = missingR2Rows[0]?.count ?? 0;
  const unmatched = unmatchedRows[0]?.count ?? 0;

  let lastRefreshResult: WeeklyRefreshStatus["lastRefreshResult"] = "ok";
  let lastRefreshNote = "VDJ inventory snapshot readable from Postgres.";
  if (missingR2 > 500 || unmatched > 1000) {
    lastRefreshResult = "warn";
    lastRefreshNote = "Large backlog: local video not on R2 and/or unmatched media rows.";
  }

  return {
    lastVdjSnapshot: lastVdjSnapshot
      ? lastVdjSnapshot.slice(0, 19).replace("T", " ")
      : null,
    newVideosDetected: newVideoRows[0]?.count ?? 0,
    metadataChanges: 0,
    missingR2Uploads: missingR2,
    unmatchedMedia: unmatched,
    lastRefreshResult,
    lastRefreshNote,
  };
}
