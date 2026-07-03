import {
  buildPathToHashIndex,
  filterActionableTrainingRows,
  getTrainingRowContext,
} from "@/lib/cover-integrity/training-display";
import type { CoverAuditHashRow } from "@/lib/cover-integrity/load-cover-audit-csv";
import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";
import {
  loadTrainingBatchManifest,
  saveTrainingBatchManifest,
  TRAINING_BATCH_SIZE,
} from "@/lib/cover-integrity/training-batch";
import {
  loadTrainingDecisions,
  saveTrainingDecision,
} from "@/lib/rv12/training-decisions";

export type TrainingQueueReport = {
  totalInManifest: number;
  removedIdentical: number;
  remaining: number;
  autoResolvedThisLoad: number;
};

export async function prepareTrainingBatchForUi(
  rows: RepairBatchCsvRow[],
  hashMatches: Record<string, CoverAuditHashRow[]>,
): Promise<{
  rows: RepairBatchCsvRow[];
  autoResolvedCount: number;
  queueReport: TrainingQueueReport;
}> {
  const pathToHash = buildPathToHashIndex(rows, hashMatches);
  const { actionable, skippedRvals } = filterActionableTrainingRows(
    rows,
    hashMatches,
    pathToHash,
  );
  const store = await loadTrainingDecisions();
  let autoResolvedCount = 0;

  for (const rval of skippedRvals) {
    if (store.byRval[rval]) continue;
    const row = rows.find((r) => r.rval === rval);
    if (!row) continue;
    const ctx = getTrainingRowContext(row, hashMatches, pathToHash);
    await saveTrainingDecision({
      rval: row.rval,
      artist: row.artist,
      album: row.album,
      releaseYear: row.releaseYear,
      currentHash: row.currentHash,
      proposedHash: ctx.proposedHash,
      proposedSource: row.proposedSource,
      decision: "correct",
      confidence: "high",
      reason: "auto_identical_images",
    });
    autoResolvedCount += 1;
  }

  const manifest = await loadTrainingBatchManifest();
  if (manifest && skippedRvals.length > 0) {
    const skippedSet = new Set(skippedRvals);
    const nextRvals = manifest.rvals.filter((id) => !skippedSet.has(id));
    for (const row of actionable) {
      if (!nextRvals.includes(row.rval)) nextRvals.push(row.rval);
    }
    if (nextRvals.join(",") !== manifest.rvals.join(",")) {
      await saveTrainingBatchManifest({
        ...manifest,
        rvals: nextRvals,
        size: nextRvals.length,
      });
    }
  }

  const queueReport: TrainingQueueReport = {
    totalInManifest: rows.length,
    removedIdentical: skippedRvals.length,
    remaining: actionable.length,
    autoResolvedThisLoad: autoResolvedCount,
  };

  return { rows: actionable, autoResolvedCount, queueReport };
}
