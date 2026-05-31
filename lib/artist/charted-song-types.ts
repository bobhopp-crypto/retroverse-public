export type ArtistChartedSong = {
  rvtr: string;
  title: string;
  albumTitle: string | null;
  firstChartYear: number | null;
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
