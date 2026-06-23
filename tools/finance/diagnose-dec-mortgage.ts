#!/usr/bin/env npx tsx
import { inspectPing, inspectQuery } from "../../lib/inspect/pg";

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) process.exit(1);

  const dec = await inspectQuery<Record<string, unknown>>(
    `SELECT fi.id, fi.statement_end::text, fi.transaction_count, fi.posted_transaction_count,
            fi.beginning_balance::text, fi.ending_balance::text,
            (SELECT COUNT(*) FROM finance_transactions t WHERE t.raw_import_id = fi.id AND t.archived_at IS NULL) AS active_count,
            (SELECT COUNT(*) FROM finance_transactions t WHERE t.raw_import_id = fi.id AND t.archived_at IS NOT NULL) AS archived_count
     FROM finance_imports fi WHERE fi.id = 34`,
  );

  const mort = await inspectQuery<Record<string, unknown>>(
    `SELECT fi.id, fi.workflow_status, fi.posted_at::text,
            ms.statement_date::text, ms.outstanding_principal::text,
            ms.principal::text, ms.interest::text, ms.scheduled_payment::text,
            (SELECT COUNT(*) FROM finance_transactions t WHERE t.raw_import_id = fi.id AND t.archived_at IS NULL) AS active_txns
     FROM finance_imports fi
     JOIN finance_mortgage_statements ms ON ms.raw_import_id = fi.id
     WHERE fi.id = 28`,
  );

  console.log("=== DEC 2025 IMPORT 34 ===");
  console.log(JSON.stringify(dec[0], null, 2));
  console.log("=== MORTGAGE IMPORT 28 ===");
  console.log(JSON.stringify(mort[0], null, 2));
}

main().catch(console.error);
