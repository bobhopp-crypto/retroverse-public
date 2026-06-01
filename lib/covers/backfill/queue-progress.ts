import { readFile } from "node:fs/promises";

import { backfillBatchLogPath } from "@/lib/covers/backfill/paths";
import type {
  BackfillAlbumResult,
  BackfillQueueRow,
  BackfillState,
  AlbumAttemptRecord,
} from "@/lib/covers/backfill/types";

export type BatchSelection = {
  slice: BackfillQueueRow[];
  fromMain: number;
  fromRetry: number;
  skippedDueToRetryRules: number;
};

export function syncUniqueCounts(state: BackfillState): void {
  state.uniqueFailureCount = Object.values(state.albumAttempts).filter(
    (a) => a.last_outcome === "failure",
  ).length;
  state.uniqueAlbumsProcessed = state.uniqueSuccessCount + state.uniqueFailureCount;
  state.retryQueueSize = state.retryQueue.length;
}

function retryCooldownMs(): number {
  const hours = Number(process.env.COVER_BACKFILL_RETRY_COOLDOWN_HOURS ?? "0");
  return Math.max(0, hours) * 3_600_000;
}

function isRetryEligible(record: AlbumAttemptRecord | undefined, nowMs: number): boolean {
  if (!record || record.last_outcome !== "failure") return true;
  const cooldown = retryCooldownMs();
  if (cooldown <= 0) return true;
  const last = Date.parse(record.last_attempt_at);
  if (Number.isNaN(last)) return true;
  return nowMs - last >= cooldown;
}

/** Pick next batch: advance main cursor; failures go to retry queue tail. */
export function selectNextBatch(
  pgQueue: BackfillQueueRow[],
  state: BackfillState,
  batchSize: number,
): BatchSelection {
  const byRval = new Map(pgQueue.map((r) => [r.rval, r]));
  const selected: BackfillQueueRow[] = [];
  const selectedRvals = new Set<string>();
  let fromMain = 0;
  let fromRetry = 0;
  let skippedDueToRetryRules = 0;
  const nowMs = Date.now();

  while (selected.length < batchSize && state.mainCursor < pgQueue.length) {
    const row = pgQueue[state.mainCursor];
    state.mainCursor += 1;
    if (!row) continue;
    selected.push(row);
    selectedRvals.add(row.rval);
    fromMain += 1;
  }

  const retryPending = [...state.retryQueue];
  state.retryQueue = [];

  for (const rval of retryPending) {
    if (selected.length >= batchSize) {
      state.retryQueue.push(rval);
      continue;
    }
    if (selectedRvals.has(rval)) {
      state.retryQueue.push(rval);
      continue;
    }
    const row = byRval.get(rval);
    if (!row) continue;

    const record = state.albumAttempts[rval];
    if (!isRetryEligible(record, nowMs)) {
      state.retryQueue.push(rval);
      skippedDueToRetryRules += 1;
      continue;
    }

    selected.push(row);
    selectedRvals.add(rval);
    fromRetry += 1;
  }

  return { slice: selected, fromMain, fromRetry, skippedDueToRetryRules };
}

/** Main queue only — failed albums deferred to retry queue, not processed this batch. */
export function selectMainOnlyBatch(
  pgQueue: BackfillQueueRow[],
  state: BackfillState,
  batchSize: number,
): BackfillQueueRow[] {
  const selected: BackfillQueueRow[] = [];
  while (selected.length < batchSize && state.mainCursor < pgQueue.length) {
    const row = pgQueue[state.mainCursor];
    state.mainCursor += 1;
    if (row) selected.push(row);
  }
  return selected;
}

