import { loadVdjMetaForPaths } from "@/lib/ops/rvtags-review/vdj-lookup";
import { isOpsPlayableVideoPath } from "@/lib/ops/ops-video-media";
import { loadVideoUniverseRows } from "@/lib/ops/year-workspace/load-video-universe";

import { loadSortingBoardState } from "./state";
import type { SortingBoardPayload, SortingSong } from "./types";

function normPath(p: string | null | undefined): string | null {
  if (!p?.trim()) return null;
  return p
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "/")
    .trim();
}

export async function loadSortingBoard(year: number): Promise<SortingBoardPayload> {
  const [rows, board] = await Promise.all([
    loadVideoUniverseRows(year),
    loadSortingBoardState(year),
  ]);

  const paths = rows
    .map((row) => normPath(row.sourcePath))
    .filter((p): p is string => p != null);
  const vdjByPath = await loadVdjMetaForPaths(paths);

  const songs: SortingSong[] = rows.map((row) => {
    const path = normPath(row.sourcePath);
    const vdj = path ? vdjByPath.get(path) : undefined;
    const playCount =
      typeof vdj?.playCount === "number" && Number.isFinite(vdj.playCount) ? vdj.playCount : 0;
    return {
      workspaceKey: row.workspaceKey,
      artist: row.artist?.trim() || "Unknown artist",
      title: row.title?.trim() || "Unknown title",
      playCount,
      previewPath:
        path && isOpsPlayableVideoPath(path) ? path : null,
    };
  });

  const bucketIds = new Set(board.buckets.map((b) => b.id));
  const counts = new Map<string, number>();
  for (const b of board.buckets) counts.set(b.id, 0);

  const assignments: Record<string, string> = {};
  for (const [key, bucketId] of Object.entries(board.assignments)) {
    if (!bucketIds.has(bucketId)) continue;
    assignments[key] = bucketId;
    counts.set(bucketId, (counts.get(bucketId) ?? 0) + 1);
  }

  return {
    ok: true,
    year,
    buckets: board.buckets.map((b) => ({
      ...b,
      count: counts.get(b.id) ?? 0,
    })),
    songs,
    assignments,
  };
}
