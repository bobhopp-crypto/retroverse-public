import "server-only";

import { randomUUID } from "crypto";
import { join } from "path";

import {
  createInProcessSingleFlight,
  createJsonQueueStore,
  queueNow,
} from "@/lib/studio/queue";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";

import type { Bp2Row, Bp2StudioQueueDepartment, Bp2StudioQueueJob } from "./types";
import { runQueueDepartmentStep } from "./studio-scheduler-adapter";

type QueueStore = {
  version: 1;
  paused: boolean;
  jobs: Bp2StudioQueueJob[];
  updatedAt: string;
};

const BP2_QUEUE_CACHE_KEY = "__bp2StudioQueue";
const BP2_QUEUE_RUNNING_KEY = "__bp2StudioQueueRunning";

function queuePath(): string {
  return join(retroverseDataRoot(), "ops", "browser-plus", "studio-queue.json");
}

const queueStore = createJsonQueueStore<QueueStore>({
  filePath: queuePath(),
  cacheKey: BP2_QUEUE_CACHE_KEY,
  createEmpty: () => ({
    version: 1,
    paused: false,
    jobs: [],
    updatedAt: queueNow(),
  }),
  normalize: (parsed, now) => ({
    version: 1,
    paused: parsed.paused ?? false,
    jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    updatedAt: parsed.updatedAt ?? now,
  }),
});

const drainFlight = createInProcessSingleFlight(BP2_QUEUE_RUNNING_KEY);

async function loadStore(): Promise<QueueStore> {
  const store = await queueStore.load();
  let recovered = false;
  for (const job of store.jobs) {
    if (job.status === "running") {
      job.status = "queued";
      job.step = "Recovered after restart — waiting to resume";
      job.updatedAt = queueNow();
      recovered = true;
    }
  }
  if (recovered) {
    await saveStore(store);
    if (!store.paused) void drainStudioQueue();
  }
  return store;
}

async function saveStore(store: QueueStore): Promise<void> {
  await queueStore.save(store);
}

export async function getStudioQueueStatus(): Promise<{ paused: boolean; jobs: Bp2StudioQueueJob[] }> {
  const store = await loadStore();
  return { paused: store.paused, jobs: store.jobs.slice(-50) };
}

export async function enqueueStudioJobs(
  department: Bp2StudioQueueDepartment,
  rvtrs: string[],
): Promise<Bp2StudioQueueJob> {
  const normalized = [...new Set(rvtrs.map((r) => r.trim().toUpperCase()).filter(Boolean))];
  if (normalized.length === 0) throw new Error("no_rvtrs");

  const store = await loadStore();
  const job: Bp2StudioQueueJob = {
    id: randomUUID(),
    department,
    status: "queued",
    rvtrs: normalized,
    currentRvtr: null,
    currentIndex: 0,
    total: normalized.length,
    step: "Queued",
    startedAt: queueNow(),
    updatedAt: queueNow(),
    completedAt: null,
    elapsedMs: 0,
    estimatedRemainingMs: normalized.length * 120_000,
    error: null,
    results: [],
  };
  store.jobs.push(job);
  await saveStore(store);
  void drainStudioQueue();
  return job;
}

export async function setStudioQueuePaused(paused: boolean): Promise<void> {
  const store = await loadStore();
  store.paused = paused;
  await saveStore(store);
  if (!paused) void drainStudioQueue();
}

export async function cancelStudioJob(jobId: string): Promise<boolean> {
  const store = await loadStore();
  const job = store.jobs.find((j) => j.id === jobId);
  if (!job || job.status === "complete") return false;
  job.status = "failed";
  job.error = "Cancelled";
  job.completedAt = queueNow();
  job.step = "Cancelled";
  await saveStore(store);
  return true;
}

export async function retryStudioJob(jobId: string): Promise<Bp2StudioQueueJob | null> {
  const store = await loadStore();
  const job = store.jobs.find((j) => j.id === jobId);
  if (!job) return null;
  const failedRvtrs = job.results.filter((r) => r.status === "failed").map((r) => r.rvtr);
  if (failedRvtrs.length === 0) return job;
  return enqueueStudioJobs(job.department, failedRvtrs);
}

async function resolveRowForRvtr(rvtr: string): Promise<Bp2Row | null> {
  const { loadBrowserPlus2Model } = await import("./load-browser-plus-2");
  const model = await loadBrowserPlus2Model();
  return model.rows.find((r) => r.rvtr?.toUpperCase() === rvtr) ?? null;
}

async function runDepartmentStep(
  department: Bp2StudioQueueDepartment,
  rvtr: string,
  row: Bp2Row | null,
): Promise<{ status: "complete" | "failed" | "skipped"; message: string }> {
  return runQueueDepartmentStep(department, rvtr, row);
}

async function drainStudioQueue(): Promise<void> {
  if (!drainFlight.tryAcquire()) return;

  try {
    while (true) {
      const store = await loadStore();
      if (store.paused) break;

      const job = store.jobs.find((j) => j.status === "queued" || j.status === "running");
      if (!job) break;

      if (job.status === "queued") {
        job.status = "running";
        job.startedAt = queueNow();
      }

      while (job.currentIndex < job.total) {
        const storeCheck = await loadStore();
        if (storeCheck.paused) {
          job.status = "paused";
          job.step = "Paused";
          await saveStore(storeCheck);
          return;
        }

        const rvtr = job.rvtrs[job.currentIndex]!;
        job.currentRvtr = rvtr;
        job.step = `${job.department}: ${rvtr}`;
        job.updatedAt = queueNow();
        job.elapsedMs = Date.now() - new Date(job.startedAt).getTime();
        job.estimatedRemainingMs = Math.max(
          0,
          (job.total - job.currentIndex) * 120_000 - job.elapsedMs,
        );
        await saveStore(store);

        const row = await resolveRowForRvtr(rvtr);
        const result = await runDepartmentStep(job.department, rvtr, row);
        job.results.push({ rvtr, ...result });
        job.currentIndex += 1;
        await saveStore(store);
      }

      job.status = job.results.some((r) => r.status === "failed") ? "failed" : "complete";
      job.completedAt = queueNow();
      job.step = job.status === "complete" ? "Complete" : "Completed with errors";
      job.currentRvtr = null;
      await saveStore(store);
    }
  } finally {
    drainFlight.release();
  }
}

export { drainStudioQueue };
