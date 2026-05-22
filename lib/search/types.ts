/** Future DB: map Supabase/export rows into these panel shapes. */

export type AlbumResult = {
  id: string;
  title: string;
  artist: string;
  year: number;
  chartNote?: string;
  hasVdj?: boolean;
  /** Placeholder cover block hue; optional real URL later */
  coverAccent: string;
  coverUrl?: string;
};

export type SongResult = {
  id: string;
  title: string;
  artist: string;
  year: number;
  chartNote?: string;
  hasVdj?: boolean;
  coverAccent: string;
  coverUrl?: string;
};

export type ArtistChartResult = {
  id: string;
  title: string;
  subtitle: string;
  year: number;
  chartNote?: string;
  kind: "artist" | "chart";
  hasVdj?: boolean;
  coverAccent: string;
};

export type SearchPanels = {
  albums: AlbumResult[];
  songs: SongResult[];
  artistsCharts: ArtistChartResult[];
};

/** @deprecated Flat list — use SearchPanels */
export type SearchResultKind = "artist" | "album" | "track";

/** @deprecated Flat list — use SearchPanels */
export type SearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  artist: string;
  year: number;
  chartNote?: string;
  hasVdj?: boolean;
};
