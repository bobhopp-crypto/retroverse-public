import "server-only";

import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

import {
  BROWSER_PLUS_EXECUTION_ACTIONS,
  browserPlusExecutionAction,
  type BrowserPlusExecutionActionId,
} from "@/lib/ops/browser-plus/execution-adapters";
import { clearBrowserPlusModelCache } from "@/lib/ops/browser-plus/load-browser-plus";
import { processSong } from "@/lib/ops/intelligence/process-song";
import { runProductionPipeline } from "@/lib/ops/intelligence/production-pipeline";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export type BrowserPlusExecutionJobStatus = "queued" | "running" | "complete" | "failed";

export type BrowserPlusExecutionJob = {
  id: string;
  actionId: BrowserPlusExecutionActionId;
  status: BrowserPlusExecutionJobStatus;
  step: string;
  current: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  rows: Array<{ rvtr: string | null; title: string; artist: string; filePath: string }>;
  results: Array<{ rvtr: string | null; status: "complete" | "skipped" | "failed"; message: string }>;
};

type JobStore = Map<string, BrowserPlusExecutionJob>;
type JobStoreFile = {
  version: 1;
  updatedAt: string;
  jobs: BrowserPlusExecutionJob[];
};

const globalStore = globalThis as typeof globalThis & { __browserPlusExecutionJobs?: JobStore };
const jobs = globalStore.__browserPlusExecutionJobs ?? new Map<string, BrowserPlusExecutionJob>();
globalStore.__browserPlusExecutionJobs = jobs;
let persistedJobsLoaded = false;

function now() {
  return new Date().toISOString();
}

function jobStorePath() {
  return join(retroverseDataRoot(), "ops", "browser-plus", "execution-jobs.json");
}

async function loadPersistedJobs() {
  if (persistedJobsLoaded) return;
  persistedJobsLoaded = true;
  try {
    const raw = await readFile(jobStorePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<JobStoreFile>;
    if (!Array.isArray(parsed.jobs)) return;
    for (const job of parsed.jobs) {
      if (job?.id && !jobs.has(job.id)) jobs.set(job.id, job);
    }
  } catch {
    // Missing/corrupt execution history should not block new jobs.
  }
}

async function persistJobs() {
  const path = jobStorePath();
  const file: JobStoreFile = {
    version: 1,
    updatedAt: now(),
    jobs: [...jobs.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50),
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

async function updateJob(id: string, patch: Partial<BrowserPlusExecutionJob>) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.set(id, { ...job, ...patch, updatedAt: now() });
  await persistJobs();
}

function validRvtr(value: string | null): value is string {
  return /^RVTR\d{6}$/.test(value ?? "");
}

async function runGeneratePackage(jobId: string, row: BrowserPlusExecutionJob["rows"][number]) {
  if (!validRvtr(row.rvtr)) {
    return { rvtr: row.rvtr, status: "skipped" as const, message: "Missing RVTR." };
  }
  const existing = await loadSongPackage(row.rvtr);
  if (existing) {
    return {
      rvtr: row.rvtr,
      status: "skipped" as const,
      message: `Package already exists (${existing.status}); explicit replace is not enabled.`,
    };
  }

  await updateJob(jobId, { step: `Research · ${row.rvtr}` });
  const result = await processSong(row.rvtr, {
    onStep: (message) => {
      void updateJob(jobId, { step: `${row.rvtr} · ${message}` });
    },
  });
  if (!result.ok) {
    return { rvtr: row.rvtr, status: "failed" as const, message: result.error ?? "Package generation failed." };
  }
  return { rvtr: row.rvtr, status: "complete" as const, message: `Package saved as ${result.package.status}.` };
}

async function runFullPipeline(jobId: string, row: BrowserPlusExecutionJob["rows"][number]) {
  if (!validRvtr(row.rvtr)) {
    return { rvtr: row.rvtr, status: "skipped" as const, message: "Missing RVTR." };
  }

  await updateJob(jobId, { step: `Pipeline · ${row.rvtr}` });
  const result = await runProductionPipeline(row.rvtr, {
    onStep: (message) => {
      void updateJob(jobId, { step: `${row.rvtr} · ${message}` });
    },
  });
  if (!result.ok) {
    return { rvtr: row.rvtr, status: "failed" as const, message: result.error ?? "Pipeline failed." };
  }
  if (result.publishBlocked) {
    return { rvtr: row.rvtr, status: "skipped" as const, message: result.error ?? "Publish blocked; package left for review." };
  }
  return {
    rvtr: row.rvtr,
    status: "complete" as const,
    message: result.published ? "Pipeline complete; package published." : `Pipeline complete; package is ${result.package.status}.`,
  };
}

async function runJob(jobId: string) {
  await loadPersistedJobs();
  const job = jobs.get(jobId);
  if (!job) return;
  await updateJob(jobId, { status: "running", step: "Starting" });

  const results: BrowserPlusExecutionJob["results"] = [];
  for (const [index, row] of job.rows.entries()) {
    await updateJob(jobId, { current: index, step: `Preparing ${row.rvtr ?? row.title}` });
    try {
      if (job.actionId === "generate-package") {
        results.push(await runGeneratePackage(jobId, row));
      } else if (job.actionId === "run-full-pipeline") {
        results.push(await runFullPipeline(jobId, row));
      } else {
        results.push({ rvtr: row.rvtr, status: "skipped", message: "Adapter registered but execution is not implemented yet." });
      }
    } catch (error) {
      results.push({
        rvtr: row.rvtr,
        status: "failed",
        message: error instanceof Error ? error.message : "Execution failed.",
      });
    }
    await updateJob(jobId, { current: index + 1, results: [...results] });
  }

  const failed = results.some((result) => result.status === "failed");
  await updateJob(jobId, {
    status: failed ? "failed" : "complete",
    step: failed ? "Completed with failures" : "Complete",
    completedAt: now(),
    results,
  });
  clearBrowserPlusModelCache();
}

export function listBrowserPlusExecutionActions() {
  return { actions: BROWSER_PLUS_EXECUTION_ACTIONS };
}

export async function getBrowserPlusExecutionJob(id: string) {
  await loadPersistedJobs();
  return jobs.get(id) ?? null;
}

export async function startBrowserPlusExecutionJob(input: {
  actionId: BrowserPlusExecutionActionId;
  rows: BrowserPlusExecutionJob["rows"];
}) {
  await loadPersistedJobs();
  const action = browserPlusExecutionAction(input.actionId);
  if (!action) throw new Error("Unknown action.");
  if (action.implementationStatus !== "ready") throw new Error("Action adapter is not executable yet.");
  if (input.rows.length === 0) throw new Error("No rows selected.");
  if (input.rows.length > 1 && !action.supportsBatch) throw new Error("Action does not support batch execution.");

  const createdAt = now();
  const job: BrowserPlusExecutionJob = {
    id: randomUUID(),
    actionId: input.actionId,
    status: "queued",
    step: "Queued",
    current: 0,
    total: input.rows.length,
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    rows: input.rows,
    results: [],
  };
  jobs.set(job.id, job);
  await persistJobs();
  void runJob(job.id);
  return job;
}
