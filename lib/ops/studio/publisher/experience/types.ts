/** Sprint 3.5 — Experience evolution (Publisher quality laboratory). */

export const EXPERIENCE_EVOLUTION_VERSION = 1 as const;

export const EXPERIENCE_FINGERPRINTS = [
  "Visual Driven",
  "Story Driven",
  "Performance Driven",
  "Historical",
  "Collector",
  "Concert",
  "Music Video",
  "TV Performance",
  "Live Event",
  "Chart Story",
] as const;

export type ExperienceFingerprint = (typeof EXPERIENCE_FINGERPRINTS)[number];

export type ExperienceScorecardDimensionId =
  | "openingImpact"
  | "visualSurprise"
  | "emotionalArc"
  | "memorability"
  | "rhythm"
  | "endingStrength"
  | "watchTwice";

export type ExperienceScorecardDimension = {
  id: ExperienceScorecardDimensionId;
  label: string;
  autoScore: number;
  /** Operator editorial judgment; null until reviewed. */
  operatorScore: number | null;
  effectiveScore: number;
};

export type ExperienceScorecard = {
  computedAt: string;
  operatorReviewedAt: string | null;
  dimensions: ExperienceScorecardDimension[];
  /** Average of effective scores — emotion-first editorial grade. */
  emotionScore: number;
  operatorNote: string | null;
};

export type SimilarExperienceMatch = {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl: string | null;
  similarity: number;
  sharedFingerprints: ExperienceFingerprint[];
};

export type ExperiencePatternsSnapshot = {
  generatedAt: string;
  packageCount: number;
  approvedCount: number;
  goldenCount: number;
  fingerprintScores: Array<{
    id: string;
    fingerprint: ExperienceFingerprint;
    count: number;
    avgEmotionScore: number;
    showcaseRate: number;
  }>;
  topOpenings: Array<{ id: string; exhibitPattern: string; count: number; avgScore: number }>;
  topRejections: Array<{ id: string; reason: string; count: number }>;
  showcaseFingerprints: ExperienceFingerprint[];
  avgUniquenessScore: number;
};

export type GoldenPackageRecord = {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl: string | null;
  promotedAt: string;
  promotedBy: string;
  showcaseReason: string;
  publisherComment: string;
  fingerprint: ExperienceFingerprint[];
  baselineEmotionScore: number;
  baselineQualityScore: number;
  /** Hash of frozen director plan at promotion time. */
  planFingerprint: string;
  /** Sprint 3.9 — curator observations at promotion time. */
  criticObservations?: import("./critic/types").ExperienceCriticObservation[];
};

export type ExperienceDriftSample = {
  rvtr: string;
  title: string;
  baselineEmotionScore: number;
  currentEmotionScore: number;
  delta: number;
};

export type ExperienceDriftReport = {
  id: string;
  triggeredAt: string;
  triggerRvtr: string | null;
  samples: ExperienceDriftSample[];
  averageDelta: number;
  passed: boolean;
  message: string;
};

export type ExperienceEvolutionStore = {
  version: typeof EXPERIENCE_EVOLUTION_VERSION;
  updatedAt: string;
  goldenPackages: GoldenPackageRecord[];
  driftReports: ExperienceDriftReport[];
};

export type MuseumWallEntry = {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl: string | null;
  qualityScore: number;
  emotionScore: number;
  fingerprint: ExperienceFingerprint[];
  publicationClass: string;
  showcaseReason: string;
  publisherComment: string;
  isGolden: boolean;
  rank: number;
};

export const SCORECARD_LABELS: Record<ExperienceScorecardDimensionId, string> = {
  openingImpact: "Opening Impact",
  visualSurprise: "Visual Surprise",
  emotionalArc: "Emotional Arc",
  memorability: "Memorability",
  rhythm: "Rhythm",
  endingStrength: "Ending Strength",
  watchTwice: "Would I watch this twice?",
};
