/**
 * Healing review CLI — Stand By Me cluster + JSON export.
 * Usage: npm run healing:review
 *        npm run healing:review -- stand_by_me
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { loadStandByMeClusterMeta } from "../lib/healing/clusters/stand-by-me";
import { formatHealingReviewSet } from "../lib/healing/format-review-report";
import { loadHealingReviewSet } from "../lib/healing/load-review-set";
import type { HealingClusterId } from "../lib/healing/types";

async function main() {
  const clusterArg = process.argv[2]?.trim() as HealingClusterId | undefined;
  const clusterId: HealingClusterId =
    clusterArg === "degraded_sample" ? "degraded_sample" : "stand_by_me";

  const review = await loadHealingReviewSet(clusterId);
  const clusterMeta =
    clusterId === "stand_by_me" ? await loadStandByMeClusterMeta() : [];

  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "tools/out");
  await mkdir(outDir, { recursive: true });

  const jsonPath = join(outDir, "healing-review-set.json");
  const metaPath = join(outDir, "stand-by-me-cluster.json");

  await writeFile(jsonPath, JSON.stringify(review, null, 2));
  if (clusterMeta.length > 0) {
    await writeFile(metaPath, JSON.stringify(clusterMeta, null, 2));
  }

  console.log(formatHealingReviewSet(review));
  console.log(`\nWrote ${jsonPath}`);
  if (clusterMeta.length > 0) console.log(`Wrote ${metaPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
