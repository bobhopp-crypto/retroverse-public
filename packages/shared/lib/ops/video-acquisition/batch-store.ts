import "server-only";

import { createHash } from "crypto";
import { readFile } from "fs/promises";

import { writeJsonAtomic } from "@/lib/ops/virtualdj-media-coverage/atomic-json";

import {
  batchIsTerminal,
  createBatchManifest,
  findBatchItem,
  nextPendingBatchItem,
  summarizeBatchItems,
} from "./batch-summary";
import { batchManifestPath } from "./paths";
import type { BatchAcquireItem, BatchAcquireManifest } from "./types";

export {
  batchIsTerminal,
  countBatchStatus,
  createBatchManifest,
  findBatchItem,
  nextPendingBatchItem,
  summarizeBatchItems,
} from "./batch-summary";

export function createBatchId(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const suffix = createHash("sha256")
    .update(`${stamp}-${process.pid}-${Math.random()}`)
    .digest("hex")
    .slice(0, 8);
  return `batch-${stamp}-${suffix}`;
}

export async function loadBatchManifest(batchId: string): Promise<BatchAcquireManifest | null> {
  try {
    const parsed = JSON.parse(await readFile(batchManifestPath(batchId), "utf8")) as BatchAcquireManifest;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveBatchManifest(manifest: BatchAcquireManifest): Promise<string> {
  const next: BatchAcquireManifest = {
    ...manifest,
    updatedAt: new Date().toISOString(),
    summary: summarizeBatchItems(manifest.items),
  };
  const path = batchManifestPath(manifest.batchId);
  await writeJsonAtomic(path, next);
  return path;
}

export async function updateBatchItem(
  batchId: string,
  targetRowKey: string,
  patch: Partial<BatchAcquireItem>,
): Promise<BatchAcquireManifest> {
  const manifest = await loadBatchManifest(batchId);
  if (!manifest) throw new Error("Batch manifest not found");
  const items = manifest.items.map((item) =>
    item.targetRowKey === targetRowKey ? { ...item, ...patch } : item,
  );
  const next: BatchAcquireManifest = {
    ...manifest,
    items,
    summary: summarizeBatchItems(items),
    updatedAt: new Date().toISOString(),
  };
  await saveBatchManifest(next);
  return next;
}

export async function updateBatchManifest(
  batchId: string,
  patch: Partial<Pick<BatchAcquireManifest, "status" | "items">>,
): Promise<BatchAcquireManifest> {
  const manifest = await loadBatchManifest(batchId);
  if (!manifest) throw new Error("Batch manifest not found");
  const items = patch.items ?? manifest.items;
  const next: BatchAcquireManifest = {
    ...manifest,
    ...patch,
    items,
    summary: summarizeBatchItems(items),
    updatedAt: new Date().toISOString(),
  };
  await saveBatchManifest(next);
  return next;
}
