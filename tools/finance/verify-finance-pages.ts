#!/usr/bin/env npx tsx
import { ensureFinanceSchema } from "../../lib/ops/finance/db/ensure-schema";
import { listImportHistory } from "../../lib/ops/finance/db/import-stats";
import { loadStatementIntegrityReport } from "../../lib/ops/finance/statement-integrity-validation";

async function main() {
  const schemaOk = await ensureFinanceSchema();
  console.log("ensureFinanceSchema:", schemaOk);

  const history = await listImportHistory(5);
  console.log("listImportHistory:", history.length, "rows — first:", history[0]?.label ?? "(none)");

  const report = await loadStatementIntegrityReport();
  console.log(
    "statement-validation:",
    report
      ? `PASS=${report.summary.passCount} WARNING=${report.summary.warningCount} FAIL=${report.summary.failCount}`
      : "FAIL",
  );
}

main().catch((e) => {
  console.error("VERIFY FAILED:", e.message);
  process.exit(1);
});
