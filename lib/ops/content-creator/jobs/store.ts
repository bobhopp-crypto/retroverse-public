import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "fs/promises";

import {
  contentCreatorJobIndexPath,
  contentCreatorJobPath,
  contentCreatorJobsDir,
} from "./paths";
import type { ContentCreatorJob, ContentCreatorJobIndex, ContentCreatorJobStatus } from "./types";

async function ensureJobsDir(): Promise<void> {
  await mkdir(contentCreatorJobsDir(), { recursive: true });
}

export async function loadJobIndex(): Promise<ContentCreatorJobIndex> {
  await ensureJobsDir();
  const path = contentCreatorJobIndexPath();
  if (!existsSync(path)) {
    return { version: 1, updatedAt: new Date().toISOString(), jobs: [] };
  }
  return JSON.parse(await readFile(path, "utf8")) as ContentCreatorJobIndex;
}

async function saveJobIndex(index: ContentCreatorJobIndex): Promise<void> {
  index.updatedAt = new Date().toISOString();
  await writeFile(contentCreatorJobIndexPath(), `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

export async function loadJob(jobId: string): Promise<ContentCreatorJob | null> {
  const path = contentCreatorJobPath(jobId);
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, "utf8")) as ContentCreatorJob;
}

export async function saveJob(job: ContentCreatorJob): Promise<void> {
  await ensureJobsDir();
  job.updatedAt = new Date().toISOString();
  await writeFile(contentCreatorJobPath(job.id), `${JSON.stringify(job, null, 2)}\n`, "utf8");

  const index = await loadJobIndex();
  if (!index.jobs.includes(job.id)) {
    index.jobs.unshift(job.id);
    index.jobs = index.jobs.slice(0, 200);
    await saveJobIndex(index);
  }
}

export async function createJob(
  partial: Pick<ContentCreatorJob, "type" | "title" | "payload"> & { id?: string },
): Promise<ContentCreatorJob> {
  const now = new Date().toISOString();
  const job: ContentCreatorJob = {
    id: partial.id ?? `job-${Date.now().toString(36)}`,
    type: partial.type,
    status: "queued",
    title: partial.title,
    thumbnailPath: null,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    updatedAt: now,
    progress: { current: 0, total: 1, step: "Queued" },
    error: null,
    result: null,
    payload: partial.payload,
  };
  await saveJob(job);
  return job;
}

export async function updateJob(
  jobId: string,
  patch: Partial<
    Pick<
      ContentCreatorJob,
      | "status"
      | "title"
      | "thumbnailPath"
      | "startedAt"
      | "completedAt"
      | "progress"
      | "error"
      | "result"
    >
  >,
): Promise<ContentCreatorJob> {
  const job = await loadJob(jobId);
  if (!job) throw new Error("Job not found");
  Object.assign(job, patch);
  await saveJob(job);
  return job;
}

export async function listJobs(opts?: { status?: ContentCreatorJobStatus; limit?: number }): Promise<ContentCreatorJob[]> {
  const index = await loadJobIndex();
  const limit = opts?.limit ?? 50;
  const jobs: ContentCreatorJob[] = [];

  for (const id of index.jobs) {
    if (jobs.length >= limit) break;
    const job = await loadJob(id);
    if (!job) continue;
    if (opts?.status && job.status !== opts.status) continue;
    jobs.push(job);
  }

  return jobs;
}

export async function retryJob(jobId: string): Promise<ContentCreatorJob> {
  const job = await loadJob(jobId);
  if (!job) throw new Error("Job not found");
  if (job.status !== "failed") throw new Error("Only failed jobs can be retried");

  return updateJob(jobId, {
    status: "queued",
    error: null,
    startedAt: null,
    completedAt: null,
    progress: { current: 0, total: job.progress.total, step: "Queued" },
    result: null,
  });
}

export async function listActiveJobs(): Promise<ContentCreatorJob[]> {
  const index = await loadJobIndex();
  const jobs: ContentCreatorJob[] = [];
  for (const id of index.jobs) {
    const job = await loadJob(id);
    if (!job) continue;
    if (job.status === "queued" || job.status === "running") jobs.push(job);
  }
  return jobs;
}
