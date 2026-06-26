import "server-only";

import { completionPct } from "@/lib/studio/metrics";
import { isStudioRenderReady } from "@/lib/studio/status";
import type { StudioConfidenceLabel } from "@/lib/studio/types";

import { isActiveVideoRow } from "./status";
import type {
  Bp2ProductionHealth,
  Bp2Row,
  Bp2StudioJobPlanSnapshot,
  Bp2StudioOperations,
  Bp2StudioQueueJob,
} from "./types";

const CONFIDENCE_SCORE: Record<StudioConfidenceLabel, number> = {
  Early: 1,
  Developing: 2,
  Good: 3,
  Strong: 4,
};

function isWithin24h(iso: string | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 24 * 60 * 60 * 1000;
}

function confidenceScore(label: string): number {
  if (label in CONFIDENCE_SCORE) {
    return CONFIDENCE_SCORE[label as StudioConfidenceLabel];
  }
  return 0;
}

function averageConfidence(rows: Bp2Row[]): number | null {
  const scores = rows
    .filter((r) => r.rvtr)
    .map((r) => confidenceScore(r.studio.confidenceLabel))
    .filter((s) => s > 0);
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

function countNeedingAttention(rows: Bp2Row[]): number {
  return rows.filter((row) => {
    if (!row.rvtr) return true;
    if (row.workQueues.needsReview) return true;
    if (row.studio.missingItems.length > 0) return true;
    if (row.nextAction !== "Experience Ready" && row.nextAction !== "Assign RVTR") return true;
    return false;
  }).length;
}

export function buildProductionHealth(input: {
  rows: Bp2Row[];
  jobs: Bp2StudioQueueJob[];
  paused: boolean;
  operations?: Bp2StudioOperations;
}): Bp2ProductionHealth {
  const videos = input.rows.filter(isActiveVideoRow);
  const withRvtr = videos.filter((r) => r.rvtr);
  const total = withRvtr.length;

  const hasCollector = withRvtr.filter((r) => !r.studio.needsCollector).length;
  const hasEditor = withRvtr.filter((r) => !r.studio.needsEditor).length;
  const hasDirector = withRvtr.filter((r) => !r.studio.needsDirector).length;
  const renderReady = withRvtr.filter((r) =>
    isStudioRenderReady(r.studio.renderReadiness),
  ).length;

  const patronValues = withRvtr
    .map((r) => r.studio.patronValue)
    .filter((v): v is number => v !== null);
  const avgPatron =
    patronValues.length > 0
      ? Math.round((patronValues.reduce((a, b) => a + b, 0) / patronValues.length) * 10) / 10
      : null;

  const jobs = input.jobs;
  const queueWaiting = jobs.filter((j) => j.status === "queued").length;
  const queueRunning = jobs.filter((j) => j.status === "running").length;
  const queuePaused = jobs.filter((j) => j.status === "paused").length;
  const queueCompleted24h = jobs.filter(
    (j) => j.status === "complete" && isWithin24h(j.completedAt),
  ).length;
  const queueFailed24h = jobs.filter(
    (j) => j.status === "failed" && isWithin24h(j.completedAt),
  ).length;

  const jobPlans = input.operations?.jobPlans ?? [];
  const queueBlocked = jobPlans.filter((p) => p.runnable === false && p.blockers.length > 0).length;

  const workers = input.operations?.workers ?? [];
  const workersReady = workers.filter((w) => w.availability === "idle").length;
  const workersWorking = workers.filter((w) => w.availability === "busy").length;
  const workersOffline = workers.filter((w) => w.availability === "unavailable").length;

  const aiBackends = input.operations?.aiBackends ?? [];
  const aiEnginesUp = aiBackends.filter((b) => b.available).length;

  return {
    identifiedVideos: total,
    collectorCoveragePct: completionPct(hasCollector, total),
    editorCoveragePct: completionPct(hasEditor, total),
    directorCoveragePct: completionPct(hasDirector, total),
    renderReadyCount: renderReady,
    renderReadyPct: completionPct(renderReady, total),
    avgPatronValue: avgPatron,
    avgConfidence: averageConfidence(withRvtr),
    needingAttention: countNeedingAttention(withRvtr),
    readyToPublish: withRvtr.filter((r) => r.studio.readyToPublish).length,
    queueWaiting,
    queueRunning,
    queuePaused,
    queueBlocked,
    queueFailed24h,
    queueCompleted24h,
    queuePausedGlobal: input.paused,
    workersReady,
    workersWorking,
    workersOffline,
    aiEnginesUp,
    aiEnginesTotal: aiBackends.length,
  };
}

export function summarizeQueueWork(jobs: Bp2StudioQueueJob[], jobPlans: Bp2StudioJobPlanSnapshot[]) {
  const blocked = jobPlans.filter((p) => p.runnable === false && p.blockers.length > 0).length;
  return {
    waiting: jobs.filter((j) => j.status === "queued").length,
    running: jobs.filter((j) => j.status === "running").length,
    paused: jobs.filter((j) => j.status === "paused").length,
    completed: jobs.filter((j) => j.status === "complete" && isWithin24h(j.completedAt)).length,
    failed: jobs.filter((j) => j.status === "failed" && isWithin24h(j.completedAt)).length,
    blocked,
  };
}
