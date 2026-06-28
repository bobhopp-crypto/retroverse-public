import type { IdentifiedText } from "@/lib/ops/studio/model-identity";

/** Publisher 1.0 — editorial review and release (not a content generator). */

import type {
  ExperienceFingerprint,
  ExperienceScorecard,
  SimilarExperienceMatch,
} from "./experience/types";

export const PUBLISHER_STORE_VERSION = 1 as const;

/** Auto-classification or post-approval publication tier. */
export type PublicationClass =
  | "ready"
  | "extended"
  | "showcase"
  | "needs_coaching"
  | "blocked";

export type PublisherDimensionId =
  | "story"
  | "visualVariety"
  | "assetCoverage"
  | "historicalQuality"
  | "experienceQuality"
  | "visualProduction";

export type PublisherDimensionScore = {
  id: PublisherDimensionId;
  label: string;
  score: number;
  notes: IdentifiedText[];
};

export type PublisherAssetCheck = {
  id: string;
  label: string;
  present: boolean;
  required: boolean;
};

export type PublisherEvaluation = {
  evaluatedAt: string;
  qualityScore: number;
  publicationClass: PublicationClass;
  why: string;
  dimensions: PublisherDimensionScore[];
  assetChecks: PublisherAssetCheck[];
  blockingIssues: string[];
  coachingIssues: string[];
  optionalGaps: string[];
  /** Sprint 3.5 — emotion-first editorial scorecard */
  experienceScorecard?: ExperienceScorecard;
  fingerprints?: ExperienceFingerprint[];
  uniquenessScore?: number;
  similarPackages?: SimilarExperienceMatch[];
  /** Sprint 3.9 — internal museum walkthrough observations (no auto-fixes). */
  experienceCritic?: import("./experience/critic/types").ExperienceCriticReport;
  /** Sprint 3.37 — Visual Producer production review summary */
  visualProduction?: import("./visual-producer/types").VisualProductionReviewSummary;
  /** Full visual production plan reference (on disk — visual-production.json) */
  visualProductionArtifact?: boolean;
};

export type PublisherDecisionAction =
  | "approve"
  | "approve_extended"
  | "approve_showcase"
  | "return_editor"
  | "return_director";

export type PublisherDecision = {
  id?: string;
  action: PublisherDecisionAction;
  publicationClass: PublicationClass;
  reviewer: string;
  reason: string;
  previousClass: PublicationClass;
  decidedAt: string;
};

export type PublisherRecord = {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl: string | null;
  evaluation: PublisherEvaluation | null;
  /** Set when operator approves; null = awaiting review or returned. */
  approvedClass: PublicationClass | null;
  approvedAt: string | null;
  returnedTo: "editor" | "director" | null;
  decisions: PublisherDecision[];
  firstEvaluatedAt: string | null;
  publishedAt: string | null;
  /** Sprint 3.5 — frozen exemplar */
  isGolden?: boolean;
  goldenPromotedAt?: string | null;
};

export type PublisherStore = {
  version: typeof PUBLISHER_STORE_VERSION;
  updatedAt: string;
  records: PublisherRecord[];
};

export type PublisherDashboardMetrics = {
  ready: number;
  extended: number;
  showcase: number;
  needsCoaching: number;
  blocked: number;
  averageQualityScore: number;
  averagePublishTimeHours: number | null;
  approvalRate: number;
  topRejectionReasons: Array<{ id: string; reason: string; count: number }>;
};

export type PublisherCard = {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl: string | null;
  publicationClass: PublicationClass;
  qualityScore: number;
  why: string;
  approved: boolean;
  approvedAt: string | null;
  awaitingReview: boolean;
};
