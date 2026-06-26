import type { StudioKernelDepartmentId } from "./department";

/** Aggregated health snapshot for the Operations Center (Browser+ 2). */
export type StudioHealthSnapshot = {
  videoCount: number;
  packageCount: number;
  directorReadyCount: number;
  patronValueAvg: number | null;
  readyToPublishCount: number;
  departmentQueues: Partial<Record<StudioKernelDepartmentId, number>>;
  aiAvailable: boolean | null;
  activeJobs: number;
  failedJobs24h: number;
};

/** Department-level counters for the Studio dashboard. */
export type DepartmentHealthMetrics = {
  department: StudioKernelDepartmentId;
  queue: number;
  completedToday: number;
  averageTimeMs: number | null;
  status: "idle" | "running" | "paused" | "error";
};
