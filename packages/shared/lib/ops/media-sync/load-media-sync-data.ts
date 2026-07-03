import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { opsVideoMediaAndClause } from "@/lib/ops/ops-video-media";
import { loadMediaSyncState } from "@/lib/ops/media-sync/media-sync-state";
import { mediaSyncSnapshotStatus } from "@/lib/ops/media-sync/snapshot-paths";
import type {
  MediaSyncConsoleData,
  MediaSyncRow,
  MediaSyncSummary,
} from "@/lib/ops/media-sync/types";

const QUEUE_LIMIT = 50;
const VIDEO_FILTER = opsVideoMediaAndClause("ma");
const VIDEO_BASE = `
  FROM media_assets ma
  WHERE coalesce(ma.source_path, ma.directory_path, '') NOT ILIKE '%/MUSIC/%'
    AND coalesce(ma.source_path, ma.directory_path, '') NOT ILIKE '%karaoke%'
    AND coalesce(ma.source_path, ma.directory_path, '') NOT ILIKE '%scratch%'
  ${VIDEO_FILTER}
`;

type MediaRow = {
  id: number;
  artist_text: string | null;
  title_text: string | null;
  source_path: string | null;
  directory_path: string | null;
  filename: string | null;
  file_size: number | null;
  r2_media_key: string | null;
  updated_at: string;
  link_count: number;
};

function formatTs(value: string): string {
  return value.length >= 19 ? value.slice(0, 19).replace("T", " ") : value;
}

function filepath(row: MediaRow): string {
  if (row.source_path?.trim()) return row.source_path.trim();
  if (row.directory_path?.trim() && row.filename?.trim()) {
    return `${row.directory_path.replace(/\/+$/, "")}/${row.filename}`;
  }
  return row.filename?.trim() || "—";
}

function mapRow(row: MediaRow, queuePrefix: string): MediaSyncRow {
  const path = filepath(row);
  return {
    id: `${queuePrefix}-${row.id}`,
    mediaId: row.id,
    filename: row.filename?.trim() || "—",
    filepath: path,
    artist: row.artist_text?.trim() || "—",
    title: row.title_text?.trim() || row.filename?.trim() || "—",
    fileSize: row.file_size != null ? Number(row.file_size) : null,
    modifiedAt: formatTs(row.updated_at),
    r2Key: row.r2_media_key?.trim() || null,
    linkage: row.link_count > 0 ? "linked" : "unlinked",
    linkCount: row.link_count,
  };
}

const SELECT_BODY = `
  SELECT
    ma.id,
    ma.artist_text,
    ma.title_text,
    ma.source_path,
    ma.directory_path,
    ma.filename,
    ma.file_size,
    ma.r2_media_key,
    ma.updated_at::text AS updated_at,
    (
      SELECT count(*)::int
      FROM media_track_links mtl
      WHERE mtl.media_asset_id = ma.id
    ) AS link_count
`;

