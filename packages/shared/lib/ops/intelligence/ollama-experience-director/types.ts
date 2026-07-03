/** Ollama Experience Director — pilot types (ops-only, not patron-facing). */

export type PublicReadiness = "ready" | "needs_more_research" | "not_ready";

export type DirectorChapterType =
  | "story"
  | "chart"
  | "video"
  | "album"
  | "artist"
  | "discovery";

export type DirectorChapter = {
  type: DirectorChapterType;
  title: string;
  body: string;
  whyIncluded: string;
  sourceMaterial: string[];
};

export type DirectorDiscoveryShelf = {
  title: string;
  items: string[];
  whyThisShelfMatters: string;
};

export type DirectorSongOutput = {
  rvtr: string;
  title: string;
  artist: string;
  publicReadiness: PublicReadiness;
  bestAngle: string;
  omitReasons: string[];
  heroNote: string;
  chapters: DirectorChapter[];
  discoveryShelves: DirectorDiscoveryShelf[];
  doNotShow: string[];
  missingData: string[];
  qualityNotes: string[];
  recommendedNextResearch: string[];
};

export type PackageQualityTier = "strong" | "weak" | "none";

export type PilotSelectedSong = {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  album: string | null;
  playCount: number;
  packageQualityTier: PackageQualityTier;
  packageStatus: string | null;
  hasPackage: boolean;
  hasChartHistory: boolean;
  hasCover: boolean;
  storyCardCount: number;
  filePath: string;
};

export type PilotSelection = {
  selectedAt: string;
  count: number;
  songs: PilotSelectedSong[];
};

export type DirectorStoryCardInput = {
  id: string;
  rank: number;
  headline: string;
  fact: string;
  category: string;
  sourceLabel: string;
};

export type DirectorFactInput = {
  id: string;
  factText: string;
  category: string;
  reviewStatus: string;
  confidence: number;
};

export type DirectorTimelineInput = {
  year: number | null;
  title: string;
  description: string;
};

export type DirectorDiscoveryCandidate = {
  kind: "related" | "album" | "artist" | "year";
  title: string;
  reason: string | null;
};

export type DirectorSongInput = {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  album: string | null;
  playCount: number;
  chartHistorySummary: string | null;
  trajectorySummary: string | null;
  storyCards: DirectorStoryCardInput[];
  candidateFacts: DirectorFactInput[];
  timelineEvents: DirectorTimelineInput[];
  discoveryCandidates: DirectorDiscoveryCandidate[];
  coverStatus: {
    hasCover: boolean;
    albumTitle: string | null;
  };
  videoStatus: {
    hasOwnedVideo: boolean;
    hasVdjMedia: boolean;
    filePath: string | null;
  };
  packageStatus: {
    status: string | null;
    storyCardCount: number;
    artifactReady: boolean;
    packageQualityTier: PackageQualityTier;
  };
};

export type DirectorRunResult = {
  rvtr: string;
  ok: boolean;
  output: DirectorSongOutput | null;
  error: string | null;
  model: string | null;
  ranAt: string;
};

export type DirectorPilotBundle = {
  selection: PilotSelection;
  results: DirectorRunResult[];
  outputs: DirectorSongOutput[];
};
