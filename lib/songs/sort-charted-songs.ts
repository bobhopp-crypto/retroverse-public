import type { ArtistChartedSong } from "@/lib/artist/charted-song-types";

/** Exhibit storytelling order — first chart appearance, then title. */
export function sortChartedSongsChronologically(
  songs: ArtistChartedSong[],
): ArtistChartedSong[] {
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

/** Songs exploration view — peak rank, then weeks, then title. */
export function sortChartedSongsByPeak(songs: ArtistChartedSong[]): ArtistChartedSong[] {
  return [...songs].sort((a, b) => {
    const peakA = a.peakHot100 ?? 999;
    const peakB = b.peakHot100 ?? 999;
    if (peakA !== peakB) return peakA - peakB;
    if (b.chartWeeks !== a.chartWeeks) return b.chartWeeks - a.chartWeeks;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}