export async function loadMediaSyncConsoleData(): Promise<MediaSyncConsoleData> {
  const ping = await inspectPing();
  const snapshot = mediaSyncSnapshotStatus();
  const state = await loadMediaSyncState();

  if (!ping.ok) {
    return {
      summary: {
        totalLocalVideo: 0,
        totalR2Keys: 0,
        matchedUploads: 0,
        missingOnR2: 0,
        localOnly: 0,
        r2Only: 0,
        unmatchedChartLinked: 0,
        lastRefreshAt: null,
        dataSource: "live_postgres",
        snapshotNote: snapshot.note,
      },
      queues: {
        missingOnR2: [],
        localNewVideos: [],
        r2Orphans: [],
        metadataDrift: [],
        uploadedUnmatched: [],
      },
      reviewedIds: state.reviewedIds,
      status: {
        pgOk: false,
        pgError: ping.error,
        partial: ["all queues"],
      },
    };
  }

  const [
    statsRows,
    missingOnR2,
    localNew,
    r2Orphans,
    metadataDrift,
    uploadedUnmatched,
  ] = await Promise.all([
    inspectQuery<{
      total_local: number;
      total_r2: number;
      matched: number;
      missing_r2: number;
      r2_only: number;
      unmatched_linked: number;
      last_refresh: string | null;
    }>(
      `
      SELECT
        count(*) FILTER (
          WHERE ma.source_path IS NOT NULL AND trim(ma.source_path) <> ''
        )::int AS total_local,
        count(*) FILTER (
          WHERE ma.r2_media_key IS NOT NULL AND trim(ma.r2_media_key) <> ''
        )::int AS total_r2,
        count(*) FILTER (
          WHERE ma.source_path IS NOT NULL AND trim(ma.source_path) <> ''
            AND ma.r2_media_key IS NOT NULL AND trim(ma.r2_media_key) <> ''
        )::int AS matched,
        count(*) FILTER (
          WHERE ma.source_path IS NOT NULL AND trim(ma.source_path) <> ''
            AND (ma.r2_media_key IS NULL OR trim(ma.r2_media_key) = '')
        )::int AS missing_r2,
        count(*) FILTER (
          WHERE (ma.r2_media_key IS NOT NULL AND trim(ma.r2_media_key) <> '')
            AND (ma.source_path IS NULL OR trim(ma.source_path) = '')
        )::int AS r2_only,
        count(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1 FROM media_track_links mtl WHERE mtl.media_asset_id = ma.id
          )
        )::int AS unmatched_linked,
        max(ma.updated_at)::text AS last_refresh
      ${VIDEO_BASE}
      `,
    ),
    inspectQuery<MediaRow>(
      `
      ${SELECT_BODY}
      ${VIDEO_BASE}
        AND ma.source_path IS NOT NULL AND trim(ma.source_path) <> ''
        AND (ma.r2_media_key IS NULL OR trim(ma.r2_media_key) = '')
      ORDER BY ma.updated_at DESC NULLS LAST
      LIMIT $1
      `,
      [QUEUE_LIMIT],
    ),
    inspectQuery<MediaRow>(
      `
      ${SELECT_BODY}
      ${VIDEO_BASE}
        AND ma.source_path IS NOT NULL AND trim(ma.source_path) <> ''
        AND ma.updated_at >= now() - interval '14 days'
      ORDER BY ma.updated_at DESC NULLS LAST
      LIMIT $1
      `,
      [QUEUE_LIMIT],
    ),
    inspectQuery<MediaRow>(
      `
      ${SELECT_BODY}
      ${VIDEO_BASE}
        AND (
          (ma.r2_media_key IS NOT NULL AND trim(ma.r2_media_key) <> '')
            AND (ma.source_path IS NULL OR trim(ma.source_path) = '')
        )
      ORDER BY ma.updated_at DESC NULLS LAST
      LIMIT $1
      `,
      [QUEUE_LIMIT],
    ),
    inspectQuery<MediaRow & { drift_note: string }>(
      `
      ${SELECT_BODY},
      'local+r2, weak linkage/metadata' AS drift_note
      ${VIDEO_BASE}
        AND ma.source_path IS NOT NULL AND trim(ma.source_path) <> ''
        AND ma.r2_media_key IS NOT NULL AND trim(ma.r2_media_key) <> ''
        AND (
          ma.file_size IS NULL
          OR ma.content_hash IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM media_track_links mtl WHERE mtl.media_asset_id = ma.id
          )
        )
      ORDER BY ma.updated_at DESC NULLS LAST
      LIMIT $1
      `,
      [QUEUE_LIMIT],
    ),
    inspectQuery<MediaRow>(
      `
      ${SELECT_BODY}
      ${VIDEO_BASE}
        AND ma.source_path IS NOT NULL AND trim(ma.source_path) <> ''
        AND ma.r2_media_key IS NOT NULL AND trim(ma.r2_media_key) <> ''
        AND NOT EXISTS (
          SELECT 1 FROM media_track_links mtl WHERE mtl.media_asset_id = ma.id
        )
      ORDER BY ma.updated_at DESC NULLS LAST
      LIMIT $1
      `,
      [QUEUE_LIMIT],
    ),
  ]);

  const s = statsRows[0];
  const summary: MediaSyncSummary = {
    totalLocalVideo: s?.total_local ?? 0,
    totalR2Keys: s?.total_r2 ?? 0,
    matchedUploads: s?.matched ?? 0,
    missingOnR2: s?.missing_r2 ?? 0,
    localOnly: s?.missing_r2 ?? 0,
    r2Only: s?.r2_only ?? 0,
    unmatchedChartLinked: s?.unmatched_linked ?? 0,
    lastRefreshAt: s?.last_refresh
      ? s.last_refresh.slice(0, 19).replace("T", " ")
      : null,
    dataSource: "live_postgres",
    snapshotNote: snapshot.note,
  };

  return {
    summary,
    queues: {
      missingOnR2: missingOnR2.map((r) => mapRow(r, "missing-r2")),
      localNewVideos: localNew.map((r) => mapRow(r, "local-new")),
      r2Orphans: r2Orphans.map((r) => mapRow(r, "r2-orphan")),
      metadataDrift: metadataDrift.map((r) => ({
        ...mapRow(r, "drift"),
        driftNote: r.drift_note,
      })),
      uploadedUnmatched: uploadedUnmatched.map((r) => mapRow(r, "upload-unmatched")),
    },
    reviewedIds: state.reviewedIds,
    status: {
      pgOk: true,
      partial: [
        "live Postgres queries (not snapshot files yet)",
        "R2 inventory = media_assets.r2_media_key index (no separate R2 crawl)",
        "metadata drift = lightweight heuristics (no checksum)",
        "mark reviewed persists locally only",
      ],
    },
  };
}
