/**
 * One-time seed: workbook → finance_transactions (read-only workbook).
 * Usage: npx tsx tools/finance/seed-from-workbook.ts
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { createFinanceImport, updateFinanceImport } from "@/lib/ops/finance/db/imports";
import { listFinanceRules } from "@/lib/ops/finance/db/rules";
import { insertFinanceTransactions } from "@/lib/ops/finance/db/transactions";
import type { ParsedFinanceRow } from "@/lib/ops/finance/finance-model";
import { inspectPing } from "@/lib/inspect/pg";

const execFileAsync = promisify(execFile);

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres unavailable");
    process.exit(1);
  }
  await ensureFinanceSchema();

  const workbook =
    process.env.FINANCE_WORKBOOK_PATH?.trim() ||
    "/Users/bobhopp/FINANCIAL/2021-2026 Financial Workbook.xlsx";

  const { stdout } = await execFileAsync("python3", [
    "tools/finance/export-workbook-txns.py",
    workbook,
  ], { cwd: process.cwd(), maxBuffer: 50 * 1024 * 1024 });

  const rows = JSON.parse(stdout) as ParsedFinanceRow[];
  console.log(`Loaded ${rows.length} workbook transactions`);

  const imp = await createFinanceImport({
    source: "apple_card",
    fileName: "workbook-seed",
    fileType: "application/seed",
    status: "parsing",
  });

  const rules = await listFinanceRules();
  const result = await insertFinanceTransactions(rows, imp.id, rules);

  await updateFinanceImport(imp.id, {
    status: "parsed",
    transactionCount: result.inserted,
  });

  console.log(
    `Seed complete: inserted=${result.inserted} skipped=${result.skipped} auto=${result.autoCategorized}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
