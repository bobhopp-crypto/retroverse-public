#!/usr/bin/env npx tsx
/**
 * Generate next training batch CSV + manifest (excludes reviewed RVALs).
 */
import { generateNextTrainingBatch } from "@/lib/cover-integrity/training-batch";
import { loadTrainingWeights } from "@/lib/cover-integrity/training-weights";

async function main() {
  const weights = await loadTrainingWeights();
  if (!weights) {
    console.warn("No training_weights.json — run npm run cover:retrain first (optional).");
  }

  const manifest = await generateNextTrainingBatch();
  console.log("Next training batch ready");
  console.log(`  batchId: ${manifest.batchId}`);
  console.log(`  csv: reports/cover_integrity/${manifest.csvFile}`);
  console.log(`  rows: ${manifest.size}`);
  console.log(`  excluded reviewed: ${manifest.excludedReviewed}`);
  console.log(`  rvals: ${manifest.rvals.join(", ")}`);
  console.log("\nOpen /ops/covers/train");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
