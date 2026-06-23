#!/usr/bin/env npx tsx
import { inspectPing, inspectQuery } from "../../lib/inspect/pg";

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres offline");
    process.exit(1);
  }

  const importId = 33;

  const imp = await inspectQuery<Record<string, unknown>>(
    `SELECT id, file_name, source, workflow_status, institution_account_id,
            beginning_balance::text, ending_balance::text,
            statement_start::text, statement_end::text,
            transaction_count, posted_transaction_count
     FROM finance_imports WHERE id = $1`,
    [importId],
  );

  const nebat = await inspectQuery<Record<string, unknown>>(
    `SELECT id, statement_start::text, statement_end::text,
            beginning_balance::text, ending_balance::text,
            total_additions::text, total_subtractions::text, raw_import_id
     FROM finance_nebat_statements
     WHERE raw_import_id = $1
        OR statement_end = '2026-01-31'
     ORDER BY statement_end DESC LIMIT 3`,
    [importId],
  );

  const txns = await inspectQuery<{
    id: number;
    transaction_date: string;
    merchant: string;
    description: string;
    amount: string;
    flow_kind: string;
  }>(
    `SELECT id, transaction_date::text, merchant, description, amount::text, flow_kind
     FROM finance_transactions
     WHERE raw_import_id = $1 AND archived_at IS NULL
     ORDER BY transaction_date, id`,
    [importId],
  );

  console.log("=== IMPORT 33 ===");
  console.log(JSON.stringify(imp[0], null, 2));
  console.log("=== NEBAT STATEMENT ROWS ===");
  console.log(JSON.stringify(nebat, null, 2));
  console.log("=== ACTIVE TRANSACTIONS ===");

  let additions = 0;
  let subtractions = 0;
  for (const t of txns) {
    const amt = Number(t.amount);
    if (t.flow_kind === "income") additions += amt;
    else subtractions += amt;
    console.log(
      `${t.transaction_date} | ${t.flow_kind.padEnd(8)} | ${amt.toFixed(2).padStart(10)} | ${t.description}`,
    );
  }

  const begin = Number(imp[0]?.beginning_balance ?? nebat[0]?.beginning_balance);
  const calc = Number((begin + additions - subtractions).toFixed(2));
  const stmtEnd = Number(imp[0]?.ending_balance ?? nebat[0]?.ending_balance);
  const nebatAdd = Number(nebat[0]?.total_additions ?? 0);
  const nebatSub = Number(nebat[0]?.total_subtractions ?? 0);
  const nebatCalc = Number((begin + nebatAdd - nebatSub).toFixed(2));

  console.log("\n=== BALANCE RECONCILIATION ===");
  console.log("Beginning balance:", begin);
  console.log("Ledger additions:", additions);
  console.log("Ledger subtractions:", subtractions);
  console.log("Calculated ending (ledger):", calc);
  console.log("Statement ending:", stmtEnd);
  console.log("Variance:", (calc - stmtEnd).toFixed(2));
  console.log("\nNEBAT statement additions:", nebatAdd);
  console.log("NEBAT statement subtractions:", nebatSub);
  console.log("Calculated ending (NEBAT stmt):", nebatCalc);
  console.log("NEBAT stmt variance:", (nebatCalc - stmtEnd).toFixed(2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
