export type ArtistAlbumCard = {
  pgAlbumId: number;
  title: string;
  releaseYear: number | null;
  rval: string | null;
  b200Peak: number | null;
  coverUrl: string | null;
};

export type ArtistTrackCard = {
  rvtr: string;
  title: string;
  releaseYear: number | null;
  peakHot100: number | null;
  chartWeeks: number;
  coverUrl: string | null;
};

export type DominantYearBar = {
  year: number;
  count: number;
};

export type ChartDecadeBar = {
  decade: number;
  count: number;
};

/** Highest-ranked album on the album chart — facts only */
export type ChartAlbumSpotlight = {
  albumTitle: string;
  releaseYear: number | null;
  b200Peak: number | null;
  rval: string | null;
  coverUrl: string | null;
};

export type RelatedArtistCard = {
  artistId: number;
  name: string;
  /** Canonical numeric route token; retained as `slug` for view compatibility. */
  slug: string;
  coverUrl: string | null;
};

import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";

export type { ArtistChartHistory, ChartHistoryEntry } from "@/lib/artist/chart-history-types";

export type ArtistPageData = {
  slug: string;
  displayName: string;
  canonicalName: string;
  artistId: number;
  fileCode: string;
  heroImageUrl: string | null;
  activeRange: string;
  libraryTracks: number;
  libraryAlbums: number;
  essentialAlbums: ArtistAlbumCard[];
  signatureTracks: ArtistTrackCard[];
  dominantYears: DominantYearBar[];
  chartDecades: ChartDecadeBar[];
  /** True when Hot 100 year histogram has real rows (not a synthetic fallback). */
  hasDominantYearData: boolean;
  chartAlbumSpotlight: ChartAlbumSpotlight | null;
  chartHighlights: {
    hot100Appearances: number;
    b200Albums: number;
    top10Hits: number;
    top10Albums: number;
  };
  chartHistory: ArtistChartHistory | null;
  relatedArtists: RelatedArtistCard[];
  exploreLinks: { label: string; href: string }[];
};
