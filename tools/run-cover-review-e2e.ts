#!/usr/bin/env npx tsx
/**
 * Prove cover review learning loop: decision → retrain → next batch.
 */
import { join } from "node:path";

import { loadRepairBatchCsv } from "@/lib/cover-integrity/load-repair-batch-csv";
import {
  generateNextTrainingBatch,
  loadTrainingBatchManifest,
  loadTrainingBatchRows,
} from "@/lib/cover-integrity/training-batch";
import { loadTrainingWeights, trainingWeightsPath } from "@/lib/cover-integrity/training-weights";
import {
  generateNextAcquireBatch,
  loadAcquireBatchManifest,
  loadAcquireBatchRows,
} from "@/lib/ops/review/covers/acquire-batch";
import { retrainCoverReview } from "@/lib/ops/review/covers/retrain";
import { loadTrainingDecisions, saveTrainingDecision } from "@/lib/rv12/training-decisions";

async function main() {
  const before = await loadTrainingDecisions();
  const beforeManifest = await loadTrainingBatchManifest();
  const beforeWeights = await loadTrainingWeights();

  const repairRows = await loadRepairBatchCsv(
    join(process.cwd(), "reports/cover_integrity/repair_batch_001.csv"),
  );
  const pendingRepair = repairRows.filter((r) => !before.byRval[r.rval]);
  const { rows } = await loadTrainingBatchRows();
  const pendingBatch = rows.filter((r) => !before.byRval[r.rval]);
  const target = pendingBatch[0] ?? pendingRepair[0] ?? repairRows[0];
  if (!target) {
    throw new Error("No repair batch rows available");
  }

  console.log("Step 1 — save training decision for", target.rval);
  await saveTrainingDecision({
    rval: target.rval,
    artist: target.artist,
    album: target.album,
    releaseYear: target.releaseYear,
    currentHash: target.currentHash ?? null,
    proposedHash: null,
    proposedSource: target.proposedSource ?? null,
    decision: "unsure",
    confidence: "medium",
    reason: "e2e_loop_test",
  });

  const mid = await loadTrainingDecisions();
  console.log(`  decisions: ${before.entries.length} → ${mid.entries.length}`);

  console.log("\nStep 2 — retrain");
  const { weights } = await retrainCoverReview();
  console.log(`  decisionCount: ${weights.decisionCount}`);
  console.log(`  needsPullBoost: +${weights.needsPullBoost}`);
  console.log(`  weights: ${trainingWeightsPath()}`);
  if (beforeWeights && weights.generatedAt <= beforeWeights.generatedAt) {
    console.warn("  warn: weights timestamp did not advance");
  }

  console.log("\nStep 3 — next integrity batch");
  const next = await generateNextTrainingBatch();
  console.log(`  batch: ${beforeManifest?.batchId ?? "?"} → ${next.batchId}`);
  console.log(`  rvals (${next.size}): ${next.rvals.join(", ") || "(pool exhausted)"}`);
  const stillQueued = next.rvals.includes(target.rval);
  console.log(`  reviewed RVAL excluded: ${stillQueued ? "FAIL" : "PASS"}`);

  console.log("\nStep 4 — next acquire batch");
  const acquireBefore = await loadAcquireBatchManifest();
  const acquireNext = await generateNextAcquireBatch();
  console.log(`  batch: ${acquireBefore?.batchId ?? "?"} → ${acquireNext.batchId}`);
  console.log(`  size: ${acquireNext.size}`);
  const { rows: acquireRows } = await loadAcquireBatchRows();
  console.log(`  loaded: ${acquireRows.map((r) => r.rval).join(", ")}`);

  if (stillQueued && next.size > 0) process.exit(1);
  console.log("\nE2E LOOP: PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
