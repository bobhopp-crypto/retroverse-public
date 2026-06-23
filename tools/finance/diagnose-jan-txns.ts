#!/usr/bin/env npx tsx
import { inspectPing, inspectQuery } from "../../lib/inspect/pg";

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) process.exit(1);

  const staging = await inspectQuery<Record<string, unknown>>(
    `SELECT id, transaction_date::text, merchant, description, amount::text, flow_kind, duplicate_warning
     FROM finance_import_staging WHERE import_id = 33 ORDER BY transaction_date, id`,
  );

  const ledger = await inspectQuery<Record<string, unknown>>(
    `SELECT id, transaction_date::text, merchant, description, amount::text, flow_kind, archived_at::text
     FROM finance_transactions WHERE raw_import_id = 33 ORDER BY transaction_date, id`,
  );

  console.log("=== STAGING (import 33) ===", staging.length);
  let add = 0, sub = 0;
  for (const t of staging) {
    const amt = Number(t.amount);
    if (t.flow_kind === "income") add += amt;
    else sub += amt;
    console.log(`${t.transaction_date} | ${String(t.flow_kind).padEnd(8)} | ${amt.toFixed(2).padStart(10)} | dup=${t.duplicate_warning} | ${t.description}`);
  }
  console.log("Staging additions:", add, "subtractions:", sub, "calc end:", (2432.83 + add - sub).toFixed(2));

  console.log("\n=== LEDGER (import 33) ===", ledger.length);
  let ladd = 0, lsub = 0;
  for (const t of ledger) {
    const amt = Number(t.amount);
    if (t.flow_kind === "income") ladd += amt;
    else lsub += amt;
    console.log(`${t.transaction_date} | ${String(t.flow_kind).padEnd(8)} | ${amt.toFixed(2).padStart(10)} | archived=${t.archived_at ?? "no"} | ${t.description}`);
  }
  console.log("Ledger additions:", ladd, "subtractions:", lsub);

  // Find staging rows NOT in ledger
  const ledgerDescs = new Set(ledger.map((t) => `${t.transaction_date}|${t.description}|${t.amount}`));
  console.log("\n=== STAGING NOT IN LEDGER ===");
  for (const t of staging) {
    const key = `${t.transaction_date}|${t.description}|${t.amount}`;
    if (!ledgerDescs.has(key)) {
      console.log("MISSING:", key, t.flow_kind, "dup=", t.duplicate_warning);
    }
  }
}

main().catch(console.error);
