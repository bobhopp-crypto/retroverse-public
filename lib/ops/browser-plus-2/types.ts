import type { BrowserPlusRow } from "@/lib/ops/browser-plus/types";

import type { StudioHealthCounts } from "@/lib/studio/metrics";
import type { StudioStage, StudioStoryStatus } from "@/lib/studio/types";

import type { MetadataRecoveryConfidence } from "./filename-metadata-recovery";

/** @deprecated Use StudioStage from `@/lib/studio/types` — alias preserved for BP2. */
export type Bp2StudioStage = StudioStage;

/** @deprecated Use StudioStoryStatus from `@/lib/studio/types` — alias preserved for BP2. */
export type Bp2StudioStoryStatus = StudioStoryStatus;

/** Internal migration artifact — not shown in Browser Plus UI. */
export type Bp2IdentityStatus =
  | "Unidentified"
  | "Identified"
  | "Processed"
  | "Processed Legacy";

export type Bp2FilterId =
  | "all-videos"
  | "needs-identity"
  | "needs-research"
  | "needs-review"
  | "no-usable-cover"
  | "experience-ready"
  | "sunday-nights-missing"
  | "top-100-missing"
  | "top-500-missing"
  | "top-played"
  | "missing-metadata";

export type Bp2StudioFilterId =
  | "needs-collector"
  | "needs-editor"
  | "needs-director"
  | "ready-to-publish"
  | "multiple-performances"
  | "low-patron-value"
  | "low-confidence"
  | "missing-assets"
  | "never-played"
  | "updated-today"
  | "sunday-night-ready";

export type Bp2StudioHint = {
  rvtr: string;
  stage: Bp2StudioStage;
  statusLabel: string;
  patronValue: number | null;
  storyQuality: string | null;
  confidenceLabel: string;
  storyStatus: Bp2StudioStoryStatus;
  performanceCount: number;
  approvedAssetCount: number;
  lastUpdated: string | null;
  packageVersions: {
    collector: string | null;
    editor: string | null;
    director: string | null;
  };
  renderReadiness: string | null;
  renderingConfidence: number | null;
  missingItems: string[];
  recommendedPerformance: string | null;
  needsCollector: boolean;
  needsEditor: boolean;
  needsDirector: boolean;
  readyToPublish: boolean;
};

/** @deprecated Use `StudioHealthCounts` from `@/lib/studio/metrics` — alias preserved for BP2. */
export type Bp2StudioHealth = StudioHealthCounts;

/** Phase 1 production dashboard metrics (Browser+ 2 Mission Control). */
export type Bp2ProductionHealth = {
  identifiedVideos: number;
  collectorCoveragePct: number;
  editorCoveragePct: number;
  directorCoveragePct: number;
  renderReadyCount: number;
  renderReadyPct: number;
  avgPatronValue: number | null;
  avgConfidence: number | null;
  needingAttention: number;
  readyToPublish: number;
  queueWaiting: number;
  queueRunning: number;
  queuePaused: number;
  queueBlocked: number;
  queueFailed24h: number;
  queueCompleted24h: number;
  queuePausedGlobal: boolean;
  workersReady: number;
  workersWorking: number;
  workersOffline: number;
  aiEnginesUp: number;
  aiEnginesTotal: number;
};

export type Bp2PackageIntegrityReport = {
  scannedAt: string;
  totalPackages: number;
  completePackages: number;
  completePct: number;
  missingCollector: string[];
  missingEditor: string[];
  missingDirector: string[];
  missingRenderSpec: string[];
  missingCollectorTotal: number;
  missingEditorTotal: number;
  missingDirectorTotal: number;
  missingRenderSpecTotal: number;
  outdatedVersions: Array<{
    rvtr: string;
    artifact: "collector" | "editor" | "director" | "render-spec";
    found: string;
    expected: string;
  }>;
  outdatedVersionsTotal: number;
};

