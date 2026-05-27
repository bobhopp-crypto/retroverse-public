/**
 * Healing review CLI — degraded queue + optional cluster export.
 * Usage: npm run healing:review
 *        npm run healing:review -- cluster stand_by_me
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { HEALING_DEGRADATION_LABELS } from "../lib/healing/degradation";
import { loadHealingDegradedQueue } from "../lib/healing/load-degraded-queue";
import { loadHealingReviewSet } from "../lib/healing/load-review-set";
import type { HealingClusterId } from "../lib/healing/types";

function formatCounts(queue: Awaited<ReturnType<typeof loadHealingDegradedQueue>>): string {
  const lines = [
    "# Canonical enrichment healing v1 (read-only)",
    "",
    `Generated: ${queue.generatedAt}`,
    `Hot 100 missing links: ${queue.summary.hot100MissingLinks.toLocaleString()} / ${queue.summary.hot100Total.toLocaleString()} (${queue.summary.pctMissing}%)`,
    `Review queue size: ${queue.summary.queueSize}`,
    "",
    "## Counts by degradation type",
    "",
  ];
  for (const [key, label] of Object.entries(HEALING_DEGRADATION_LABELS)) {
    const count = queue.countsByType[key as keyof typeof queue.countsByType];
    lines.push(`- ${label}: ${count.toLocaleString()}`);
  }
  lines.push("", "## Queue preview", "");
  for (const row of queue.rows.slice(0, 15)) {
    lines.push(
      `- ${row.rvtr} · ${row.title} · ${row.artistName} · links ${row.albumLinkCount} · conf ${row.topConfidence?.toFixed(2) ?? "—"} · ${row.degradationFlags.join(", ")}`,
    );
  }
  return lines.join("\n");
}

async function main() {
  const mode = process.argv[2]?.trim();
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "tools/out");
  await mkdir(outDir, { recursive: true });

  if (mode === "cluster") {
    const clusterArg = process.argv[3]?.trim() as HealingClusterId | undefined;
    const clusterId: HealingClusterId =
      clusterArg === "degraded_sample" ? "degraded_sample" : "stand_by_me";
    const review = await loadHealingReviewSet(clusterId);
    const jsonPath = join(outDir, "healing-review-set.json");
    await writeFile(jsonPath, JSON.stringify(review, null, 2));
    console.log(`Wrote cluster review → ${jsonPath}`);
    return;
  }

  const queue = await loadHealingDegradedQueue();
  const jsonPath = join(outDir, "healing-degraded-queue.json");
  await writeFile(jsonPath, JSON.stringify(queue, null, 2));
  console.log(formatCounts(queue));
  console.log(`\nWrote ${jsonPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
