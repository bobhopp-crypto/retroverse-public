export type TrainingBatchMode = "local" | "cloud";

export type SelectedTrainingSong = {
  rvtr: string;
  artist: string;
  title: string;
  playCount: number | null;
  filePath: string;
  chartHistoryCount: number;
  hasExistingCollector: boolean;
};

export type DepartmentMetrics = {
  runtimeMs: number;
  confidence: number | null;
  status: "complete" | "failed" | "skipped" | "blocked";
  error: string | null;
  details: Record<string, string | number | boolean | null>;
};

export type SongBatchResult = {
  rvtr: string;
  artist: string;
  title: string;
  mode: TrainingBatchMode;
  status: "complete" | "partial" | "failed";
  error: string | null;
  startedAt: string;
  finishedAt: string;
  totalRuntimeMs: number;
  retries: number;
  collector: DepartmentMetrics;
  editor: DepartmentMetrics;
  director: DepartmentMetrics;
  publisher: DepartmentMetrics;
  renderer: DepartmentMetrics;
  patronValue: number | null;
  sceneCount: number | null;
  wordsPerScene: number | null;
  visualCoverage: number | null;
  packageCompleteness: number | null;
  coachingNotes: string[];
};

export type BatchRunSummary = {
  mode: TrainingBatchMode;
  generatedAt: string;
  targetCount: number;
  processedCount: number;
  completedCount: number;
  failedCount: number;
  partialCount: number;
  totalRetries: number;
  totalRuntimeMs: number;
  avgRuntimeMsPerSong: number;
  avgConfidence: number | null;
  avgPatronValue: number | null;
  avgSceneCount: number | null;
  avgWordsPerScene: number | null;
  avgVisualCoverage: number | null;
  avgPackageCompleteness: number | null;
  publisherReadyCount: number;
  rendererReadyCount: number;
  estimatedApiCostUsd: number | null;
  results: SongBatchResult[];
};

export type CoachingIssue = {
  department: string;
  issue: string;
  count: number;
  examples: string[];
};

export type SpotReviewPick = {
  rvtr: string;
  artist: string;
  title: string;
  reason: string;
  studioUrl: string;
  score: number;
};

export type LocalVsCloudComparison = {
  generatedAt: string;
  local: BatchRunSummary;
  cloud: BatchRunSummary;
  departmentConfidence: Record<string, { local: number | null; cloud: number | null }>;
  publisherReady: { local: number; cloud: number };
  rendererReady: { local: number; cloud: number };
  runtimeMs: { local: number; cloud: number };
  estimatedApiCostUsd: number | null;
  recommendation: string;
  strongest: SpotReviewPick[];
  weakest: SpotReviewPick[];
  mostImproved: SpotReviewPick[];
  coaching: CoachingIssue[];
};
