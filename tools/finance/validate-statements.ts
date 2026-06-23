#!/usr/bin/env npx tsx
/**
 * Phase A statement integrity validation (CLI).
 * Run: npx tsx tools/finance/validate-statements.ts
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const { ensureFinanceSchema } = await import("../../lib/ops/finance/db/ensure-schema");
  const { loadStatementIntegrityReport } = await import(
    "../../lib/ops/finance/statement-integrity-validation"
  );

  const ok = await ensureFinanceSchema();
  if (!ok) {
    console.error("Postgres offline");
    process.exit(1);
  }

  const report = await loadStatementIntegrityReport();
  if (!report) {
    console.error("Failed to build report");
    process.exit(1);
  }

  const outPath = join(process.cwd(), "reports/finance-statement-validation.json");
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`Statements: ${report.statementCount}`);
  console.log(
    `PASS: ${report.summary.passCount} · WARNING: ${report.summary.warningCount} · FAIL: ${report.summary.failCount}`,
  );
  console.log(`Report: ${outPath}`);
  for (const row of report.rows) {
    console.log(
      `[${row.classification}] ${row.accountName} · ${row.statementLabel} · txns=${row.transactionCount} ledger=${row.ledgerTransactionCount} archived=${row.archivedTransactionCount} · begin=${row.beginningBalance} end=${row.endingBalance}`,
    );
    for (const note of row.notes) console.log(`       note: ${note}`);
    for (const issue of row.issues) console.log(`       issue: ${issue}`);
    if (row.recommendation) console.log(`       fix: ${row.recommendation}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
