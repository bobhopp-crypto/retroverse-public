import { mkdir, writeFile } from "node:fs/promises";

import {
  BACKFILL_BATCH_SIZE,
  backfillBatchLogPath,
} from "@/lib/covers/backfill/paths";
import { countCoveredRvalAlbums, loadMissingCoverQueue } from "@/lib/covers/backfill/queue";
import {
  recordSafeBatchResults,
  selectMainOnlyBatch,
  selectNextBatch,
} from "@/lib/covers/backfill/queue-progress";
import { buildBackfillRunReport, writeBackfillRunReport } from "@/lib/covers/backfill/report";
import type { BackfillRunReport } from "@/lib/covers/backfill/report";
import { processBackfillAlbum } from "@/lib/covers/backfill/run-batch-core";
import { loadBackfillState, saveBackfillState } from "@/lib/covers/backfill/state";
import type { BackfillAlbumResult, BackfillBatchResult, BackfillState } from "@/lib/covers/backfill/types";

export type SafeRunOptions = {
  batchSize?: number;
  /** Stop after this many unique albums in the session (null = until paused/exhausted). */
  limit?: number | null;
  /** Process deferred retry queue during this run (default false). */
  retryFailures?: boolean;
  writeReport?: boolean;
};

export type SafeRunSessionResult = {
  state: BackfillState;
  sessionProcessed: number;
  sessionSuccess: number;
  sessionFailure: number;
  mainCursorBefore: number;
  mainCursorAfter: number;
  report: BackfillRunReport | null;
  batches: BackfillBatchResult[];
};

export async function runCoverBackfillSafeBatch(
  state: BackfillState,
  pgQueue: Awaited<ReturnType<typeof loadMissingCoverQueue>>,
  options: SafeRunOptions = {},
): Promise<{ state: BackfillState; batch: BackfillBatchResult; sessionDone: boolean }> {
  const batchSize = options.batchSize ?? BACKFILL_BATCH_SIZE;
  const retryFailures = options.retryFailures ?? false;
  const rowsByRval = new Map(pgQueue.map((r) => [r.rval, r]));

  const batchIndex = state.currentBatchIndex + 1;
  const batchId = String(batchIndex).padStart(4, "0");

  const selection = retryFailures
    ? selectNextBatch(pgQueue, state, batchSize)
    : {
        slice: selectMainOnlyBatch(pgQueue, state, batchSize),
        fromMain: 0,
        fromRetry: 0,
        skippedDueToRetryRules: 0,
      };

  if (!retryFailures) {
    selection.fromMain = selection.slice.length;
  }

  const slice = selection.slice;
  if (slice.length === 0) {
    state.running = false;
    return {
      state,
      sessionDone: true,
      batch: {
        batchId,
        batchIndex,
        processed: 0,
        success: 0,
        failure: 0,
        fromMain: 0,
        fromRetry: 0,
        skippedDueToRetryRules: selection.skippedDueToRetryRules,
        results: [],
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 0,
      },
    };
  }

  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const results: BackfillAlbumResult[] = [];
  let success = 0;
  let failure = 0;

  for (const row of slice) {
    const result = await processBackfillAlbum(row);
    results.push(result);
    if (result.ok) success += 1;
    else failure += 1;
  }

  recordSafeBatchResults(state, results, rowsByRval);
  if (retryFailures) {
    state.skippedRetryTotal += selection.skippedDueToRetryRules;
  }

  const durationMs = Date.now() - t0;
  const finishedAt = new Date().toISOString();

  state.cursor = state.processedCount + slice.length;
  state.processedCount += slice.length;
  state.successCount += success;
  state.failureCount += failure;
  state.currentBatchIndex = batchIndex;
  state.lastBatchAt = finishedAt;
  state.lastBatchId = batchId;
  state.totalQueued = pgQueue.length;
  state.lastError = failure > 0 ? results.find((r) => !r.ok)?.reason ?? null : null;

  state.batchHistory.push({
    batchId,
    at: finishedAt,
    processed: slice.length,
    success,
    failure,
    durationMs,
    fromMain: selection.fromMain,
    fromRetry: selection.fromRetry,
    skippedDueToRetryRules: selection.skippedDueToRetryRules,
  });
  if (state.batchHistory.length > 48) {
    state.batchHistory = state.batchHistory.slice(-48);
  }

  const batch: BackfillBatchResult = {
    batchId,
    batchIndex,
    processed: slice.length,
    success,
    failure,
    fromMain: selection.fromMain,
    fromRetry: selection.fromRetry,
    skippedDueToRetryRules: selection.skippedDueToRetryRules,
    results,
    startedAt,
    finishedAt,
    durationMs,
  };

  await mkdir(backfillBatchLogPath(batchId).replace(/\/[^/]+$/, ""), { recursive: true });
  await writeFile(backfillBatchLogPath(batchId), JSON.stringify(batch, null, 2));

  return { state, batch, sessionDone: false };
}

export async function runCoverBackfillSafeSession(
  options: SafeRunOptions = {},
): Promise<SafeRunSessionResult> {
  const pgQueue = await loadMissingCoverQueue();
  const state = await loadBackfillState(pgQueue.length);
  const mainCursorBefore = state.mainCursor;
  const limit = options.limit ?? null;
  const writeReport = options.writeReport ?? true;

  let sessionProcessed = 0;
  let sessionSuccess = 0;
  let sessionFailure = 0;
  const batches: BackfillBatchResult[] = [];

  state.running = true;
  await saveBackfillState(state);

  while (!state.paused) {
    if (limit != null && sessionProcessed >= limit) break;

    const remaining = (await loadMissingCoverQueue()).length;
    if (remaining <= 0) break;

    const batchSize =
      limit != null
        ? Math.min(options.batchSize ?? BACKFILL_BATCH_SIZE, limit - sessionProcessed)
        : (options.batchSize ?? BACKFILL_BATCH_SIZE);

    if (batchSize <= 0) break;

    const freshQueue = await loadMissingCoverQueue();
    const { state: nextState, batch, sessionDone } = await runCoverBackfillSafeBatch(
      state,
      freshQueue,
      { ...options, batchSize },
    );
    Object.assign(state, nextState);

    if (batch.processed === 0 || sessionDone) break;

    sessionProcessed += batch.processed;
    sessionSuccess += batch.success;
    sessionFailure += batch.failure;
    batches.push(batch);

    await saveBackfillState(state);

    process.stderr.write(
      `safe-backfill session ${sessionProcessed}${limit != null ? `/${limit}` : ""} ok=${sessionSuccess} fail=${sessionFailure} cursor=${state.mainCursor} retry=${state.retryQueue.length}\n`,
    );

    if (limit != null && sessionProcessed >= limit) break;
  }

  state.running = false;
  await saveBackfillState(state);

  const coversRemaining = (await loadMissingCoverQueue()).length;
  const currentlyCovered = await countCoveredRvalAlbums();
  let report: BackfillRunReport | null = null;
  if (writeReport) {
    report = buildBackfillRunReport({
      state,
      mainCursorBefore,
      mainCursorAfter: state.mainCursor,
      currentlyCovered,
      coversRemaining,
    });
    await writeBackfillRunReport(report);
  }

  return {
    state,
    sessionProcessed,
    sessionSuccess,
    sessionFailure,
    mainCursorBefore,
    mainCursorAfter: state.mainCursor,
    report,
    batches,
  };
}
