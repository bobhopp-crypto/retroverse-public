import {
  formatClassificationCounts,
  initializeVideoUniverseClassification,
} from "../../lib/ops/year-workspace/init-classification";
import { inspectPing } from "../../lib/inspect/pg";

const YEAR = 1967;

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("PG offline:", ping.error);
    process.exit(1);
  }

  const result = await initializeVideoUniverseClassification(YEAR);

  console.log(`1967 Video Universe classification init`);
  console.log(`Total: ${result.total}`);
  console.log(`Persisted: ${result.persisted}`);
  console.log(formatClassificationCounts(result.counts));

  if (result.total !== 130) {
    console.error(`Expected 130 videos, got ${result.total}`);
    process.exit(1);
  }
}

void main();
