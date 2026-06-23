import { mkdir, readFile, writeFile } from "fs/promises";

import { batchStatusPath } from "./paths";

export type BatchSongStatus = {
  rvtr: string;
  title: string;
  artist: string;
  status: "pending" | "running" | "review" | "published" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  error?: string;
  runtimeMs?: number;
  sources?: number;
  facts?: number;
  stories?: number;
  artifacts?: number;
};

export type BatchStatusFile = {
  version: 1;
  updatedAt: string;
  jobs: BatchSongStatus[];
};

function emptyBatch(): BatchStatusFile {
  return { version: 1, updatedAt: new Date().toISOString(), jobs: [] };
}

export async function loadBatchStatus(): Promise<BatchStatusFile> {
  try {
    const raw = await readFile(batchStatusPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<BatchStatusFile>;
    if (!Array.isArray(parsed.jobs)) return emptyBatch();
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      jobs: parsed.jobs,
    };
  } catch {
    return emptyBatch();
  }
}

export async function saveBatchStatus(file: BatchStatusFile): Promise<void> {
  const next = { ...file, updatedAt: new Date().toISOString() };
  await mkdir(batchStatusPath().replace(/\/[^/]+$/, ""), { recursive: true });
  await writeFile(batchStatusPath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export function getBatchJob(file: BatchStatusFile, rvtr: string): BatchSongStatus | undefined {
  return file.jobs.find((j) => j.rvtr === rvtr);
}

export function upsertBatchJob(file: BatchStatusFile, job: BatchSongStatus): BatchStatusFile {
  const rest = file.jobs.filter((j) => j.rvtr !== job.rvtr);
  return { ...file, jobs: [job, ...rest] };
}
