/** Director 3.4 — exhibit coaching records (not package edits). */

export const DIRECTOR_COACHING_STORE_VERSION = 1 as const;

export type ExhibitCoachingVerdict = "perfect" | "good" | "wrong";

export type DirectorCoachingSource = "operator" | "publisher";

export type DirectorExhibitCoachingRecord = {
  id: string;
  rvtr: string;
  exhibitId: string;
  verdict: ExhibitCoachingVerdict;
  reasons: string[];
  note: string | null;
  frameAssetId: string | null;
  frameCategory: string | null;
  coachedAt: string;
  source: DirectorCoachingSource;
};

export type DirectorPlanSnapshot = {
  rvtr: string;
  savedAt: string;
  generatedAt: string;
  sceneCount: number;
  experiencePlan: unknown;
};

export type DirectorCoachingStore = {
  version: typeof DIRECTOR_COACHING_STORE_VERSION;
  updatedAt: string;
  exhibitCoaching: DirectorExhibitCoachingRecord[];
  planSnapshots: DirectorPlanSnapshot[];
};

import { identifyLabels } from "@/lib/ops/studio/model-identity";

export const DIRECTOR_COACHING_REASONS = [
  "Wrong opening image",
  "Wrong iconic frame",
  "Weak chart presentation",
  "Performance frame isn't memorable",
  "Too much text",
  "Not enough emotion",
  "Feels repetitive",
  "Wrong pacing",
  "Weak ending",
  "Poor visual variety",
] as const;

export const IDENTIFIED_COACHING_REASONS = identifyLabels("coach-reason-option", DIRECTOR_COACHING_REASONS);

export type DirectorCoachingReason = (typeof DIRECTOR_COACHING_REASONS)[number];

export type FrameRankMetadata = {
  assetId: string | null;
  category: string;
  quality: number;
  sharpness: number | null;
  motion: string;
  brightness: number | null;
  uniqueness: number;
  neighborDistanceSec: number | null;
  diversityScore: number;
  selectionReason: string;
};

export type ExhibitTrainingView = {
  exhibitId: string;
  label: string;
  sceneNumber: number | null;
  headline: string;
  frame: FrameRankMetadata | null;
  coverUrl: string | null;
  coaching: DirectorExhibitCoachingRecord | null;
};

export type DirectorAbComparison = {
  current: {
    generatedAt: string;
    scenes: Array<{ exhibitId: string | null; label: string; headline: string; frameCategory: string | null }>;
  };
  previous: {
    savedAt: string;
    generatedAt: string;
    scenes: Array<{ exhibitId: string | null; label: string; headline: string; frameCategory: string | null }>;
  } | null;
};

export type CoachingRuleHints = {
  preferredCategories: string[];
  avoidCategories: string[];
  reasonCounts: Record<string, number>;
};

export type DirectorAnalyticsSnapshot = {
  generatedAt: string;
  totalCoachingRecords: number;
  songsCoached: number;
  publisherApprovalRate: number;
  averageExhibitsPerExperience: number;
  averagePublisherScore: number;
  mostRejectedExhibit: string | null;
  mostAcceptedFrameCategory: string | null;
  topCoachingReasons: Array<{ id: string; reason: string; count: number }>;
  categoryPreference: Array<{ id: string; category: string; score: number; accepted: number; rejected: number }>;
  songsNeedingIntervention: number;
  recentTrend: "improving" | "stable" | "declining";
};

export type DirectorTrainingPayload = {
  rvtr: string;
  exhibits: ExhibitTrainingView[];
  abComparison: DirectorAbComparison | null;
  analytics: DirectorAnalyticsSnapshot;
};
