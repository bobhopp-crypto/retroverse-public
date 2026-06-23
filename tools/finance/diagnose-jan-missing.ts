#!/usr/bin/env npx tsx
import { inspectPing, inspectQuery } from "../../lib/inspect/pg";

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) process.exit(1);

  // Jan 2026 period transactions on NEBAT checking (institution_account_id = 1)
  const periodTxns = await inspectQuery<Record<string, unknown>>(
    `SELECT id, raw_import_id, transaction_date::text, description, amount::text, flow_kind
     FROM finance_transactions
     WHERE institution_account_id = 1
       AND archived_at IS NULL
       AND transaction_date BETWEEN '2025-12-16' AND '2026-01-20'
     ORDER BY transaction_date, id`,
  );

  console.log("=== ALL NEBAT TXNS IN JAN STATEMENT PERIOD ===", periodTxns.length);
  for (const t of periodTxns) {
    console.log(`import=${t.raw_import_id} | ${t.transaction_date} | ${String(t.flow_kind).padEnd(8)} | ${Number(t.amount).toFixed(2).padStart(10)} | ${t.description}`);
  }

  // Imports for nebat checking around that time
  const imports = await inspectQuery<Record<string, unknown>>(
    `SELECT id, file_name, workflow_status, transaction_count, posted_transaction_count,
            statement_start::text, statement_end::text
     FROM finance_imports
     WHERE institution_account_id = 1
       AND statement_end >= '2025-12-01'
     ORDER BY statement_end`,
  );
  console.log("\n=== NEBAT IMPORTS ===");
  console.log(JSON.stringify(imports, null, 2));

  // NEBAT statement totals vs what's needed
  const stmt = await inspectQuery<Record<string, unknown>>(
    `SELECT total_additions::text, total_subtractions::text FROM finance_nebat_statements WHERE raw_import_id = 33`,
  );
  const add = Number(stmt[0]?.total_additions);
  const sub = Number(stmt[0]?.total_subtractions);
  const posted = periodTxns.filter((t) => t.raw_import_id === "33");
  let padd = 0, psub = 0;
  for (const t of posted) {
    const amt = Number(t.amount);
    if (t.flow_kind === "income") padd += amt;
    else psub += amt;
  }
  console.log("\n=== VARIANCE BREAKDOWN ===");
  console.log("Statement additions:", add, "posted:", padd, "missing additions:", (add - padd).toFixed(2));
  console.log("Statement subtractions:", sub, "posted:", psub, "missing subtractions:", (sub - psub).toFixed(2));
  console.log("Net missing impact on balance:", ((add - padd) - (sub - psub)).toFixed(2));
}

main().catch(console.error);
