import { BACKFILL_BATCH_SIZE } from "@/lib/covers/backfill/paths";
import { loadMissingCoverQueue } from "@/lib/covers/backfill/queue";
import { runCoverBackfillSafeBatch, runCoverBackfillSafeSession } from "@/lib/covers/backfill/safe-run";
import type { SafeRunOptions } from "@/lib/covers/backfill/safe-run";
import { loadBackfillState, saveBackfillState } from "@/lib/covers/backfill/state";
import type { BackfillBatchResult, BackfillState } from "@/lib/covers/backfill/types";

export { processBackfillAlbum } from "@/lib/covers/backfill/run-batch-core";
export { runCoverBackfillSafeSession, type SafeRunOptions };

/** One safe batch — main queue first, failures deferred to retry queue. */
export async function runCoverBackfillBatch(
  batchSize = BACKFILL_BATCH_SIZE,
  options: Omit<SafeRunOptions, "batchSize" | "limit"> = {},
): Promise<{ state: BackfillState; batch: BackfillBatchResult }> {
  const pgQueue = await loadMissingCoverQueue();
  const state = await loadBackfillState(pgQueue.length);
  const { state: next, batch } = await runCoverBackfillSafeBatch(state, pgQueue, {
    ...options,
    batchSize,
    retryFailures: options.retryFailures ?? false,
  });
  await saveBackfillState(next);
  return { state: next, batch };
}
