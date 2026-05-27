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
  /** Public entity route — `/album/...` */
  href?: string;
};

export type SongResult = {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  year: number;
  duration?: string;
  chartNote?: string;
  hasVdj?: boolean;
  coverAccent: string;
  coverUrl?: string;
  /** Public entity route — `/track/...` */
  href?: string;
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
  coverUrl?: string;
  /** Set for `kind: "artist"` — links to `/artist/[slug]` on retroverse.live */
  artistHref?: string;
  /** Same target as artistHref — used by discover cards */
  href?: string;
};

export type SearchPanels = {
  albums: AlbumResult[];
  songs: SongResult[];
  artistsCharts: ArtistChartResult[];
};

export type SearchCountPart = {
  value: number;
  label: string;
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
