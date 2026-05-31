export type ArtistChartedSong = {
  rvtr: string;
  title: string;
  albumTitle: string | null;
  firstChartYear: number | null;
  firstChartDate: string | null;
  peakHot100: number | null;
  chartWeeks: number;
  inLibrary: boolean;
  trackHref: string;
};

export type ArtistChartedSongsData = {
  slug: string;
  displayName: string;
  songs: ArtistChartedSong[];
};
