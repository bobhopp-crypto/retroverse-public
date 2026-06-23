import { loadSundayEventSongs } from "@/lib/sunday-nights/load-playlist";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import { normVdjPath } from "./vdj-database";
import type { VideoIdentityResult } from "./video-identification";

export type VideoPriorityContext = {
  sundayNightPaths: Set<string>;
  workspacePaths: Set<string>;
};

export type VideoPriorityScore = {
  score: number;
  playCount: number;
  recencyBoost: number;
  sundayNightsBoost: number;
  workspaceBoost: number;
  coverBoost: number;
  inSundayNights: boolean;
  inYearWorkspace: boolean;
};

function daysSince(isoDate: string | null | undefined): number | null {
  if (!isoDate?.trim()) return null;
  const ms = Date.parse(isoDate);
  if (!Number.isFinite(ms)) return null;
  return Math.floor((Date.now() - ms) / 86_400_000);
}

/** Load Sunday Nights + year-workspace VIDEO paths for priority scoring. */
export async function loadVideoPriorityContext(): Promise<VideoPriorityContext> {
  const sundayNightPaths = new Set<string>();
  const workspacePaths = new Set<string>();

  try {
    const sunday = await loadSundayEventSongs("all");
    for (const song of sunday.songs) {
      if (song.path?.trim()) sundayNightPaths.add(normVdjPath(song.path));
    }
  } catch {
    /* snapshots may be unavailable */
  }

  const ping = await inspectPing();
  if (ping.ok) {
    const rows = await inspectQuery<{ path_norm: string }>(
      `
      SELECT DISTINCT lower(replace(replace(coalesce(ma.source_path, ''), '\\', '/'), '//', '/')) AS path_norm
      FROM media_assets ma
      WHERE ma.source_path IS NOT NULL
        AND lower(ma.source_path) LIKE '%/video/%'
      `,
      [],
    );
    for (const row of rows) {
      if (row.path_norm) workspacePaths.add(row.path_norm);
    }
  }

  return { sundayNightPaths, workspacePaths };
}

/**
 * Priority score for intelligence queues.
 * Play count dominates; recency, Sunday Nights, workspace, and cover add boosts.
 */
export function computeVideoPriorityScore(
  identity: VideoIdentityResult,
  vdj: { playCount: number | null; lastPlayed: string | null },
  ctx: VideoPriorityContext,
): VideoPriorityScore {
  const playCount = vdj.playCount ?? identity.playCount ?? 0;
  const playBoost = playCount * 100;

  const days = daysSince(vdj.lastPlayed);
  const recencyBoost = days != null ? Math.max(0, 365 - days) * 2 : 0;

  const inSundayNights = ctx.sundayNightPaths.has(identity.filePathNorm);
  const inYearWorkspace = ctx.workspacePaths.has(identity.filePathNorm);
  const sundayNightsBoost = inSundayNights ? 500 : 0;
  const workspaceBoost = inYearWorkspace ? 200 : 0;
  const coverBoost = identity.hasCover ? 150 : 0;

  return {
    score: playBoost + recencyBoost + sundayNightsBoost + workspaceBoost + coverBoost,
    playCount,
    recencyBoost,
    sundayNightsBoost,
    workspaceBoost,
    coverBoost,
    inSundayNights,
    inYearWorkspace,
  };
}

export function sortByPriorityScore<T extends { priorityScore: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.priorityScore - a.priorityScore);
}
