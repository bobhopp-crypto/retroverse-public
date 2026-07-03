import type { StudioKernelDepartmentId } from "./department";
import type { StudioStage } from "./types";

/** Per-row Studio Alpha fields used for health aggregation. */
export type StudioHealthRowInput = {
  rvtr: string | null;
  studio: {
    needsCollector: boolean;
    needsEditor: boolean;
    needsDirector: boolean;
    readyToPublish: boolean;
    stage: StudioStage;
    patronValue: number | null;
  };
};

/** Aggregated Studio Alpha health counts (Browser+ 2 `Bp2StudioHealth` shape). */
export type StudioHealthCounts = {
  videoCount: number;
  packageCount: number;
  directorReadyCount: number;
  patronValueAvg: number | null;
  collectorQueue: number;
  editorQueue: number;
  directorQueue: number;
  readyToPublishCount: number;
};

/** Aggregated health snapshot for the Operations Center (extended kernel view). */
export type StudioHealthSnapshot = StudioHealthCounts & {
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

/** Director-ready or publish-ready for health rollups. */
export function isDirectorReady(studio: StudioHealthRowInput["studio"]): boolean {
  return (
    studio.readyToPublish || studio.stage === "director" || studio.stage === "complete"
  );
}

/** Average patron value rounded to one decimal; null when no scores. */
export function averagePatronValue(values: Array<number | null>): number | null {
  const scores = values.filter((v): v is number => v !== null);
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

/** Completion percentage (0–100) for readiness summaries. */
export function completionPct(ready: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((ready / total) * 100);
}

/** Build Studio Alpha health counts from video rows with embedded studio hints. */
export function buildStudioHealthCounts(
  videoCount: number,
  rows: StudioHealthRowInput[],
): StudioHealthCounts {
  const withRvtr = rows.filter((r) => r.rvtr);
  return {
    videoCount,
    packageCount: withRvtr.filter((r) => !r.studio.needsCollector).length,
    directorReadyCount: withRvtr.filter((r) => isDirectorReady(r.studio)).length,
    patronValueAvg: averagePatronValue(withRvtr.map((r) => r.studio.patronValue)),
    collectorQueue: withRvtr.filter((r) => r.studio.needsCollector).length,
    editorQueue: withRvtr.filter((r) => r.studio.needsEditor).length,
    directorQueue: withRvtr.filter((r) => r.studio.needsDirector).length,
    readyToPublishCount: withRvtr.filter((r) => r.studio.readyToPublish).length,
  };
}

/** Map health counts to extended snapshot with department queue breakdown. */
export function studioHealthCountsToSnapshot(counts: StudioHealthCounts): StudioHealthSnapshot {
  return {
    ...counts,
    departmentQueues: {
      collector: counts.collectorQueue,
      editor: counts.editorQueue,
      director: counts.directorQueue,
    },
    aiAvailable: null,
    activeJobs: 0,
    failedJobs24h: 0,
  };
}
