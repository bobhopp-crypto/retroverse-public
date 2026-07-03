export const ALLSTAR_RESULT_NUMBERS = Array.from({ length: 14 }, (_, i) => String(i + 1));

/** Pipeline module readiness — game sim not built yet. */
export type AllStarModuleStatus = "active" | "planned" | "disabled";

export type AllStarModuleKey =
  | "discExtraction"
  | "mlbComparison"
  | "gameSimulation";

export type AllStarModuleInfo = {
  key: AllStarModuleKey;
  label: string;
  description: string;
  status: AllStarModuleStatus;
  href?: string;
};

export const ALLSTAR_MODULES: AllStarModuleInfo[] = [
  {
    key: "discExtraction",
    label: "Disc Extraction Pipeline",
    description: "Scan ingestion, geometry detection, wedge OCR, CSV export.",
    status: "active",
    href: "/ops/allstar",
  },
  {
    key: "mlbComparison",
    label: "MLB Statistical Comparison",
    description: "Compare disc outcomes to real player stats and era baselines.",
    status: "planned",
  },
  {
    key: "gameSimulation",
    label: "Digital Game Simulation",
    description: "Spin discs digitally using extracted probability tables.",
    status: "planned",
  },
];

export type WedgeDegrees = Record<string, number>;
export type WedgeProbabilities = Record<string, number>;

export type AllStarOutcomeKey =
  | "homeRun"
  | "triple"
  | "double"
  | "walk"
  | "strikeout"
  | "singles"
  | "outs";

export type AllStarOutcomeSummaryItem = {
  key: AllStarOutcomeKey;
  label: string;
  numbers: string[];
  degrees: number;
  probability: number;
};

export const ALLSTAR_OUTCOME_GROUPS: Array<{
  key: AllStarOutcomeKey;
  label: string;
  numbers: string[];
}> = [
  { key: "homeRun", label: "Home Run", numbers: ["1"] },
  { key: "triple", label: "Triple", numbers: ["5"] },
  { key: "double", label: "Double", numbers: ["11"] },
  { key: "walk", label: "Walk", numbers: ["9"] },
  { key: "strikeout", label: "Strikeout", numbers: ["10"] },
  { key: "singles", label: "Singles", numbers: ["7", "13"] },
  {
    key: "outs",
    label: "Outs",
    numbers: ["2", "3", "4", "6", "8", "12", "14"],
  },
];

export function buildOutcomeSummary(
  degrees: WedgeDegrees,
  probabilities: WedgeProbabilities,
): AllStarOutcomeSummaryItem[] {
  return ALLSTAR_OUTCOME_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    numbers: group.numbers,
    degrees: group.numbers.reduce((sum, n) => sum + (degrees[n] ?? 0), 0),
    probability: group.numbers.reduce((sum, n) => sum + (probabilities[n] ?? 0), 0),
  }));
}

export type DiscProcessingStatus =
  | "pending"
  | "processing"
  | "ocr_partial"
  | "processed"
  | "failed";

export type DiscGeometryStatus = "unknown" | "ok" | "warning" | "failed";

export type AllStarDisc = {
  id: string;
  scanFilename: string;
  scanPath: string;
  canonicalFile: string | null;
  player: string;
  position: string;
  degrees: WedgeDegrees;
  probabilities: WedgeProbabilities;
  processingStatus: DiscProcessingStatus;
  geometryStatus: DiscGeometryStatus;
  wedgeCount: number | null;
  labeledWedgeCount: number | null;
  degreesSum: number | null;
  hasReviewImage: boolean;
  reviewImageFilename: string | null;
  warnings: string[];
};

export type AllStarDashboardStats = {
  totalScans: number;
  processedScans: number;
  pendingScans: number;
  ocrComplete: number;
  ocrPartial: number;
  geometryOk: number;
  geometryWarning: number;
  lastExtractedAt: string | null;
};

export type AllStarSnapshot = {
  updatedAt: string;
  dataRoot: string;
  scansDir: string;
  outputDir: string;
  modules: AllStarModuleInfo[];
  stats: AllStarDashboardStats;
  discs: AllStarDisc[];
};

export type AllStarCollectionGroup = "hallOfFame" | "active" | "unknown";

export type AllStarArchiveRecord = {
  id: string;
  sourceFile: string;
  canonicalFile: string | null;
  player: string;
  position: string;
  preservedAt: string;
  hallOfFame: boolean;
  hofYear: number | null;
  switchHitter: boolean;
  collectionGroup: AllStarCollectionGroup;
  geometryStatus: DiscGeometryStatus;
  ocrStatus: "complete" | "partial" | "pending";
  validationStatus: "validated" | "warning" | "pending";
  degrees: WedgeDegrees;
  probabilities: WedgeProbabilities;
  outcomeSummary: AllStarOutcomeSummaryItem[];
  wedgeCount: number | null;
  degreesSum: number | null;
  largestOutcomeDegrees: number;
  smallestHomeRunDegrees: number | null;
  reviewImageFilename: string | null;
  warnings: string[];
  ocrConfidence?: number;
  geometryConfidence?: number;
  archiveConfidence?: number;
  trustLevel?: "trusted" | "review_recommended" | "review_required";
};

export type AllStarLiveProcessing = {
  player: string;
  position: string;
  scanFilename: string;
  stage: string;
  geometryStatus: DiscGeometryStatus | "processing";
  ocrStatus: "complete" | "partial" | "processing" | "pending";
  validationStatus: "validated" | "warning" | "processing" | "pending";
  outcomeSummary: AllStarOutcomeSummaryItem[];
};

export type AllStarTickerEvent = {
  id: string;
  message: string;
  at: string;
};

export type AllStarLeaderboardEntry = {
  rank: number;
  player: string;
  position: string;
  discId: string;
  value: number;
  label: string;
};

export type AllStarFinding = {
  id: string;
  title: string;
  detail: string;
  player?: string;
  discId?: string;
  at?: string;
};

export type AllStarPreservedTile = {
  id: string;
  player: string;
  position: string;
  preservedAt: string;
  hallOfFame: boolean;
  thumbnailUrl: string;
};

export type AllStarSpotlight = {
  id: string;
  player: string;
  position: string;
  era: string;
  fact: string;
  homeRunProbability: number;
};

export type AllStarCollectionOverview = {
  key: AllStarCollectionGroup;
  label: string;
  total: number;
  preserved: number;
  percent: number;
};

export type AllStarHofTracker = {
  totalIdentified: number;
  preserved: number;
  percent: number;
  recentPlayer: string | null;
  recentPreservedAt: string | null;
};

export type AllStarLiveArchive = {
  updatedAt: string;
  extractionRunning: boolean;
  liveProcessing: AllStarLiveProcessing | null;
  ticker: AllStarTickerEvent[];
  recentlyPreserved: AllStarPreservedTile[];
  hallOfFame: AllStarHofTracker;
  leaderboards: {
    homeRun: AllStarLeaderboardEntry[];
    walk: AllStarLeaderboardEntry[];
    strikeout: AllStarLeaderboardEntry[];
    singles: AllStarLeaderboardEntry[];
    double: AllStarLeaderboardEntry[];
  };
  findings: AllStarFinding[];
  spotlight: AllStarSpotlight | null;
  collectionOverview: AllStarCollectionOverview[];
  stats: AllStarDashboardStats;
  harvest?: import("./harvest-metrics").CollectionHarvestMetrics;
};

export type AllStarDiscDetail = AllStarDisc & {
  wedges: Array<{
    index: number;
    label: number | null;
    spanDeg: number;
    probability: number;
  }>;
  outcomeSummary: AllStarOutcomeSummaryItem[];
};
