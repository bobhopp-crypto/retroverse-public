import { countCoveredRvalAlbums, loadMissingCoverQueue } from "@/lib/covers/backfill/queue";
import { aggregateTopFailureReasons } from "@/lib/covers/backfill/report";
import { loadBackfillState } from "@/lib/covers/backfill/state";
import type { BackfillMetrics, BackfillStatus } from "@/lib/covers/backfill/types";

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function loadBackfillStatus(): Promise<BackfillStatus> {
  const queue = await loadMissingCoverQueue();
  const state = await loadBackfillState(queue.length);
  const coversRemaining = queue.length;
  const currentlyCovered = await countCoveredRvalAlbums();

  const todayStart = startOfTodayIso();
  const coversAcquiredToday = state.batchHistory
    .filter((b) => b.at >= todayStart)
    .reduce((sum, b) => sum + b.success, 0);

  const recent = state.batchHistory.slice(-6);
  const recentSuccess = recent.reduce((s, b) => s + b.success, 0);
  const recentMs = recent.reduce((s, b) => s + b.durationMs, 0);
  const averagePerHour =
    recentMs > 0 ? Math.round((recentSuccess / recentMs) * 3_600_000) : 0;

  const successRate =
    state.processedCount > 0
      ? Math.round((state.successCount / state.processedCount) * 1000) / 10
      : 0;

  const uniqueSuccessRate =
    state.uniqueSuccessCount + state.uniqueFailureCount > 0
      ? Math.round(
          (state.uniqueSuccessCount / (state.uniqueSuccessCount + state.uniqueFailureCount)) * 1000,
        ) / 10
      : 0;

  let etaMs: number | null = null;
  if (averagePerHour > 0 && coversRemaining > 0) {
    etaMs = Math.round((coversRemaining / averagePerHour) * 3_600_000);
  }

  const rateForProjection = uniqueSuccessRate > 0 ? uniqueSuccessRate / 100 : successRate / 100;
  const projectedAdditionalCovers = Math.round(coversRemaining * rateForProjection);
  const projectedTotalCovered = currentlyCovered + projectedAdditionalCovers;
  const rvalCorpus = currentlyCovered + coversRemaining;
  const projectedCoveragePct =
    rvalCorpus > 0 ? Math.round((projectedTotalCovered / rvalCorpus) * 1000) / 10 : 0;

  const metrics: BackfillMetrics = {
    coversRemaining,
    coversAcquiredToday,
    averagePerHour,
    successRate,
    uniqueSuccessRate,
    etaMs,
    uniqueAlbumsProcessed: state.uniqueAlbumsProcessed,
    uniqueSuccesses: state.uniqueSuccessCount,
    uniqueFailures: state.uniqueFailureCount,
    retryQueueSize: state.retryQueueSize,
    mainQueuePosition: state.mainCursor,
    skippedDueToRetryRules: state.skippedRetryTotal,
    currentlyCovered,
    projectedAdditionalCovers,
    projectedTotalCovered,
    projectedCoveragePct,
    topFailureReasons: aggregateTopFailureReasons(state).slice(0, 10),
  };

  let currentBatch = null;
  if (state.lastBatchId) {
    try {
      const { readFile } = await import("node:fs/promises");
      const { backfillBatchLogPath } = await import("@/lib/covers/backfill/paths");
      const raw = await readFile(backfillBatchLogPath(state.lastBatchId), "utf8");
      currentBatch = JSON.parse(raw);
    } catch {
      currentBatch = null;
    }
  }

  return { state, metrics, currentBatch };
}
