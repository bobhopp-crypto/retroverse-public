/**
 * Generate human-review repair batch 001 (no DB or cover writes).
 * Usage: npm run cover:repair-batch
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import {
  buildRepairBatch001,
  repairBatchToCsv,
  repairBatchToHtml,
  summarizeBatchCategories,
} from "../lib/cover-integrity/repair-batch";
import { runCoverIntegrityAudit } from "../lib/cover-integrity/run-audit";

async function main() {
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports/cover_integrity");

  console.log("Building repair batch 001 (read-only)…\n");
  const { rows: scored } = await runCoverIntegrityAudit();
  const batch = await buildRepairBatch001(scored);
  const categories = summarizeBatchCategories(batch);

  await mkdir(outDir, { recursive: true });
  const csvPath = join(outDir, "repair_batch_001.csv");
  const htmlPath = join(outDir, "repair_batch_001.html");

  await writeFile(csvPath, repairBatchToCsv(batch));
  await writeFile(htmlPath, repairBatchToHtml(batch));

  console.log(`Batch size: ${batch.length}`);
  console.log(`Categories: ${JSON.stringify(categories)}`);

  const elton = batch.filter((r) => r.artist.toLowerCase().includes("elton john"));
  console.log(`\nElton in batch: ${elton.map((r) => r.rval).join(", ") || "none"}`);

  const beatles = batch.filter((r) => /\bbeatles\b/i.test(r.artist));
  console.log(`Beatles in batch: ${beatles.length}`);

  const noCandidate = batch.filter((r) => r.proposedConfidence < 60);
  console.log(`Low-confidence proposals (<60): ${noCandidate.length}`);

  console.log(`\nWrote:\n  ${csvPath}\n  ${htmlPath}`);
  console.log("\nNo DB writes. No image bytes changed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
