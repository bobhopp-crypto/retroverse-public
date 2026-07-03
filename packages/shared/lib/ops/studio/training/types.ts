import type { IdentifiedText } from "@/lib/ops/studio/model-identity";

export const TRAINING_REVIEW_VERSION = 1 as const;

export type TrainingDepartmentId =
  | "collector"
  | "editor"
  | "director"
  | "publisher"
  | "renderer";

export const TRAINING_DEPARTMENTS: TrainingDepartmentId[] = [
  "collector",
  "editor",
  "director",
  "publisher",
  "renderer",
];

export type TrainingReviewVerdict = "approve" | "needs_coaching" | "reject";

export type TrainingReviewRecord = {
  rvtr: string;
  department: TrainingDepartmentId;
  verdict: TrainingReviewVerdict;
  note: string | null;
  reviewedAt: string;
};

export type SpotReviewBatch = {
  id: string;
  rvtrs: string[];
  sampledAt: string;
  batchSize: number;
  method: "confidence_risk_random";
};

export type TrainingReviewStore = {
  version: typeof TRAINING_REVIEW_VERSION;
  updatedAt: string;
  reviews: TrainingReviewRecord[];
  spotReviews: SpotReviewBatch[];
};

export type TrainingIoSection = {
  summary: string;
  items: IdentifiedText[];
};

export type TrainingDecision = {
  id: string;
  label: string;
  reason: string;
};

export type TrainingDepartmentSnapshot = {
  department: TrainingDepartmentId;
  status: "ready" | "missing_input" | "not_run";
  confidence: number;
  confidenceLabel: string;
  explanation: string;
  input: TrainingIoSection;
  output: TrainingIoSection;
  decisions: TrainingDecision[];
  review: TrainingReviewRecord | null;
};

export type TrainingSongSnapshot = {
  rvtr: string;
  artist: string;
  title: string;
  generatedAt: string;
  departments: TrainingDepartmentSnapshot[];
};

export type DepartmentHealthTrend = "up" | "down" | "stable";

export type DepartmentHealthRow = {
  department: TrainingDepartmentId;
  label: string;
  averageConfidence: number;
  averageApprovalRate: number;
  needsCoachingCount: number;
  rejectedCount: number;
  approvedCount: number;
  reviewCount: number;
  lastReviewedAt: string | null;
  trend: DepartmentHealthTrend;
};

export type TrainingHealthSnapshot = {
  generatedAt: string;
  departments: DepartmentHealthRow[];
};
