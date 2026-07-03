import "server-only";

import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";

import { allstarExtractorOutputDir } from "./paths";

export type QueueItemState = "pending" | "processing" | "completed" | "failed";

export type PreserveQueueItem = {
  discId: string;
  scanFilename: string;
  state: QueueItemState;
  error: string | null;
  preservedAt: string | null;
  player?: string;
  archiveConfidence?: number;
  trustLevel?: string;
  canonicalFile?: string | null;
};

export type PreserveQueue = {
  version: number;
  status: "idle" | "running" | "paused";
  startedAt: string | null;
  pausedAt: string | null;
  updatedAt: string;
  total: number;
  counts: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  items: PreserveQueueItem[];
};

export function preserveQueuePath(): string {
  return `${allstarExtractorOutputDir()}/preserve-queue.json`;
}

export async function loadPreserveQueue(): Promise<PreserveQueue | null> {
  const path = preserveQueuePath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8")) as PreserveQueue;
  } catch {
    return null;
  }
}

export async function savePreserveQueue(queue: PreserveQueue): Promise<void> {
  queue.updatedAt = new Date().toISOString();
  await writeFile(preserveQueuePath(), `${JSON.stringify(queue, null, 2)}\n`, "utf8");
}
