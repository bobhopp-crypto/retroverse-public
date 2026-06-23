#!/usr/bin/env npx tsx
/**
 * Repair NEBAT January 2026 (import 33): post 6 missing statement transactions.
 * Run: npx tsx tools/finance/repair-jan-2026-nebat.ts
 * Dry run: DRY_RUN=1 npx tsx tools/finance/repair-jan-2026-nebat.ts
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { inspectExecute, inspectPing, inspectQuery } from "../../lib/inspect/pg";
import {
  classifyNebatDescription,
  parseNebatPdf,
} from "../../lib/ops/finance/parsers/nebat-pdf";

const IMPORT_ID = 33;
const INSTITUTION_ACCOUNT_ID = 1;
const STATEMENT_END = "2026-01-20";
const DRY_RUN = process.env.DRY_RUN === "1";

type RepairRow = {
  transactionDate: string;
  description: string;
  amount: number;
  flowKind: "income" | "expense" | "transfer";
  accountName: string;
  dedupeKey: string;
  reviewStatus: "pending" | "approved";
  taxTreatment: string | null;
  importance: string | null;
};

function correctTransactionYear(transactionDate: string, statementEnd: string): string {
  const [sy, sm] = statementEnd.split("-").map(Number);
  const [ty, tm, td] = transactionDate.split("-").map(Number);
  if (tm! > sm! && sy) {
    return `${sy - 1}-${String(tm).padStart(2, "0")}-${String(td).padStart(2, "0")}`;
  }
  return transactionDate;
}

function buildDedupeKey(date: string, amount: number, description: string): string {
  return `nebat|${STATEMENT_END}|${date}|${amount.toFixed(2)}|${description.slice(0, 80)}`;
}

async function getAccountId(name: string): Promise<number | null> {
  const rows = await inspectQuery<{ id: number }>(
    `SELECT id FROM finance_accounts WHERE name = $1 AND merged_into_id IS NULL LIMIT 1`,
    [name],
  );
  return rows[0]?.id ?? null;
}

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres offline");
    process.exit(1);
  }

  const imp = await inspectQuery<{
    storage_path: string;
    beginning_balance: string;
    ending_balance: string;
  }>(
    `SELECT storage_path, beginning_balance::text, ending_balance::text
     FROM finance_imports WHERE id = $1`,
    [IMPORT_ID],
  );
  if (!imp[0]?.storage_path) throw new Error("Import 33 not found");

  const fullPath = imp[0].storage_path.startsWith("/")
    ? imp[0].storage_path
    : join(process.cwd(), imp[0].storage_path);
  const parsed = await parseNebatPdf(await readFile(fullPath));
  if (parsed.kind !== "checking") throw new Error("Expected checking statement");

  const active = await inspectQuery<{ dedupe_key: string }>(
    `SELECT dedupe_key FROM finance_transactions
     WHERE raw_import_id = $1 AND archived_at IS NULL`,
    [IMPORT_ID],
  );
  const activeKeys = new Set(active.map((r) => r.dedupe_key));

  const toInsert: RepairRow[] = [];

  for (const txn of parsed.transactions) {
    const transactionDate = correctTransactionYear(txn.transactionDate, STATEMENT_END);
    const dedupeKey = buildDedupeKey(transactionDate, txn.amount, txn.description);
    if (activeKeys.has(dedupeKey) || activeKeys.has(txn.dedupeKey)) continue;

    const classified = classifyNebatDescription(txn.description);
    toInsert.push({
      transactionDate,
      description: txn.description,
      amount: txn.amount,
      flowKind: txn.flowKind,
      accountName: classified.accountName,
      dedupeKey,
      reviewStatus: classified.reviewRequired ? "pending" : "approved",
      taxTreatment: classified.taxTreatment,
      importance: classified.importance,
    });
  }

  // Credit-page rows missing from debit-page parser (871.00 additions gap)
  const creditPageRows: Omit<RepairRow, "dedupeKey">[] = [
    {
      transactionDate: "2025-12-23",
      description: "DEPOSIT MOBILE",
      amount: 428.0,
      flowKind: "income",
      accountName: "Deposit - Needs Review",
      reviewStatus: "pending",
      taxTreatment: "Personal Income",
      importance: "required",
    },
    {
      transactionDate: "2025-12-23",
      description: "DEPOSIT MOBILE",
      amount: 443.0,
      flowKind: "income",
      accountName: "Deposit - Needs Review",
      reviewStatus: "pending",
      taxTreatment: "Personal Income",
      importance: "required",
    },
  ];

  for (const row of creditPageRows) {
    const dedupeKey = buildDedupeKey(row.transactionDate, row.amount, row.description);
    if (activeKeys.has(dedupeKey)) continue;
    toInsert.push({ ...row, dedupeKey });
  }

  console.log(`Missing rows to insert: ${toInsert.length}`);
  for (const row of toInsert) {
    console.log({
      date: row.transactionDate,
      description: row.description,
      amount: row.amount,
      flowKind: row.flowKind,
      account: row.accountName,
      dedupeKey: row.dedupeKey,
    });
  }

  if (toInsert.length !== 6) {
    throw new Error(`Expected 6 missing rows, found ${toInsert.length}`);
  }

  for (const row of toInsert) {
    const collision = await inspectQuery<{ id: number; archived_at: string | null }>(
      `SELECT id, archived_at::text FROM finance_transactions WHERE dedupe_key = $1 LIMIT 1`,
      [row.dedupeKey],
    );
    if (collision[0] && collision[0].archived_at == null) {
      throw new Error(`Active dedupe collision for ${row.dedupeKey} id=${collision[0].id}`);
    }
  }

  if (DRY_RUN) {
    const begin = Number(imp[0].beginning_balance);
    const end = Number(imp[0].ending_balance);
    const ledger = await inspectQuery<{ flow_kind: string; amount: string }>(
      `SELECT flow_kind, amount::text FROM finance_transactions
       WHERE raw_import_id = $1 AND archived_at IS NULL`,
      [IMPORT_ID],
    );
    let add = 0,
      sub = 0;
    for (const t of ledger) {
      if (t.flow_kind === "income") add += Number(t.amount);
      else sub += Number(t.amount);
    }
    for (const row of toInsert) {
      if (row.flowKind === "income") add += row.amount;
      else sub += row.amount;
    }
    const calc = Number((begin + add - sub).toFixed(2));
    console.log("\nDRY_RUN projected ending:", calc, "target:", end, "variance:", (calc - end).toFixed(2));
    return;
  }

  let inserted = 0;
  for (const row of toInsert) {
    const accountId = await getAccountId(row.accountName);
    const result = await inspectExecute(
      `INSERT INTO finance_transactions
         (source, transaction_date, merchant, description, amount, account_id, subcategory,
          review_status, raw_import_id, dedupe_key, flow_kind, importance, institution_account_id, tax_treatment)
       VALUES ('nebat', $1, 'NEBAT', $2, $3, $4, $2, $5, $6, $7, $8, $9, $10, $11)`,
      [
        row.transactionDate,
        row.description,
        row.amount,
        accountId,
        row.reviewStatus,
        IMPORT_ID,
        row.dedupeKey,
        row.flowKind,
        row.importance,
        INSTITUTION_ACCOUNT_ID,
        row.taxTreatment,
      ],
    );
    inserted += result;
    console.log(`Inserted: ${row.description} $${row.amount} (${result} row)`);
  }

  await inspectExecute(
    `UPDATE finance_imports
     SET posted_transaction_count = (
           SELECT COUNT(*)::int FROM finance_transactions
           WHERE raw_import_id = $1 AND archived_at IS NULL
         ),
         transaction_count = GREATEST(transaction_count, (
           SELECT COUNT(*)::int FROM finance_transactions
           WHERE raw_import_id = $1 AND archived_at IS NULL
         ))
     WHERE id = $1`,
    [IMPORT_ID],
  );

  const check = await inspectQuery<{ additions: string; subtractions: string; count: string }>(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE flow_kind = 'income'), 0)::text AS additions,
       COALESCE(SUM(amount) FILTER (WHERE flow_kind IN ('expense', 'transfer')), 0)::text AS subtractions,
       COUNT(*)::text AS count
     FROM finance_transactions WHERE raw_import_id = $1 AND archived_at IS NULL`,
    [IMPORT_ID],
  );
  const begin = Number(imp[0].beginning_balance);
  const end = Number(imp[0].ending_balance);
  const calc = Number(
    (begin + Number(check[0]?.additions) - Number(check[0]?.subtractions)).toFixed(2),
  );

  console.log("\n=== REPAIR RESULT ===");
  console.log("Inserted:", inserted);
  console.log("Active ledger rows:", check[0]?.count);
  console.log("Additions:", check[0]?.additions, "Subtractions:", check[0]?.subtractions);
  console.log("Calculated ending:", calc, "Statement ending:", end, "Variance:", (calc - end).toFixed(2));

  if (Math.abs(calc - end) > 0.01) {
    throw new Error(`Balance still does not reconcile: ${calc} vs ${end}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