export type Bp2DailyProductionReport = {
  generatedAt: string;
  periodLabel: string;
  queueSummary: {
    waiting: number;
    running: number;
    paused: number;
    completed: number;
    failed: number;
    blocked: number;
  };
  overnightJobs: Bp2StudioQueueJob[];
  failures: Array<{
    jobId: string;
    department: string;
    rvtr: string;
    message: string;
  }>;
  topPatronValue: Array<{ rvtr: string; artist: string; title: string; value: number }>;
  lowestPatronValue: Array<{ rvtr: string; artist: string; title: string; value: number }>;
  needsReview: number;
  productionReady: number;
  departmentThroughput: Record<
    string,
    { completed: number; avgProcessingTimeMs: number | null }
  >;
  avgProcessingTimeMs: number | null;
  totalProcessed24h: number;
};

export type Bp2StudioQueueDepartment =
  | "run-collector"
  | "run-editor"
  | "run-director"
  | "refresh-research"
  | "rebuild-experience";

export type Bp2StudioQueueJobStatus =
  | "queued"
  | "running"
  | "complete"
  | "failed"
  | "paused";

export type Bp2StudioQueueJob = {
  id: string;
  department: Bp2StudioQueueDepartment;
  status: Bp2StudioQueueJobStatus;
  rvtrs: string[];
  currentRvtr: string | null;
  currentIndex: number;
  total: number;
  step: string;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  elapsedMs: number;
  estimatedRemainingMs: number | null;
  error: string | null;
  results: Array<{ rvtr: string; status: "complete" | "failed" | "skipped"; message: string }>;
};

export type Bp2WorkerAvailability = "idle" | "busy" | "unavailable";

export type Bp2StudioWorkerSnapshot = {
  instanceId: string;
  workerId: string;
  department: string;
  availability: Bp2WorkerAvailability;
  enabled: boolean;
  currentRvtr: string | null;
  currentAction: string | null;
  capabilities: string[];
  summary: string;
  estimatedExecutionTimeMs: number;
  estimatedExecutionCost: string;
  preferredAiBackend: string | null;
  preferredModel: string | null;
  requiresInternet: boolean;
  requiresOllama: boolean;
  requiresVirtualDJ: boolean;
  requiresLocalAssets: boolean;
};

export type Bp2StudioAiBackendSnapshot = {
  id: string;
  kind: string;
  displayName: string;
  available: boolean;
  ok: boolean;
  detail?: string;
  latencyMs?: number;
};

export type Bp2StudioJobPlanSnapshot = {
  jobId: string;
  department: Bp2StudioQueueDepartment;
  plannedTimeMs: number;
  estimatedCost: string;
  requiresInternet: boolean;
  requiresOllama: boolean;
  requiresVirtualDJ: boolean;
  requiresLocalAssets: boolean;
  preferredAiBackend: string | null;
  runnable: boolean | null;
  blockers: string[];
  currentRvtr: string | null;
  currentAction: string | null;
};

export type Bp2StudioOperations = {
  workers: Bp2StudioWorkerSnapshot[];
  aiBackends: Bp2StudioAiBackendSnapshot[];
  jobPlans: Bp2StudioJobPlanSnapshot[];
};

export type Bp2PatronPriority = "Sunday Nights" | "Top 100" | "Top 500" | "Library";

export type Bp2NextAction =
  | "Assign RVTR"
  | "Build Research"
  | "Review Package"
  | "Acquire Cover"
  | "Fix Renderability"
  | "Experience Ready";

export type Bp2WorkQueues = {
  needsIdentity: boolean;
  needsResearch: boolean;
  needsReview: boolean;
  noUsableCover: boolean;
  experienceReady: boolean;
};

export type Bp2PackageHint = {
  rvtr: string;
  status: string;
  storyCount: number;
  factCount: number;
  artifactReadyCount: number;
  chartHistoryCount: number;
  relatedSongsCount: number;
  artistFactCount: number;
  timelineEventCount: number;
  hasAlbumContext: boolean;
  hasCover: boolean;
  hasVideo: boolean;
  updatedAt: string | null;
  experienceReady: boolean;
};

