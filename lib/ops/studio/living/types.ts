/** Sprint 3.6 — Living Studio presentation types (read-only aggregates). */

/** Sprint 3.6 — Living Studio presentation types (read-only aggregates). */

import type { IdentifiedText } from "@/lib/ops/studio/model-identity";
import type { MissionControlDashboard } from "@/lib/ops/studio/production/load-mission-control-dashboard";
import type { PipelineHealthSnapshot } from "@/lib/ops/studio/pipeline-snapshot-types";

export type LivingPipelineStage = "collector" | "editor" | "director" | "publisher" | "published";

export type LivingProductionCard = {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl: string | null;
  stage: LivingPipelineStage;
  href: string;
  subtitle?: string;
  year?: number | null;
  stageLabel?: string;
};

export type LivingActivityEvent = {
  id: string;
  at: string;
  timeLabel: string;
  message: string;
  department: LivingPipelineStage | "system";
  rvtr?: string;
};

export type LivingDepartmentId = "collector" | "editor" | "director" | "publisher";

export type LivingDepartmentSnapshot = {
  id: LivingDepartmentId;
  name: string;
  personality: string;
  atmosphere: string;
  mood: "active" | "working" | "idle";
  currentActivity: string;
  queueCount: number;
  completedToday: number;
  emptyMessage: string;
  href: string;
  currentProduction: LivingProductionCard | null;
  recentProductions: LivingProductionCard[];
  upcomingQueue: LivingProductionCard[];
  activityFeed: LivingActivityEvent[];
};

export type LivingPipelineNode = {
  stage: LivingPipelineStage;
  label: string;
  processingLabel: string;
  count: number;
  isActive: boolean;
  href: string;
};

export type LivingStudioSnapshot = {
  generatedAt: string;
  activeSong: LivingProductionCard | null;
  pipeline: LivingPipelineNode[];
  departments: LivingDepartmentSnapshot[];
  recentPublications: LivingProductionCard[];
  todayAccomplishments: IdentifiedText[];
  recentCompletions: LivingProductionCard[];
  pipelineHealth?: PipelineHealthSnapshot;
  dashboard?: MissionControlDashboard;
};

export type DirectorProductionStep = {
  id: string;
  label: string;
  status: "done" | "active" | "pending";
};

export type DirectorProductionSnapshot = {
  generatedAt: string;
  mood: "active" | "idle";
  current: LivingProductionCard | null;
  steps: DirectorProductionStep[];
  progressPct: number;
  recentProductions: LivingProductionCard[];
  activityFeed: LivingActivityEvent[];
  emptyMessage: string;
};
