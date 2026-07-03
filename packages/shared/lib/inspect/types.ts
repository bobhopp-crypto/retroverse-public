export type InspectAlbumRow = {
  pgAlbumId: number;
  title: string;
  releaseYear: number | null;
  rval: string | null;
  sequenceTracks: number;
  b200Peak: number | null;
  b200Weeks: number | null;
  coverStatus: "ok" | "path_only" | "missing";
  coverDetail: string | null;
};

export type InspectTrackRow = {
  rvtr: string;
  title: string;
  peakHot100: number | null;
  chartWeeks: number;
  charted: boolean;
  inLibrary: boolean;
  hasVideo: boolean;
};

export type InspectChartRow = {
  chartName: string;
  chartDate: string;
  position: number;
  weeksOnChart: number | null;
  trackTitle: string;
};

export type InspectResolved = {
  kind: "artist" | "none" | "ambiguous";
  artistId?: number;
  canonicalName?: string;
  matchType?: "exact" | "fuzzy";
  candidates?: { id: number; name: string }[];
};

export type InspectPayload = {
  ok: boolean;
  q: string;
  devOnly: true;
  db: { connected: boolean; error?: string };
  resolved: InspectResolved;
  summary: {
    albumsFound: number;
    tracksFound: number;
    chartedTracks: number;
    inLibraryTracks: number;
    missingRvalAlbums: number;
    missingCoverAlbums: number;
  };
  albums: InspectAlbumRow[];
  tracks: InspectTrackRow[];
  chartAppearances: InspectChartRow[];
  debugNotes: string[];
  homeSearchCompare?: {
    artistNames: string[];
    albumCount: number;
    trackCount: number;
    incomplete?: boolean;
    error?: string;
  };
};
