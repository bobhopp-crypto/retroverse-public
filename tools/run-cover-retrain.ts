#!/usr/bin/env npx tsx
/**
 * Re-score archive priorities from training decisions (no canonical writes).
 */
import { buildTrainingWeights, writeTrainingWeights } from "@/lib/cover-integrity/training-weights";
import { loadTrainingDecisions } from "@/lib/rv12/training-decisions";

async function main() {
  const store = await loadTrainingDecisions();
  const weights = buildTrainingWeights(store);
  const path = await writeTrainingWeights(weights);

  console.log("Cover training retrain complete");
  console.log(`  decisions: ${weights.decisionCount}`);
  console.log(`  excluded (marked correct): ${weights.excludedRvals.length}`);
  console.log(`  same-artist wrong boost: +${weights.sameArtistWrongBoost}`);
  console.log(`  compilation downrank: -${weights.compilationDownrank}`);
  console.log(`  weights: ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
