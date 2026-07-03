/** Serializable trust-calibration types (safe for client props). */

export type HealingOutcomeStatus = "approved" | "rolled_back" | "retained" | "uncertain";

export type HealingOutcomeRow = {
  proposalId: number | null;
  rvtr: string;
  albumId: number | null;
  confidence: number | null;
  status: HealingOutcomeStatus;
  ts: string;
  actor: string;
  message: string;
};

export type HealingOutcomeSummary = {
  totalAuditEvents: number;
  applyAttempts: number;
  applySuccesses: number;
  rollbacks: number;
  retained: number;
  uncertain: number;
  rollbackRate: number;
  retentionRate: number;
  confidenceMin: number | null;
  confidenceMax: number | null;
  confidenceAvg: number | null;
  recent: HealingOutcomeRow[];
};

export type QualityPatternNote = {
  pattern: string;
  strength: "strong" | "weak" | "risk";
  note: string;
};

export type EraPatternRow = {
  era: string;
  missingAlbumLinks: number;
  missingCovers: number;
  orphanVdj: number;
  note: string;
};

export type DuplicateDistortionFinding = {
  clusterId: string;
  displayTitle: string;
  displayArtist: string;
  clusterSize: number;
  probableCanonicalRvtr: string;
  distortionRisk: "low" | "medium" | "high";
  note: string;
};

export type DangerousCandidateExample = {
  rvtr: string;
  title: string;
  artistName: string;
  albumTitle: string;
  albumId: number;
  matchConfidence: number;
  trustScore: number;
  riskFlags: string[];
};

export type HealingTrustCalibration = {
  outcomes: HealingOutcomeSummary;
  qualityPatterns: QualityPatternNote[];
  eraPatterns: EraPatternRow[];
  duplicateDistortion: DuplicateDistortionFinding[];
  dangerousCandidates: DangerousCandidateExample[];
};