export type Bp2Row = BrowserPlusRow & {
  identityStatus: Bp2IdentityStatus;
  remix: string;
  storyCount: number;
  missingStory: boolean;
  experienceReady: boolean;
  hasUsableCover: boolean;
  packageArtifactCount: number;
  researchPackageStatus: string | null;
  patronPriority: Bp2PatronPriority;
  nextAction: Bp2NextAction;
  inSundayCohort: boolean;
  inTop100Cohort: boolean;
  inTop500Cohort: boolean;
  pathToReady: Bp2PathToReady;
  workQueues: Bp2WorkQueues;
  /** @deprecated Use nextAction */
  nextAutomation: string;
  hasXmlArtist: boolean;
  hasXmlTitle: boolean;
  missingXmlMetadata: boolean;
  hasFilenameRecovery: boolean;
  recoveryConfidence: MetadataRecoveryConfidence;
  recoveredArtist: string | null;
  recoveredTitle: string | null;
  /** Browser+ 2.0 — Studio pipeline status from research-department packages */
  studio: Bp2StudioHint;
};

export type Bp2SummaryCounts = {
  videos: number;
  needsIdentity: number;
  needsResearch: number;
  needsReview: number;
  noUsableCover: number;
  experienceReady: number;
  missingMetadata: number;
  recoverableMetadata: number;
};

export type Bp2ReadinessBlockers = {
  missingResearch: number;
  needsReview: number;
  missingCover: number;
  renderability: number;
};

export type Bp2PathToReadyStep = {
  label: string;
  done: boolean;
};

export type Bp2PathToReady = {
  steps: Bp2PathToReadyStep[];
  nextStep: Bp2NextAction;
};

export type Bp2ReadinessPanelId = "sunday-nights" | "top-100" | "top-500";

export type Bp2ReadinessPanel = {
  id: Bp2ReadinessPanelId;
  label: string;
  ready: number;
  total: number;
  pct: number;
  missingFilter: "sunday-nights-missing" | "top-100-missing" | "top-500-missing";
  blockers: Bp2ReadinessBlockers;
  actionLabel: string;
};

export type Bp2CohortContext = {
  sundayRvtrs: Set<string>;
  top100Rvtrs: Set<string>;
  top500Rvtrs: Set<string>;
  sundaySnapshotSongCount: number;
};

export type Bp2ResearchQueueTier = "sunday" | "top100" | "top500" | "library";

export type Bp2ResearchQueueTiers = {
  sundayMissing: number;
  top100Missing: number;
  top500Missing: number;
  library: number;
};

export type Bp2MetadataRecoveryRow = {
  filePath: string;
  fileName: string;
  xmlArtist: string | null;
  xmlTitle: string | null;
  recoveredArtist: string | null;
  recoveredTitle: string | null;
  rvtr: string | null;
  identityStatus: Bp2IdentityStatus;
  recoveryConfidence: MetadataRecoveryConfidence;
};

export type Bp2MetadataImpact = {
  missingMetadata: number;
  recoverableMetadata: number;
  unidentifiedAmongMissing: number;
  withRvtrAmongMissing: number;
  matchBlockedNow: number;
  likelyMatchFailures: number;
  autoMatchableAfterRecovery: number;
  reviewMatchableAfterRecovery: number;
  graphAvailable: boolean;
};

export type Bp2Model = {
  parsedAt: string;
  databasePath: string;
  virtualDjRunning: boolean;
  rows: Bp2Row[];
  summary: Bp2SummaryCounts;
  readinessPanels: Bp2ReadinessPanel[];
  metadataRecoveryReport: Bp2MetadataRecoveryRow[];
  metadataImpact: Bp2MetadataImpact;
  researchQueue?: {
    tiers: Bp2ResearchQueueTiers;
    activeJob: {
      id: string;
      status: string;
      step: string;
      current: number;
      total: number;
    } | null;
  };
  /** Browser+ 2.0 */
  studioHealth?: Bp2StudioHealth;
  productionHealth?: Bp2ProductionHealth;
  packageIntegrity?: Bp2PackageIntegrityReport;
  dailyReport?: Bp2DailyProductionReport;
  studioQueue?: {
    jobs: Bp2StudioQueueJob[];
    paused: boolean;
  };
  /** Studio kernel operations snapshot — workers, AI backends, job plans */
  studioOperations?: Bp2StudioOperations;
};

export type Bp2InspectorArtifacts = {
  cover: boolean;
  chartHistory: number;
  storyFragments: number;
  artistFacts: number;
  timeline: number;
  relatedSongs: number;
  albumContext: boolean;
  videoMedia: boolean;
};
