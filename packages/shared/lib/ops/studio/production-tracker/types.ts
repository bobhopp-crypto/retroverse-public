import type { StudioDepartmentId } from "@/lib/ops/studio/department-status/types";

export type ProductionTrackerDepartmentId = StudioDepartmentId;

export const PRODUCTION_TRACKER_DEPARTMENTS: ProductionTrackerDepartmentId[] = [
  "collector",
  "editor",
  "director",
  "publisher",
];

export type ProductionTrackerStepStatus =
  | "complete"
  | "running"
  | "active"
  | "waiting"
  | "blocked";

export type ProductionTrackerOutput = {
  label: string;
  value: string;
  done: boolean;
};

export type ProductionTrackerStep = {
  id: ProductionTrackerDepartmentId;
  name: string;
  status: ProductionTrackerStepStatus;
  statusLabel: string;
  summary: string;
  outputs: ProductionTrackerOutput[];
  openLabel: string;
  openHref: string;
  openEnabled: boolean;
  openHint: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type ProductionTrackerSnapshot = {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl: string | null;
  generatedAt: string;
  currentDepartment: ProductionTrackerDepartmentId | null;
  previousDepartments: ProductionTrackerDepartmentId[];
  nextDepartment: ProductionTrackerDepartmentId | null;
  pipelineStage: string;
  pipelineReason: string;
  startedAt: string | null;
  elapsedMs: number | null;
  elapsedLabel: string;
  steps: ProductionTrackerStep[];
};
