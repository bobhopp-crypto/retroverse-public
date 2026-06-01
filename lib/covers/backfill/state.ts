import { mkdir, readFile, writeFile } from "node:fs/promises";

import { migrateStuckHeadFromLatestBatch, syncUniqueCounts } from "@/lib/covers/backfill/queue-progress";
import { backfillStatePath } from "@/lib/covers/backfill/paths";
import type { BackfillState } from "@/lib/covers/backfill/types";

function emptyState(totalQueued: number): BackfillState {
  const now = new Date().toISOString();
  return {
    version: 2,
    startedAt: now,
    updatedAt: now,
    mainCursor: 0,
    retryQueue: [],
    albumAttempts: {},
    uniqueAlbumsProcessed: 0,
    uniqueSuccessCount: 0,
    uniqueFailureCount: 0,
    retryQueueSize: 0,
    skippedRetryTotal: 0,
    cursor: 0,
    totalQueued: totalQueued,
    processedCount: 0,
    successCount: 0,
    failureCount: 0,
    currentBatchIndex: 0,
    paused: false,
    running: false,
    lastBatchAt: null,
    lastBatchId: null,
    lastError: null,
    batchHistory: [],
  };
}

type LegacyStateV1 = {
  version: 1;
  processedCount?: number;
  successCount?: number;
  failureCount?: number;
  currentBatchIndex?: number;
  cursor?: number;
  [key: string]: unknown;
};

function migrateV1ToV2(parsed: LegacyStateV1, totalQueued: number): BackfillState {
  const now = new Date().toISOString();
  return {
    version: 2,
    startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : now,
    updatedAt: now,
    mainCursor: 0,
    retryQueue: [],
    albumAttempts: {},
    uniqueAlbumsProcessed: 0,
    uniqueSuccessCount: parsed.successCount ?? 0,
    uniqueFailureCount: 0,
    retryQueueSize: 0,
    skippedRetryTotal: 0,
    cursor: parsed.cursor ?? parsed.processedCount ?? 0,
    totalQueued,
    processedCount: parsed.processedCount ?? 0,
    successCount: parsed.successCount ?? 0,
    failureCount: parsed.failureCount ?? 0,
    currentBatchIndex: parsed.currentBatchIndex ?? 0,
    paused: Boolean(parsed.paused),
    running: Boolean(parsed.running),
    lastBatchAt: typeof parsed.lastBatchAt === "string" ? parsed.lastBatchAt : null,
    lastBatchId: typeof parsed.lastBatchId === "string" ? parsed.lastBatchId : null,
    lastError: typeof parsed.lastError === "string" ? parsed.lastError : null,
    batchHistory: Array.isArray(parsed.batchHistory) ? (parsed.batchHistory as BackfillState["batchHistory"]) : [],
  };
}

export async function loadBackfillState(totalQueued?: number): Promise<BackfillState> {
  try {
    const raw = await readFile(backfillStatePath(), "utf8");
    const parsed = JSON.parse(raw) as BackfillState | LegacyStateV1;

    let state: BackfillState;
    if (parsed?.version === 2 && typeof parsed.mainCursor === "number") {
      state = parsed as BackfillState;
    } else if (parsed?.version === 1) {
      state = migrateV1ToV2(parsed, totalQueued ?? parsed.totalQueued ?? 0);
      await migrateStuckHeadFromLatestBatch(state);
      await saveBackfillState(state);
    } else {
      return emptyState(totalQueued ?? 0);
    }

    if (totalQueued != null && state.totalQueued !== totalQueued) {
      state.totalQueued = totalQueued;
    }

    syncUniqueCounts(state);
    return state;
  } catch {
    // fresh state
  }
  return emptyState(totalQueued ?? 0);
}

export async function saveBackfillState(state: BackfillState): Promise<void> {
  await mkdir(backfillStatePath().replace(/\/[^/]+$/, ""), { recursive: true });
  state.updatedAt = new Date().toISOString();
  state.retryQueueSize = state.retryQueue.length;
  await writeFile(backfillStatePath(), JSON.stringify(state, null, 2));
}

export async function resetBackfillState(totalQueued: number): Promise<BackfillState> {
  const state = emptyState(totalQueued);
  await saveBackfillState(state);
  return state;
}
