#!/usr/bin/env npx tsx
/**
 * Report training queue cleanup (identical-image removal).
 */
import { loadHashMatchIndexForBatch } from "@/lib/cover-integrity/load-cover-audit-csv";
import { prepareTrainingBatchForUi } from "@/lib/cover-integrity/prepare-training-batch";
import { loadTrainingBatchRows } from "@/lib/cover-integrity/training-batch";

async function main() {
  const loaded = await loadTrainingBatchRows();
  const hashes = loaded.rows
    .map((r) => r.currentHash)
    .filter((h): h is string => !!h);
  const hashMatches = await loadHashMatchIndexForBatch(hashes);
  const { rows, queueReport } = await prepareTrainingBatchForUi(loaded.rows, hashMatches);

  console.log("Training queue report");
  console.log(`  batch: ${loaded.manifest.batchId} (${loaded.manifest.csvFile})`);
  console.log(`  total in manifest: ${queueReport.totalInManifest}`);
  console.log(`  removed (identical images): ${queueReport.removedIdentical}`);
  console.log(`  remaining for review: ${queueReport.remaining}`);
  console.log(`  auto-resolved this run: ${queueReport.autoResolvedThisLoad}`);
  if (rows.length > 0) {
    console.log(`  next up: ${rows.map((r) => `${r.artist} — ${r.album}`).join("; ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
