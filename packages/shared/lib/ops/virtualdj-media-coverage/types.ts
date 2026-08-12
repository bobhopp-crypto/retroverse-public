import type { ManagedMediaClass } from "./managed-roots";

export type VersionMarker =
  | "original"
  | "live"
  | "remix"
  | "edit"
  | "extended"
  | "remaster"
  | "karaoke"
  | "cover"
  | "tribute"
  | "re_recording"
  | "instrumental"
  | "acoustic"
  | "demo"
  | "clean"
  | "explicit"
  | "unknown";

export type AudioReadinessStatus =
  | "ready"
  | "review"
  | "upgrade_recommended"
  | "alternate_only"
  | "missing";

export type OperatorDecisionAction =
  | "mark_ready"
  | "require_listening_review"
  | "mark_upgrade_recommended"
  | "accept_expected_alternate"
  | "reject_candidate"
  | "mark_missing"
  | "skip"
  | "clear_decision";

export type AudioProbeResult = {
  ok: boolean;
  path: string;
  fingerprint: string;
  probedAt: string;
  formatName: string | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  formatBitRate: number | null;
  codecName: string | null;
  codecLongName: string | null;
  sampleRate: number | null;
  channels: number | null;
  channelLayout: string | null;
  streamBitRate: number | null;
  bitsPerSample: number | null;
  lossless: boolean | null;
  tags: {
    artist: string | null;
    title: string | null;
    album: string | null;
    year: string | null;
    track: string | null;
    comment: string | null;
  };
  error: string | null;
};

export type CoverageTargetSong = {
  targetRowKey: string;
  position: number;
  sourceIndex: number | null;
  sourcePath: string | null;
  artist: string;
  title: string;
  album: string | null;
  year: number | null;
  remix: string | null;
  expectedDurationSeconds: number | null;
  requestedVersionMarkers: VersionMarker[];
  rvtr?: string | null;
};

export type BillboardSetType = "chart_week" | "chart_year";

export type BillboardTargetSong = CoverageTargetSong & {
  targetType: "billboard_hot100";
  chartSource: "Billboard Hot 100";
  setType: BillboardSetType;
  selectedYear: number;
  chartDate: string | null;
  bestRank: number;
  appearanceCount: number;
  firstChartDate: string;
  lastChartDate: string;
  graphTrackId: number;
  canonicalTrackId: number | null;
  rvtr: string | null;
  unresolvedIdentity: boolean;
};

export type CandidateEvidence = {
  entryIndex: number;
  filePath: string;
  filePathNorm: string;
  managedClass: ManagedMediaClass;
  artist: string;
  title: string;
  album: string;
  year: number | null;
  remix: string;
  rvtr: string | null;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  extension: string;
  matchMethod:
    | "exact_filepath"
    | "exact_rvtr"
    | "structured_relationship"
    | "exact_artist_title"
    | "title_first"
    | "artist_first"
    | "filename_support";
  score: number;
  componentScores: {
    filepath: number;
    rvtr: number;
    structured: number;
    artist: number;
    title: number;
    album: number;
    year: number;
    duration: number;
    filename: number;
    version: number;
  };
  evidence: string[];
  versionMarkers: VersionMarker[];
  versionCompatible: boolean;
  versionReason: string | null;
  fileExists: boolean | null;
  probe: AudioProbeResult | null;
};

export type OperatorDecisionEvent = {
  action: OperatorDecisionAction;
  at: string;
  note: string | null;
  selectedPath: string | null;
  automaticStatus: AudioReadinessStatus;
  requiresConfirmation: boolean;
  fileFingerprint: string | null;
};

export type AudioReadinessResult = {
  target: CoverageTargetSong;
  rvtr: string | null;
  automaticStatus: AudioReadinessStatus;
  effectiveStatus: AudioReadinessStatus | "skipped";
  statusReason: string;
  reviewReason: string | null;
  technicalWarnings: string[];
  candidates: CandidateEvidence[];
  winnerPath: string | null;
  winnerScore: number | null;
  runnerUpMargin: number | null;
  decisionHistory: OperatorDecisionEvent[];
  currentDecision: OperatorDecisionEvent | null;
};

export type InventorySummary = {
  xmlPath: string;
  xmlEntries: number;
  managedMusic: number;
  managedVideo: number;
  videoVaultExcluded: number;
  outsideManagedLibrary: number;
  fingerprint: string;
  fingerprintTime: string;
  fileSizeBytes: number;
  parseMs: number;
};

