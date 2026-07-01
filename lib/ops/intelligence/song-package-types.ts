/** Retroverse Intelligence Platform — Song Package schema (Phase 2). */

export type SongPackageStatus =
  | "draft"
  | "processing"
  | "review"
  | "cards_ready"
  | "approved"
  | "published";

export type FactCategory =
  | "recording"
  | "video"
  | "performance"
  | "chart"
  | "quote"
  | "artist"
  | "album"
  | "cultural_impact"
  | "tv_film"
  | "trivia";

export type FactSourceType = "canonical" | "research_vault" | "operator";

export type ReviewStatus = "pending" | "approved" | "rejected" | "merged";

export type PackageIssueFlag =
  | "wrong_cover"
  | "missing_cover"
  | "bad_research"
  | "missing_artist_image";

export type ResearchVaultEntry = {
  id: string;
  source: string;
  url: string;
  capturedAt: string;
  excerpt: string;
  confidence: number;
};

export type CandidateFact = {
  id: string;
  category: FactCategory;
  factText: string;
  sourceType: FactSourceType;
  sourceId: string;
  sourceUrl: string | null;
  sourceExcerpt: string;
  excerptAnchor: string;
  confidence: number;
  importance: number;
  locked: boolean;
  extractionMethod: "deterministic" | "model_extract" | "pattern_extract" | "operator";
  reviewStatus: ReviewStatus;
  mergedIntoId?: string;
  createdAt: string;
};

export type StoryHookType =
  | "question"
  | "surprise"
  | "quote"
  | "chart"
  | "video"
  | "recording";

export type CandidateStory = {
  id: string;
  headline: string;
  hookType: StoryHookType;
  primaryFactId: string;
  supportingFactIds: string[];
  headlineMethod: "template" | "model_suggest" | "operator";
  reviewStatus: ReviewStatus;
  rank: number;
  rankScore: number;
  createdAt: string;
};

export type StoryCard = {
  id: string;
  storyId: string;
  rank: number;
  headline: string;
  fact: string;
  supportingContext?: string;
  sourceLabel: string;
  sourceUrl: string | null;
  sourceExcerpt: string;
  confidence: number;
  category: FactCategory;
  hidden?: boolean;
  locked?: boolean;
  issueFlags?: PackageIssueFlag[];
};

export type ChartHistoryEntry = {
  chart: string;
  peak: number | null;
  weeks: number | null;
  detail?: string;
};

export type TimelineEvent = {
  id: string;
  year: number | null;
  title: string;
  description: string;
};

/** Derived intelligence fields for artifacts and display. */
export type PackageIntel = {
  label: string | null;
  catalogNumber: string | null;
  chartHistory: ChartHistoryEntry[];
  timelineEvents: TimelineEvent[];
  recordingFacts: string[];
  videoFacts: string[];
};

export type SongPackageMetadata = {
  rvtr: string;
  artist: string;
  title: string;
  year: number | null;
  albumTitle: string | null;
  coverUrl: string | null;
  peakHot100: number | null;
  chartWeeks: number | null;
  playCount: number | null;
  tags: string[];
  hasVdjMedia: boolean;
  videoInfo: string | null;
  /** Other artists linked in Retroverse graph (album / chart context). */
  relatedArtists: string[];
  /** VDJ database.xml snapshot captured before external research. */
  vdjSnapshot?: import("./vdj-intelligence-types").VdjIntelligenceSnapshot;
};

/** Persisted visual curation — written by BobOS Bridge View, read at hydrate time. */
export type StoredVisualProfile = {
  primaryHeroUrl?: string | null;
  tertiaryHeroUrl?: string | null;
  statusOverride?: import("@/lib/visual-profile/types").VisualProfileStatus | null;
};

export type SongPackage = {
  version: 2;
  rvtr: string;
  status: SongPackageStatus;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  processLog: string[];
  metadata: SongPackageMetadata;
  researchVault: ResearchVaultEntry[];
  candidateFacts: CandidateFact[];
  candidateStories: CandidateStory[];
  storyCards: StoryCard[];
  intel: PackageIntel;
  issueFlags?: PackageIssueFlag[];
  /** Persisted hero curation from BobOS Bridge View. */
  storedVisualProfile?: StoredVisualProfile;
  /** Populated at hydrate time — not persisted to package JSON. */
  visualProfile?: import("@/lib/visual-profile/types").VisualProfile;
};

export type SongPackageIndex = {
  version: 2;
  updatedAt: string;
  packages: Array<{
    rvtr: string;
    title: string;
    artist: string;
    status: SongPackageStatus;
    updatedAt: string;
  }>;
};

export type ProcessSongResult = {
  ok: boolean;
  rvtr: string;
  package: SongPackage;
  error?: string;
};
