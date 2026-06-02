/**
 * 1967 In Both reconciliation audit (ops only).
 * Usage: npm run ops:in-both-audit
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  auditInBothReconciliation,
  countHypotheticalInBothWithOpsVideoOnly,
  summarizeExclusionCategories,
} from "../lib/ops/in-both-reconciliation/audit";
import {
  formatInBothAuditSummary,
  inBothAuditCsv,
} from "../lib/ops/in-both-reconciliation/format";
import { inspectPing } from "../lib/inspect/pg";

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error(`Postgres unavailable: ${ping.error ?? "unknown"}`);
    process.exit(1);
  }

  const year = 1967;
  const rows = await auditInBothReconciliation(year);
  const categoryCounts = await summarizeExclusionCategories(rows);
  const graphTrackIds = rows.map((r) => r.graphTrackId);
  const hypotheticalOpsVideoOnly = await countHypotheticalInBothWithOpsVideoOnly(
    year,
    graphTrackIds,
  );

  console.log(formatInBothAuditSummary(rows, categoryCounts));
  console.log("");
  console.log(`Hypothetical In Both if workspace used Year Match ops-VIDEO rule only: ${hypotheticalOpsVideoOnly}/${rows.length}`);

  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports", "1967_in_both_audit");
  await mkdir(outDir, { recursive: true });

  const csvPath = join(outDir, "matched-58-reconciliation.csv");
  const jsonPath = join(outDir, "matched-58-reconciliation.json");
  const summaryPath = join(outDir, "summary.txt");

  await Promise.all([
    writeFile(csvPath, inBothAuditCsv(rows)),
    writeFile(jsonPath, JSON.stringify({ year, rows, categoryCounts, hypotheticalOpsVideoOnly }, null, 2)),
    writeFile(
      summaryPath,
      `${formatInBothAuditSummary(rows, categoryCounts)}\n\nHypothetical In Both (ops-VIDEO only): ${hypotheticalOpsVideoOnly}/${rows.length}\n`,
    ),
  ]);

  console.log(`\nWrote:\n  ${csvPath}\n  ${jsonPath}\n  ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
