import { inspectQuery } from "@/lib/inspect/pg";
import type { OpsQueueMissingVideoRow } from "@/lib/ops/types";

const LIMIT = 40;

const VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "mkv", "avi", "webm"];

type MediaVideoRow = {
  id: number;
  artist_text: string | null;
  title_text: string | null;
  year_text: string | null;
  source_path: string | null;
  directory_path: string | null;
  filename: string | null;
  file_size: number | null;
  r2_media_key: string | null;
  updated_at: string;
};

function parseYear(yearText: string | null): number | null {
  if (!yearText?.trim()) return null;
  const y = Number(yearText.trim().slice(0, 4));
  return Number.isFinite(y) && y > 1900 && y < 2100 ? y : null;
}

function localPath(row: MediaVideoRow): string {
  if (row.source_path?.trim()) return row.source_path.trim();
  if (row.directory_path?.trim() && row.filename?.trim()) {
    return `${row.directory_path.replace(/\/+$/, "")}/${row.filename}`;
  }
  return row.filename?.trim() || "—";
}

function formatTs(value: string): string {
  return value.length >= 19 ? value.slice(0, 19).replace("T", " ") : value;
}

export async function loadVideoUploadQueue(): Promise<{
  rows: OpsQueueMissingVideoRow[];
  partial: boolean;
  note?: string;
}> {
  const extList = VIDEO_EXTENSIONS.map((e) => `'${e}'`).join(", ");

  const [localOnly, r2Only] = await Promise.all([
    inspectQuery<MediaVideoRow>(
      `
      SELECT
        ma.id,
        ma.artist_text,
        ma.title_text,
        ma.year_text,
        ma.source_path,
        ma.directory_path,
        ma.filename,
        ma.file_size,
        ma.r2_media_key,
        ma.updated_at::text AS updated_at
      FROM media_assets ma
      WHERE ma.source_path IS NOT NULL
        AND trim(ma.source_path) <> ''
        AND (ma.r2_media_key IS NULL OR trim(ma.r2_media_key) = '')
        AND lower(coalesce(ma.file_extension, '')) IN (${extList})
      ORDER BY ma.updated_at DESC NULLS LAST
      LIMIT $1
      `,
      [LIMIT],
    ),
    inspectQuery<MediaVideoRow>(
      `
      SELECT
        ma.id,
        ma.artist_text,
        ma.title_text,
        ma.year_text,
        ma.source_path,
        ma.directory_path,
        ma.filename,
        ma.file_size,
        ma.r2_media_key,
        ma.updated_at::text AS updated_at
      FROM media_assets ma
      WHERE ma.r2_media_key IS NOT NULL
        AND trim(ma.r2_media_key) <> ''
        AND (ma.source_path IS NULL OR trim(ma.source_path) = '')
        AND lower(coalesce(ma.file_extension, '')) IN (${extList})
      ORDER BY ma.updated_at DESC NULLS LAST
      LIMIT $1
      `,
      [Math.min(15, LIMIT)],
    ),
  ]);

  const rows: OpsQueueMissingVideoRow[] = [];

  for (const row of localOnly) {
    rows.push({
      id: `vid-local-${row.id}`,
      artist: row.artist_text?.trim() || "—",
      title: row.title_text?.trim() || row.filename?.trim() || "—",
      year: parseYear(row.year_text),
      localPath: localPath(row),
      r2Status: "local_only",
      localBytes: Number(row.file_size ?? 0),
      r2Bytes: null,
      modifiedAt: formatTs(row.updated_at),
    });
  }

  for (const row of r2Only) {
    rows.push({
      id: `vid-r2-${row.id}`,
      artist: row.artist_text?.trim() || "—",
      title: row.title_text?.trim() || row.filename?.trim() || "—",
      year: parseYear(row.year_text),
      localPath: row.r2_media_key?.trim() || "—",
      r2Status: "r2_only",
      localBytes: 0,
      r2Bytes: row.file_size ?? null,
      modifiedAt: formatTs(row.updated_at),
    });
  }

  return {
    rows: rows.slice(0, LIMIT),
    partial: true,
    note:
      r2Only.length === 0
        ? "Detection stub: local-only video rows from media_assets (no byte-level R2 sync yet)."
        : "Detection stub: local-only and R2-only video rows from media_assets.",
  };
}