/** Safe backfill: record failure metadata and move RVAL to retry queue tail. */
export function recordSafeBatchResults(
  state: BackfillState,
  results: BackfillAlbumResult[],
  rowsByRval: Map<string, BackfillQueueRow>,
): void {
  const now = new Date().toISOString();

  for (const result of results) {
    const rval = result.rval.trim().toUpperCase();
    const row = rowsByRval.get(rval);
    const prev = state.albumAttempts[rval];
    const attempt_count = (prev?.attempt_count ?? 0) + 1;

    if (result.ok) {
      state.albumAttempts[rval] = {
        last_attempt_at: now,
        attempt_count,
        failure_reason: null,
        last_outcome: "success",
        artist: row?.artist ?? prev?.artist,
        album: row?.album ?? prev?.album,
      };
      state.retryQueue = state.retryQueue.filter((r) => r !== rval);
      if (prev?.last_outcome !== "success") {
        state.uniqueSuccessCount += 1;
      }
      if (prev?.last_outcome === "failure") {
        state.uniqueFailureCount = Math.max(0, state.uniqueFailureCount - 1);
      }
    } else {
      state.albumAttempts[rval] = {
        last_attempt_at: now,
        attempt_count,
        failure_reason: result.reason,
        last_outcome: "failure",
        artist: row?.artist ?? prev?.artist,
        album: row?.album ?? prev?.album,
      };
      state.retryQueue = state.retryQueue.filter((r) => r !== rval);
      state.retryQueue.push(rval);
    }
  }

  syncUniqueCounts(state);
}

export function recordBatchResults(
  state: BackfillState,
  results: BackfillAlbumResult[],
): void {
  const now = new Date().toISOString();

  for (const result of results) {
    const rval = result.rval.trim().toUpperCase();
    const prev = state.albumAttempts[rval];
    const attempt_count = (prev?.attempt_count ?? 0) + 1;

    if (result.ok) {
      state.albumAttempts[rval] = {
        last_attempt_at: now,
        attempt_count,
        failure_reason: null,
        last_outcome: "success",
      };
      state.retryQueue = state.retryQueue.filter((r) => r !== rval);
      if (prev?.last_outcome !== "success") {
        state.uniqueSuccessCount += 1;
      }
      if (prev?.last_outcome === "failure") {
        state.uniqueFailureCount = Math.max(0, state.uniqueFailureCount - 1);
      }
    } else {
      state.albumAttempts[rval] = {
        last_attempt_at: now,
        attempt_count,
        failure_reason: result.reason,
        last_outcome: "failure",
      };
      if (!state.retryQueue.includes(rval)) {
        state.retryQueue.push(rval);
      } else {
        state.retryQueue = state.retryQueue.filter((r) => r !== rval);
        state.retryQueue.push(rval);
      }
    }
  }

  syncUniqueCounts(state);
}

/** Bootstrap v2 queue state from pre-fix stuck-head behavior. */
export async function migrateStuckHeadFromLatestBatch(state: BackfillState): Promise<void> {
  if (state.mainCursor > 0 || state.retryQueue.length > 0) return;

  let batchId = state.lastBatchId;
  if (!batchId) {
    for (let i = 42; i >= 1; i -= 1) {
      batchId = String(i).padStart(4, "0");
      try {
        await readFile(backfillBatchLogPath(batchId), "utf8");
        break;
      } catch {
        batchId = null;
      }
    }
  }
  if (!batchId) {
    return;
  }

  try {
    const raw = await readFile(backfillBatchLogPath(batchId), "utf8");
    const batch = JSON.parse(raw) as { results?: BackfillAlbumResult[] };
    const failed = (batch.results ?? []).filter((r) => !r.ok);
    if (failed.length === 0) return;

    const now = new Date().toISOString();
    state.mainCursor = failed.length;
    state.retryQueue = failed.map((r) => r.rval.trim().toUpperCase());

    for (const r of failed) {
      const rval = r.rval.trim().toUpperCase();
      state.albumAttempts[rval] = {
        last_attempt_at: now,
        attempt_count: state.currentBatchIndex || 1,
        failure_reason: r.reason,
        last_outcome: "failure",
      };
    }

    syncUniqueCounts(state);
  } catch {
    // no batch log — start fresh at cursor 0
  }
}
