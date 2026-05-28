import {
  filterActionableTrainingRows,
  getTrainingRowContext,
} from "@/lib/cover-integrity/training-display";
import type { CoverAuditHashRow } from "@/lib/cover-integrity/load-cover-audit-csv";
import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";
import {
  loadTrainingDecisions,
  saveTrainingDecision,
} from "@/lib/rv12/training-decisions";

export async function prepareTrainingBatchForUi(
  rows: RepairBatchCsvRow[],
  hashMatches: Record<string, CoverAuditHashRow[]>,
): Promise<{
  rows: RepairBatchCsvRow[];
  autoResolvedCount: number;
}> {
  const { actionable, skippedRvals } = filterActionableTrainingRows(rows, hashMatches);
  const store = await loadTrainingDecisions();
  let autoResolvedCount = 0;

  for (const rval of skippedRvals) {
    if (store.byRval[rval]) continue;
    const row = rows.find((r) => r.rval === rval);
    if (!row) continue;
    const ctx = getTrainingRowContext(row, hashMatches);
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

  return { rows: actionable, autoResolvedCount };
}
