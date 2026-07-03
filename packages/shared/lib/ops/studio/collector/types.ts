/** Retroverse Studio — Collector research package (department output only). */

import type {
  CollectorCanonicalModel,
  CollectorFactScope,
  CollectorPerformanceEntity,
  CollectorRecordingEntity,
  CollectorSongEntity,
  CollectorTimelines,
  CollectorYearResolution,
} from "./entity-model";

export type {
  CollectorCanonicalModel,
  CollectorFactScope,
  CollectorPerformanceEntity,
  CollectorPerformanceKind,
  CollectorRecordingEntity,
  CollectorRecordingKind,
  CollectorSongEntity,
  CollectorTimelineDomain,
  CollectorTimelineEvent,
  CollectorTimelineEventKind,
  CollectorTimelines,
  CollectorYearAnchor,
  CollectorYearResolution,
} from "./entity-model";

export const COLLECTOR_STAGES = [
  { id: "identity", label: "Identity" },
  { id: "retroverse_vdj", label: "Retroverse / VirtualDJ" },
  { id: "charts", label: "Charts" },
  { id: "recording", label: "Recording" },
  { id: "video_performance", label: "Video / Performance" },
  { id: "visual_asset_extraction", label: "Visual Asset Extraction" },
  { id: "cultural_context", label: "Cultural Context" },
  { id: "visual_assets", label: "Visual Assets" },
  { id: "relationships", label: "Relationships" },
  { id: "candidate_facts", label: "Candidate Facts" },
  { id: "missing_information", label: "Missing Information" },
  { id: "source_log", label: "Source Log" },
] as const;

/** Sprint 3.10 — internal lyrics research artifact (not patron-facing). */
export type CollectorLyricsArtifact =
  | { available: false }
  | {
      available: true;
      source: string;
      language: string;
      copyrightStatus: string;
      retrievedAt: string;
      fullText: string;
      lineCount: number;
    };

export const COLLECTOR_STAGE_TOTAL = COLLECTOR_STAGES.length;

export type CollectorStageId = (typeof COLLECTOR_STAGES)[number]["id"];

export type CollectorStageStatus = "pending" | "active" | "complete" | "skipped";

export type CollectorRunStatus = "idle" | "researching" | "waiting" | "complete";

export type CollectorFactApproval = "approved" | "pending";

export type CollectorResearchFact = {
  id: string;
  category: string;
  text: string;
  source: string;
  sourceUrl: string | null;
  confidence: number;
  internalNotes: string | null;
  /** Sprint A1 — Collector promotes obvious facts before Editor handoff. */
  approvalStatus?: CollectorFactApproval;
  /** Sprint A3 — fact belongs to song, recording, or performance timeline. */
  scope?: CollectorFactScope;
  scopeRef?: string | null;
};

export type CollectorDomainConfidence = {
  identity: number;
  recording: number;
  charts: number;
  performance: number;
  culture: number;
  relationships: number;
  overall: number;
};

export type CollectorStorySeed = {
  whyItMatters: string;
  strongestFacts: string[];
  storyIdeas: string[];
  suggestedAngle: string;
};

export type CollectorSourceLogEntry = {
  id: string;
  source: string;
  url: string | null;
  capturedAt: string;
  excerpt: string;
  confidence: number;
  stage: CollectorStageId;
  internalNotes: string | null;
};

export type CollectorStageResult = {
  status: "complete" | "partial" | "skipped";
  summary: string;
};

export type CollectorVisualAssetCategory =
  | "Hero"
  | "Performance"
  | "Crowd"
  | "Close-up"
  | "Alternate";

export type CollectorExtractedVisualAsset = {
  id: string;
  category: CollectorVisualAssetCategory;
  filename: string;
  timestampSec: number;
  width: number;
  height: number;
  selectionReason: string;
  capturedAt: string;
};

export type CollectorVisualAssetExtraction = {
  skipped: boolean;
  skipReason: string | null;
  sourceVideo: string | null;
  frameIntervalSec: number;
  extractedCount: number;
  assets: CollectorExtractedVisualAsset[];
};

export type CollectorVdjMediaItem = {
  filePath: string;
  artist: string;
  title: string;
  isVideo: boolean;
  playCount: number | null;
  year: number | null;
  genre: string | null;
  user2: string | null;
  performanceLabel: string | null;
};

/** Song-level archive — identity through sources. Shared across all performances. */
export type CollectorSongArchive = {
  identity: {
    rvtr: string;
    artist: string;
    title: string;
    year: number | null;
    albumTitle: string | null;
  };
  charts: {
    peakHot100: number | null;
    chartWeeks: number | null;
    albumTitle: string | null;
    summary: string;
  };
  recording: {
    summary: string;
    notes: string[];
  };
  relationships: {
    relatedArtists: string[];
    summary: string;
  };
  culture: {
    summary: string;
    notes: string[];
  };
  sources: {
    sourceLog: CollectorSourceLogEntry[];
    summary: {
      researchSummary: string;
      sourceSummary: string;
    };
  };
  candidateFacts: CollectorResearchFact[];
  missingAreas: string[];
  identityNotes: string[];
  coverUrl: string | null;
};

