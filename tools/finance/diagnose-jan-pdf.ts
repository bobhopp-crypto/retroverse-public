#!/usr/bin/env npx tsx
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { inspectPing, inspectQuery } from "../../lib/inspect/pg";
import { parseNebatPdf } from "../../lib/ops/finance/parsers/nebat-pdf";

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) process.exit(1);

  const imp = await inspectQuery<{ storage_path: string; file_name: string }>(
    `SELECT storage_path, file_name FROM finance_imports WHERE id = 33`,
  );
  const path = imp[0]?.storage_path;
  if (!path) {
    console.log("No storage path");
    return;
  }

  const fullPath = path.startsWith("/") ? path : join(process.cwd(), path);
  const buffer = await readFile(fullPath);
  const parsed = await parseNebatPdf(buffer);

  if (parsed.kind !== "checking") {
    console.log("Not checking", parsed.kind);
    return;
  }

  console.log("=== PARSED FROM PDF ===", parsed.transactions.length);
  let add = 0, sub = 0;
  for (const t of parsed.transactions) {
    const amt = t.amount;
    if (t.flowKind === "income") add += amt;
    else sub += amt;
    console.log(`${t.transactionDate} | ${t.flowKind.padEnd(8)} | ${amt.toFixed(2).padStart(10)} | ${t.description}`);
  }
  console.log("Parsed additions:", add, "subtractions:", sub);

  const ledger = await inspectQuery<{ transaction_date: string; description: string; amount: string; flow_kind: string }>(
    `SELECT transaction_date::text, description, amount::text, flow_kind
     FROM finance_transactions WHERE raw_import_id = 33 AND archived_at IS NULL`,
  );
  const ledgerKeys = new Set(ledger.map((t) => `${t.transaction_date}|${t.description}|${Number(t.amount).toFixed(2)}`));

  console.log("\n=== MISSING FROM LEDGER ===");
  for (const t of parsed.transactions) {
    const key = `${t.transactionDate}|${t.description}|${t.amount.toFixed(2)}`;
    if (!ledgerKeys.has(key)) {
      console.log(`MISSING: ${t.transactionDate} | ${t.flowKind} | ${t.amount.toFixed(2)} | ${t.description}`);
    }
  }
}

main().catch(console.error);
