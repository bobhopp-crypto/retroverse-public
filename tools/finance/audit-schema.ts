#!/usr/bin/env npx tsx
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { inspectPing, inspectQuery } from "../../lib/inspect/pg";

type ColRow = { table_name: string; column_name: string; data_type: string };
type IdxRow = { tablename: string; indexname: string };
type TableRow = { table_name: string };

const EXPECTED: Record<string, string[]> = {
  finance_imports: [
    "id", "source", "file_name", "file_type", "storage_path", "status", "transaction_count",
    "posted_transaction_count", "error_message", "created_at", "workflow_status",
    "institution_account_id", "beginning_balance", "ending_balance", "computed_activity",
    "balance_difference", "reconciled_at", "posted_at", "statement_start", "statement_end",
    "transactions_inserted", "transactions_skipped", "transactions_updated", "transactions_pending", "updated_at",
  ],
  finance_transactions: [
    "id", "source", "transaction_date", "merchant", "description", "amount", "category_id",
    "account_id", "subcategory", "review_status", "raw_import_id", "dedupe_key", "flow_kind",
    "importance", "archived_at", "institution_account_id", "updated_at", "tax_treatment",
  ],
  finance_amazon_orders: [
    "id", "order_number", "order_date", "order_total", "delivery_status", "raw_import_id",
    "created_at", "updated_at",
  ],
  finance_amazon_order_items: [
    "id", "order_id", "description", "amount", "category_slug", "importance",
    "delivery_status", "dedupe_key", "created_at",
  ],
  finance_import_staging: [
    "id", "import_id", "transaction_date", "merchant", "description", "amount", "source",
    "flow_kind", "dedupe_key", "proposed_account", "duplicate_warning", "tax_treatment",
    "review_status", "created_at",
  ],
  finance_institution_accounts: ["id", "slug", "name", "account_type", "ledger_source", "created_at"],
  finance_nebat_statements: [
    "id", "statement_start", "statement_end", "account_masked", "beginning_balance",
    "ending_balance", "total_additions", "total_subtractions", "statement_type",
    "raw_import_id", "dedupe_key", "created_at",
  ],
  finance_mortgage_statements: [
    "id", "statement_date", "outstanding_principal", "principal", "interest",
    "scheduled_payment", "activity_payment_date", "raw_import_id", "dedupe_key", "created_at",
  ],
};

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres offline");
    process.exit(1);
  }

  const tables = await inspectQuery<TableRow>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name LIKE 'finance_%'
     ORDER BY table_name`,
  );
  const actualTables = new Set(tables.map((t) => t.table_name));

  const cols = await inspectQuery<ColRow>(
    `SELECT table_name, column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name LIKE 'finance_%'
     ORDER BY table_name, ordinal_position`,
  );

  const indexes = await inspectQuery<IdxRow>(
    `SELECT tablename, indexname FROM pg_indexes
     WHERE schemaname = 'public' AND tablename LIKE 'finance_%'
     ORDER BY tablename, indexname`,
  );

  const colsByTable = new Map<string, Set<string>>();
  for (const c of cols) {
    if (!colsByTable.has(c.table_name)) colsByTable.set(c.table_name, new Set());
    colsByTable.get(c.table_name)!.add(c.column_name);
  }

  console.log("=== SCHEMA AUDIT ===\n");

  const missingTables: string[] = [];
  const missingColumns: { table: string; column: string }[] = [];
  const extraNotes: string[] = [];

  for (const [table, expectedCols] of Object.entries(EXPECTED)) {
    if (!actualTables.has(table)) {
      missingTables.push(table);
      continue;
    }
    const actual = colsByTable.get(table) ?? new Set();
    for (const col of expectedCols) {
      if (!actual.has(col)) missingColumns.push({ table, column: col });
    }
    if (table === "finance_amazon_orders") {
      const hasImportId = actual.has("import_id");
      const hasRawImportId = actual.has("raw_import_id");
      console.log(`finance_amazon_orders.import_id exists: ${hasImportId}`);
      console.log(`finance_amazon_orders.raw_import_id exists: ${hasRawImportId}`);
    }
  }

  console.log("\n--- Missing tables ---");
  console.log(missingTables.length ? missingTables.join("\n") : "(none)");

  console.log("\n--- Missing columns ---");
  if (missingColumns.length) {
    for (const m of missingColumns) console.log(`${m.table}.${m.column}`);
  } else {
    console.log("(none)");
  }

  console.log("\n--- finance_amazon_orders actual columns ---");
  const aoCols = [...(colsByTable.get("finance_amazon_orders") ?? [])].sort();
  console.log(aoCols.join(", ") || "(table missing)");

  console.log("\n--- Key indexes ---");
  const keyIdx = [
    "finance_transactions_raw_import_idx",
    "finance_transactions_institution_idx",
    "finance_import_staging_import_idx",
    "finance_amazon_orders_date_idx",
  ];
  const idxNames = new Set(indexes.map((i) => i.indexname));
  for (const idx of keyIdx) {
    console.log(`${idx}: ${idxNames.has(idx) ? "EXISTS" : "MISSING"}`);
  }

  // Check migration files on disk
  const migDir = join(process.cwd(), "docs/migrations");
  const migFiles = (await readdir(migDir)).filter((f) => f.startsWith("finance") && f.endsWith(".sql"));
  console.log("\n--- Migration files ---");
  console.log(migFiles.sort().join("\n"));

  // Sample amazon orders linkage
  const aoSample = await inspectQuery<{ raw_import_id: string | null; cnt: string }>(
    `SELECT raw_import_id::text, COUNT(*)::text AS cnt
     FROM finance_amazon_orders GROUP BY raw_import_id ORDER BY cnt DESC LIMIT 5`,
  );
  console.log("\n--- amazon_orders by raw_import_id ---");
  console.log(JSON.stringify(aoSample, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
