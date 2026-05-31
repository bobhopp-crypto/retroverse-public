import type { ArtistChartedSong } from "@/lib/artist/charted-song-types";

export type ArtistSongSortMode = "date" | "performance";

type SortableSong = Pick<
  ArtistChartedSong,
  "title" | "firstChartYear" | "peakHot100" | "chartWeeks"
> & {
  firstChartDate?: string | null;
};

export function sortChartedSongs<T extends SortableSong>(
  songs: T[],
  mode: ArtistSongSortMode,
): T[] {
  return mode === "date" ? sortChartedSongsByDate(songs) : sortChartedSongsByPerformance(songs);
}

/** Date order — first chart appearance, then title. */
export function sortChartedSongsByDate<T extends SortableSong>(songs: T[]): T[] {
  return [...songs].sort((a, b) => {
    const dateA = a.firstChartDate ?? "";
    const dateB = b.firstChartDate ?? "";
    if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;

    const yearA = a.firstChartYear ?? 9999;
    const yearB = b.firstChartYear ?? 9999;
    if (yearA !== yearB) return yearA - yearB;

    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}

/** Performance order — peak rank, then weeks, then title. */
export function sortChartedSongsByPerformance<T extends SortableSong>(songs: T[]): T[] {
  return [...songs].sort((a, b) => {
    const peakA = a.peakHot100 ?? 999;
    const peakB = b.peakHot100 ?? 999;
    if (peakA !== peakB) return peakA - peakB;
    if (b.chartWeeks !== a.chartWeeks) return b.chartWeeks - a.chartWeeks;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}

/** @deprecated Use sortChartedSongsByDate */
export const sortChartedSongsChronologically = sortChartedSongsByDate;

/** @deprecated Use sortChartedSongsByPerformance */
export const sortChartedSongsByPeak = sortChartedSongsByPerformance;
