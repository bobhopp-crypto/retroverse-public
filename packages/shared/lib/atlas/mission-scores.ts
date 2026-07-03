import type { RvTagId } from "@/lib/ops/rvtags-review/vocabulary";

const CROWD_TAG_IDS = new Set<RvTagId>([
  "SingAlong",
  "CrowdFavorite",
  "DanceFloor",
  "PartyStarter",
  "SlowDance",
  "TVFavorite",
]);

export type AlbumStats = {
  albumCount: number;
  albumWithCover: number;
};

export function scoreCoverFromAlbumStats(stats: AlbumStats): number {
  if (stats.albumWithCover > 0) return 1;
  if (stats.albumCount > 0) return 0.5;
  return 0;
}

export function scoreAlbumFromAlbumStats(stats: AlbumStats): number {
  if (stats.albumCount === 0) return 0;
  if (stats.albumCount >= 2 && stats.albumWithCover > 0) return 1;
  if (stats.albumWithCover > 0) return 0.75;
  return 0.4;
}

export function scoreCommentary(
  canonicalTags: RvTagId[],
  classification: string,
  classificationLocked: boolean,
  vdjUser2: string | null,
): number {
  const editorialTags = canonicalTags.filter((t) => !CROWD_TAG_IDS.has(t));
  if (editorialTags.length >= 2) return 1;
  if (editorialTags.length === 1) return 0.65;
  if (canonicalTags.length > 0) return 0.5;
  if (classificationLocked && classification !== "Fill") return 0.45;
  if (vdjUser2?.trim()) return 0.25;
  return 0;
}

export function completenessPct(scores: {
  coverScore: number;
  chartScore: number;
  albumScore: number;
  commentaryScore: number;
}): number {
  const avg =
    (scores.coverScore + scores.chartScore + scores.albumScore + scores.commentaryScore) / 4;
  return Math.round(avg * 100);
}

export function commentaryGapDone(
  commentaryScore: number,
  canonicalTags: RvTagId[],
): boolean {
  return commentaryScore >= 0.75 || canonicalTags.length >= 2;
}

export function albumGapDone(albumScore: number): boolean {
  return albumScore >= 0.75;
}
