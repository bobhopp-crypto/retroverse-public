import type { SongPackageStatus } from "@/lib/ops/intelligence/song-package-types";

/** Package statuses that allow patron Song Experience rendering (matches loadPerformanceDeck). */
export const SONG_EXPERIENCE_RENDERABLE_STATUSES = new Set<SongPackageStatus>([
  "published",
  "review",
]);

export function isSongExperienceRenderable(
  status: SongPackageStatus | string | null | undefined,
): boolean {
  if (!status) return false;
  return SONG_EXPERIENCE_RENDERABLE_STATUSES.has(status as SongPackageStatus);
}
