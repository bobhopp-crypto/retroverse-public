import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  BACKFILL_BATCH_SIZE,
  skipFailedRunReportPath,
  skipFailedRunStatePath,
} from "@/lib/covers/backfill/paths";
import { countCoveredRvalAlbums, loadMissingCoverQueue } from "@/lib/covers/backfill/queue";
import { selectMainOnlyBatch, recordSafeBatchResults } from "@/lib/covers/backfill/queue-progress";
import { buildBackfillRunReport } from "@/lib/covers/backfill/report";
import { processBackfillAlbum } from "@/lib/covers/backfill/run-batch-core";
import { loadBackfillState, saveBackfillState } from "@/lib/covers/backfill/state";
import type { BackfillAlbumResult, BackfillState } from "@/lib/covers/backfill/types";

export const SKIP_FAILED_RUN_LIMIT = 2000;

export type SkipFailedRunState = {
  version: 1;
  mode: "skip_failed";
  startedAt: string;
  updatedAt: string;
  limit: number;
  uniqueAlbumsProcessed: number;
  successfulAcquisitions: number;
  failedAcquisitions: number;
  mainCursorAtStart: number;
  mainCursorAtEnd: number | null;
  finished: boolean;
};

export type SkipFailedRunReport = ReturnType<typeof buildBackfillRunReport>;

function emptySkipRunState(limit: number, mainCursor: number): SkipFailedRunState {
  const now = new Date().toISOString();
  return {
    version: 1,
    mode: "skip_failed",
    startedAt: now,
    updatedAt: now,
    limit,
    uniqueAlbumsProcessed: 0,
    successfulAcquisitions: 0,
    failedAcquisitions: 0,
    mainCursorAtStart: mainCursor,
    mainCursorAtEnd: null,
    finished: false,
  };
}

export async function loadSkipFailedRunState(
  limit: number,
  mainCursor: number,
): Promise<SkipFailedRunState> {
  try {
    const raw = await readFile(skipFailedRunStatePath(), "utf8");
    const parsed = JSON.parse(raw) as SkipFailedRunState;
    if (parsed?.version === 1 && parsed.mode === "skip_failed" && !parsed.finished) {
      return parsed;
    }
  } catch {
    // fresh run
  }
  return emptySkipRunState(limit, mainCursor);
}

async function saveSkipFailedRunState(state: SkipFailedRunState): Promise<void> {
  await mkdir(skipFailedRunStatePath().replace(/\/[^/]+$/, ""), { recursive: true });
  state.updatedAt = new Date().toISOString();
  await writeFile(skipFailedRunStatePath(), JSON.stringify(state, null, 2));
}

/** @deprecated Use runCoverBackfillSafeSession — measurement-only wrapper. */
export async function runSkipFailedMeasurement(
  limit = SKIP_FAILED_RUN_LIMIT,
  batchSize = BACKFILL_BATCH_SIZE,
): Promise<{ run: SkipFailedRunState; report: SkipFailedRunReport }> {
  const pgQueue = await loadMissingCoverQueue();
  const backfillState = await loadBackfillState(pgQueue.length);
  const run = await loadSkipFailedRunState(limit, backfillState.mainCursor);
  const rowsByRval = new Map(pgQueue.map((r) => [r.rval, r]));
  const mainCursorAtStart = backfillState.mainCursor;

  while (run.uniqueAlbumsProcessed < run.limit && backfillState.mainCursor < pgQueue.length) {
    const remaining = run.limit - run.uniqueAlbumsProcessed;
    const slice = selectMainOnlyBatch(pgQueue, backfillState, Math.min(batchSize, remaining));
    if (slice.length === 0) break;

    const batchResults: BackfillAlbumResult[] = [];
    for (const row of slice) {
      const result = await processBackfillAlbum(row);
      batchResults.push(result);
      if (result.ok) run.successfulAcquisitions += 1;
      else run.failedAcquisitions += 1;
      run.uniqueAlbumsProcessed += 1;
      if (run.uniqueAlbumsProcessed >= run.limit) break;
    }

    recordSafeBatchResults(backfillState, batchResults, rowsByRval);
    backfillState.totalQueued = pgQueue.length;
    await saveBackfillState(backfillState);
    await saveSkipFailedRunState(run);

    process.stderr.write(
      `skip-failed progress ${run.uniqueAlbumsProcessed}/${run.limit} ok=${run.successfulAcquisitions} fail=${run.failedAcquisitions} cursor=${backfillState.mainCursor}\n`,
    );
  }

  run.finished = true;
  run.mainCursorAtEnd = backfillState.mainCursor;
  await saveSkipFailedRunState(run);
  await saveBackfillState(backfillState);

  const report = buildBackfillRunReport({
    state: backfillState,
    mainCursorBefore: mainCursorAtStart,
    mainCursorAfter: backfillState.mainCursor,
    currentlyCovered: await countCoveredRvalAlbums(),
    coversRemaining: (await loadMissingCoverQueue()).length,
  });

  await mkdir(skipFailedRunReportPath().replace(/\/[^/]+$/, ""), { recursive: true });
  await writeFile(skipFailedRunReportPath(), JSON.stringify(report, null, 2));

  return { run, report };
}

export { selectMainOnlyBatch, recordSafeBatchResults as recordSkipFailedResults };
