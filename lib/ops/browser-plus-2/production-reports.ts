import "server-only";

import { isActiveVideoRow } from "./status";
import { summarizeQueueWork } from "./production-health";
import type { Bp2DailyProductionReport, Bp2Row, Bp2StudioOperations, Bp2StudioQueueJob } from "./types";

function isWithin24h(iso: string | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 24 * 60 * 60 * 1000;
}

function isOvernightJob(job: Bp2StudioQueueJob): boolean {
  if (!job.startedAt) return false;
  const started = new Date(job.startedAt);
  const hour = started.getHours();
  return hour >= 20 || hour < 6 || job.total >= 50;
}

function departmentThroughput(jobs: Bp2StudioQueueJob[]): Bp2DailyProductionReport["departmentThroughput"] {
  const map = new Map<string, { completed: number; totalMs: number }>();

  for (const job of jobs) {
    if (job.status !== "complete" && job.status !== "failed") continue;
    if (!isWithin24h(job.completedAt)) continue;

    const entry = map.get(job.department) ?? { completed: 0, totalMs: 0 };
    entry.completed += job.results.filter((r) => r.status === "complete").length;
    entry.totalMs += job.elapsedMs;
    map.set(job.department, entry);
  }

  const out: Bp2DailyProductionReport["departmentThroughput"] = {};
  for (const [department, stats] of map) {
    out[department] = {
      completed: stats.completed,
      avgProcessingTimeMs:
        stats.completed > 0 ? Math.round(stats.totalMs / stats.completed) : null,
    };
  }
  return out;
}

/** Build the daily operational report shown in Mission Control. */
export function buildDailyProductionReport(input: {
  rows: Bp2Row[];
  jobs: Bp2StudioQueueJob[];
  operations?: Bp2StudioOperations;
}): Bp2DailyProductionReport {
  const { rows, jobs, operations } = input;
  const jobPlans = operations?.jobPlans ?? [];
  const queueSummary = summarizeQueueWork(jobs, jobPlans);

  const recentJobs = jobs.filter((j) => isWithin24h(j.completedAt) || j.status === "running" || j.status === "queued");
  const overnightJobs = jobs.filter(isOvernightJob).slice(-10);

  const failures: Bp2DailyProductionReport["failures"] = [];
  for (const job of jobs) {
    if (!isWithin24h(job.completedAt) && job.status !== "running") continue;
    for (const result of job.results) {
      if (result.status !== "failed") continue;
      failures.push({
        jobId: job.id,
        department: job.department,
        rvtr: result.rvtr,
        message: result.message,
      });
    }
    if (job.status === "failed" && job.error) {
      failures.push({
        jobId: job.id,
        department: job.department,
        rvtr: job.currentRvtr ?? "—",
        message: job.error,
      });
    }
  }

  const videos = rows.filter(isActiveVideoRow).filter((r) => r.rvtr && r.studio.patronValue !== null);

  const topPatronValue = [...videos]
    .sort((a, b) => (b.studio.patronValue ?? 0) - (a.studio.patronValue ?? 0))
    .slice(0, 10)
    .map((r) => ({
      rvtr: r.rvtr!,
      artist: r.artist,
      title: r.title,
      value: r.studio.patronValue!,
    }));

  const lowestPatronValue = [...videos]
    .sort((a, b) => (a.studio.patronValue ?? 0) - (b.studio.patronValue ?? 0))
    .slice(0, 10)
    .map((r) => ({
      rvtr: r.rvtr!,
      artist: r.artist,
      title: r.title,
      value: r.studio.patronValue!,
    }));

  const needsReview = rows.filter((r) => r.workQueues.needsReview).length;
  const productionReady = rows.filter((r) => r.workQueues.experienceReady).length;

  const completedJobs24h = jobs.filter((j) => j.status === "complete" && isWithin24h(j.completedAt));
  const totalProcessed = completedJobs24h.reduce(
    (sum, j) => sum + j.results.filter((r) => r.status === "complete").length,
    0,
  );
  const totalMs = completedJobs24h.reduce((sum, j) => sum + j.elapsedMs, 0);
  const avgProcessingTimeMs = totalProcessed > 0 ? Math.round(totalMs / totalProcessed) : null;

  const now = new Date();
  const periodLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    generatedAt: now.toISOString(),
    periodLabel,
    queueSummary,
    overnightJobs,
    failures: failures.slice(0, 50),
    topPatronValue,
    lowestPatronValue,
    needsReview,
    productionReady,
    departmentThroughput: departmentThroughput(jobs),
    avgProcessingTimeMs,
    totalProcessed24h: totalProcessed,
  };
}
