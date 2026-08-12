import type {
  BatchAcquireItem,
  BatchAcquireManifest,
  BatchAcquireSummary,
  BatchDownloadStatus,
} from "./types";

export function summarizeBatchItems(items: BatchAcquireItem[]): BatchAcquireSummary {
  const summary: BatchAcquireSummary = {
    queued: 0,
    searching: 0,
    downloaded: 0,
    needsReview: 0,
    failed: 0,
    complete: 0,
    awaitingRescan: 0,
  };
  for (const item of items) {
    switch (item.downloadStatus) {
      case "pending":
        summary.queued += 1;
        break;
      case "searching":
      case "approved":
      case "downloading":
        summary.searching += 1;
        break;
      case "needs_review":
        summary.needsReview += 1;
        break;
      case "failed":
        summary.failed += 1;
        break;
      case "complete":
      case "skipped":
        summary.complete += 1;
        break;
      case "awaiting_rescan":
        summary.awaitingRescan += 1;
        summary.downloaded += 1;
        break;
      default:
        break;
    }
  }
  return summary;
}

export function createBatchManifest(input: {
  batchId: string;
  scanId: string;
  filter: string;
  limit: number;
  items: BatchAcquireItem[];
}): BatchAcquireManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    batchId: input.batchId,
    scanId: input.scanId,
    filter: input.filter,
    limit: input.limit,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    summary: summarizeBatchItems(input.items),
    items: input.items,
  };
}

export function countBatchStatus(items: BatchAcquireItem[], status: BatchDownloadStatus): number {
  return items.filter((item) => item.downloadStatus === status).length;
}

export function findBatchItem(manifest: BatchAcquireManifest, targetRowKey: string): BatchAcquireItem | null {
  return manifest.items.find((item) => item.targetRowKey === targetRowKey) ?? null;
}

export function batchIsTerminal(manifest: BatchAcquireManifest): boolean {
  return manifest.items.every((item) =>
    ["complete", "failed", "skipped", "needs_review", "awaiting_rescan"].includes(item.downloadStatus),
  );
}

export function nextPendingBatchItem(manifest: BatchAcquireManifest): BatchAcquireItem | null {
  return manifest.items.find((item) => item.downloadStatus === "pending") ?? null;
}