export type AudioReadinessSummary = {
  total: number;
  ready: number;
  review: number;
  upgrade_recommended: number;
  alternate_only: number;
  missing: number;
  skipped: number;
  decisions: number;
};

export type AudioReadinessScan = {
  version: 1;
  id: string;
  mode: "audio_readiness";
  myList: {
    name: string;
    filename: string;
    path: string;
    rowCount: number;
  };
  inventory: InventorySummary;
  createdAt: string;
  updatedAt: string;
  summary: AudioReadinessSummary;
  results: AudioReadinessResult[];
};

export type VideoCoverageStatus = "ready" | "review" | "alternate_only" | "missing";

export type CoverageDecisionAxis = "audio" | "video";

export type CoverageDecisionAction =
  | "accept_ready"
  | "require_review"
  | "mark_upgrade_recommended"
  | "accept_expected_alternate"
  | "reject_candidate"
  | "mark_missing"
  | "skip"
  | "clear_decision";

export type CoverageDecisionEvent = {
  axis: CoverageDecisionAxis;
  action: CoverageDecisionAction;
  at: string;
  note: string | null;
  selectedPath: string | null;
  automaticStatus: AudioReadinessStatus | VideoCoverageStatus;
  requiresConfirmation: boolean;
  evidenceFingerprint: string | null;
};

export type ChartAudioOutcome = {
  automaticStatus: AudioReadinessStatus;
  effectiveStatus: AudioReadinessStatus | "skipped";
  statusReason: string;
  reviewReason: string | null;
  technicalWarnings: string[];
  winnerPath: string | null;
  winnerScore: number | null;
  runnerUpMargin: number | null;
  decisionHistory: CoverageDecisionEvent[];
  currentDecision: CoverageDecisionEvent | null;
};

export type ChartVideoOutcome = {
  automaticStatus: VideoCoverageStatus;
  effectiveStatus: VideoCoverageStatus | "skipped";
  statusReason: string;
  reviewReason: string | null;
  warnings: string[];
  winnerPath: string | null;
  winnerScore: number | null;
  runnerUpMargin: number | null;
  decisionHistory: CoverageDecisionEvent[];
  currentDecision: CoverageDecisionEvent | null;
};

export type ChartCoverageResult = {
  target: BillboardTargetSong;
  rvtr: string | null;
  candidates: CandidateEvidence[];
  audio: ChartAudioOutcome;
  video: ChartVideoOutcome;
};

export type ChartCoverageSummary = {
  targetSongs: number;
  unresolvedIdentities: number;
  audioReady: number;
  audioReview: number;
  audioUpgradeRecommended: number;
  audioAlternateOnly: number;
  audioMissing: number;
  videoReady: number;
  videoReview: number;
  videoAlternateOnly: number;
  videoMissing: number;
  audioDecisions: number;
  videoDecisions: number;
  skipped: number;
};

export type BillboardSelection = {
  chartSource: "Billboard Hot 100";
  setType: BillboardSetType;
  year: number;
  chartDate: string | null;
  dateFrom: string;
  dateTo: string;
  label: string;
  selectionKey: string;
};

export type ChartCoverageScan = {
  version: 2;
  productVersion: "billboard_media_coverage_v1";
  mode: "billboard_media_coverage";
  targetType: "billboard_hot100";
  id: string;
  selection: BillboardSelection;
  inventory: InventorySummary;
  createdAt: string;
  updatedAt: string;
  summary: ChartCoverageSummary;
  results: ChartCoverageResult[];
};

export type BillboardChartWeekOption = {
  chartDate: string;
  year: number;
  month: number;
  rowCount: number;
  resolvedRvtrCount: number;
};

export type BillboardChartOptions = {
  chartSource: "Billboard Hot 100";
  years: number[];
  weeks: BillboardChartWeekOption[];
};

export type MyListOption = {
  name: string;
  filename: string;
  modifiedAt: string;
  sizeBytes: number;
};

export type CoverageScanIndexEntry = {
  id: string;
  targetType?: "vdj_mylist" | "billboard_hot100";
  label?: string;
  selectionKey?: string;
  myListName?: string;
  createdAt: string;
  updatedAt: string;
  summary: AudioReadinessSummary | ChartCoverageSummary;
  inventoryFingerprint: string;
};