/** One performance video — visual assets, notes, and facts are scoped here. */
export type CollectorPerformance = {
  id: string;
  title: string;
  sourceVideo: string | null;
  virtualDjFilePath: string | null;
  durationSec: number | null;
  qualityScore: number;
  visualAssets: {
    extraction: CollectorVisualAssetExtraction;
  };
  collectorNotes: string;
  detectedVenue: string | null;
  detectedYear: number | null;
  confidence: number;
  facts: string[];
};

export type CollectorPackage = {
  version: 1 | 2 | 3 | 4;
  rvtr: string;
  artist: string;
  title: string;
  graphLinked: boolean;
  identityNotes: string[];
  status: "complete" | "partial";
  completedAt: string;
  researchQuality: number;
  stages: Record<CollectorStageId, CollectorStageResult>;
  identity: {
    rvtr: string;
    artist: string;
    title: string;
    year: number | null;
    albumTitle: string | null;
  };
  virtualDj: {
    primaryPath: string | null;
    playCount: number | null;
    tags: string[];
    mediaItems: CollectorVdjMediaItem[];
  };
  charts: {
    peakHot100: number | null;
    chartWeeks: number | null;
    albumTitle: string | null;
    summary: string;
  };
  recording: {
    summary: string;
    notes: string[];
  };
  videoPerformance: {
    summary: string;
    items: CollectorVdjMediaItem[];
    preferredPerformance: string | null;
  };
  culturalContext: {
    summary: string;
    notes: string[];
  };
  visualAssets: {
    coverUrl: string | null;
    inventory: string[];
    extraction: CollectorVisualAssetExtraction;
  };
  relationships: {
    relatedArtists: string[];
    summary: string;
  };
  candidateFacts: CollectorResearchFact[];
  missingAreas: string[];
  sourceLog: CollectorSourceLogEntry[];
  summary: {
    researchSummary: string;
    sourceSummary: string;
  };
  /** Song-level archive — written at package finalize (v3). */
  song?: CollectorSongArchive;
  /** One entry per owned performance video — written at package finalize (v3). */
  performances?: CollectorPerformance[];
  /** Domain confidence scores — written at package finalize (v3). */
  confidence?: CollectorDomainConfidence;
  /** Editorial seed for Editor distill — written at package finalize (v3). */
  storySeed?: CollectorStorySeed;
  /** Sprint A3 — canonical composition entity (v4). */
  songEntity?: CollectorSongEntity;
  /** Sprint A3 — recording editions (v4). */
  recordings?: CollectorRecordingEntity[];
  /** Sprint A3 — performance entities mirror performances[] with full fields (v4). */
  performanceEntities?: CollectorPerformanceEntity[];
  /** Sprint A3 — separated timelines (v4). */
  timelines?: CollectorTimelines;
  /** Sprint A3 — resolved years with confidence (v4). */
  yearResolution?: CollectorYearResolution;
  /** Sprint A3 — full canonical model snapshot (v4). */
  canonical?: CollectorCanonicalModel;
  /** Sprint 3.10 — optional lyrics research artifact. */
  lyrics?: CollectorLyricsArtifact;
};

export type CollectorActivityEntry = {
  id?: string;
  at: string;
  message: string;
};

export type CollectorCompletedSong = {
  rvtr: string;
  artist: string;
  title: string;
  completedAt: string;
  researchQuality: number;
  runtimeMs: number;
};

export type CollectorProgress = {
  version: 1;
  status: CollectorRunStatus;
  startedAt: string | null;
  updatedAt: string;
  currentSong: {
    rvtr: string;
    artist: string;
    title: string;
  } | null;
  currentStage: CollectorStageId | null;
  currentStageLabel: string | null;
  stageIndex: number;
  stageTotal: number;
  queue: number;
  completedToday: number;
  avgRuntimeMs: number | null;
  researchQuality: number | null;
  recentActivity: CollectorActivityEntry[];
  recentlyCompleted: CollectorCompletedSong[];
};

export type CollectorDashboardStats = {
  status: CollectorRunStatus;
  statusLabel: string;
  currentSong: string;
  currentStage: string;
  queue: number;
  completedToday: number;
  averageTime: string;
  researchQuality: string;
  recentActivity: CollectorActivityEntry[];
  recentlyCompleted: CollectorCompletedSong[];
  progress: CollectorProgress;
};
