import { sortChartedSongsByPerformance } from "@/lib/songs/sort-charted-songs";

export type LibraryShelfSong = {
  title: string;
  peakHot100: number | null;
  chartWeeks: number;
  firstChartYear: number | null;
  firstChartDate?: string | null;
  coverageStatus: string;
};

/**
 * Owned songs for In Your Retroverse.
 * The featured top slice is a separate list. Owned songs outside that slice stay here.
 * The rendered count is this array's length — no second preview cap.
 */
export function inYourRetroverseSongs<T extends LibraryShelfSong>(songs: readonly T[]): T[] {
  return sortChartedSongsByPerformance(songs.filter((song) => song.coverageStatus === "owned"));
}
