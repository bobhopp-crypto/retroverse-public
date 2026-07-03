import { inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";
import type { ParsedAppleCardStatement } from "@/lib/ops/finance/parsers/apple-card-statement";

export type AppleCardStatementRow = {
  id: number;
  institutionAccountId: number;
  statementPeriod: string;
  statementStart: string;
  statementEnd: string;
  previousBalance: number;
  endingBalance: number;
  totalBalance: number | null;
  minimumDue: number | null;
  dueDate: string | null;
  paymentTotal: number | null;
  purchaseTotal: number | null;
  interestTotal: number;
  dailyCashTotal: number | null;
  monthlyInstallmentRemaining: number | null;
  workflowStatus: string;
  storagePath: string | null;
  rawImportId: number | null;
  transactionCount: number;
};

type DbRow = {
  id: string;
  institution_account_id: string;
  statement_period: string;
  statement_start: string;
  statement_end: string;
  previous_balance: string;
  ending_balance: string;
  total_balance: string | null;
  minimum_due: string | null;
  due_date: string | null;
  payment_total: string | null;
  purchase_total: string | null;
  interest_total: string;
  daily_cash_total: string | null;
  monthly_installment_remaining: string | null;
  workflow_status: string;
  storage_path: string | null;
  raw_import_id: string | null;
  transaction_count: string;
};

const SELECT = `acs.id, acs.institution_account_id, acs.statement_period,
  acs.statement_start::text, acs.statement_end::text,
  acs.previous_balance::text, acs.ending_balance::text, acs.total_balance::text,
  acs.minimum_due::text, acs.due_date::text, acs.payment_total::text,
  acs.purchase_total::text, acs.interest_total::text, acs.daily_cash_total::text,
  acs.monthly_installment_remaining::text, acs.workflow_status, acs.storage_path,
  acs.raw_import_id::text`;

function mapRow(row: DbRow): AppleCardStatementRow {
  return {
    id: Number(row.id),
    institutionAccountId: Number(row.institution_account_id),
    statementPeriod: row.statement_period,
    statementStart: row.statement_start,
    statementEnd: row.statement_end,
    previousBalance: Number(row.previous_balance),
    endingBalance: Number(row.ending_balance),
    totalBalance: row.total_balance != null ? Number(row.total_balance) : null,
    minimumDue: row.minimum_due != null ? Number(row.minimum_due) : null,
    dueDate: row.due_date,
    paymentTotal: row.payment_total != null ? Number(row.payment_total) : null,
    purchaseTotal: row.purchase_total != null ? Number(row.purchase_total) : null,
    interestTotal: Number(row.interest_total),
    dailyCashTotal: row.daily_cash_total != null ? Number(row.daily_cash_total) : null,
    monthlyInstallmentRemaining:
      row.monthly_installment_remaining != null
        ? Number(row.monthly_installment_remaining)
        : null,
    workflowStatus: row.workflow_status,
    storagePath: row.storage_path,
    rawImportId: row.raw_import_id ? Number(row.raw_import_id) : null,
    transactionCount: Number(row.transaction_count),
  };
}

const TXN_COUNT_SUBQUERY = `(
  SELECT COUNT(*)::text FROM finance_transactions t
  WHERE t.archived_at IS NULL
    AND t.institution_account_id = acs.institution_account_id
    AND t.transaction_date >= acs.statement_start
    AND t.transaction_date <= acs.statement_end
)`;

export async function listAppleCardStatements(
  institutionAccountId: number,
  limit = 24,
): Promise<AppleCardStatementRow[]> {
  try {
    const rows = await inspectQuery<DbRow>(
      `SELECT ${SELECT}, ${TXN_COUNT_SUBQUERY} AS transaction_count
       FROM finance_apple_card_statements acs
       WHERE acs.institution_account_id = $1
       ORDER BY acs.statement_end DESC
       LIMIT $2`,
      [institutionAccountId, limit],
    );
    return rows.map(mapRow);
  } catch (err) {
    financeDbError(err);
  }
}

export async function getAppleCardStatementById(
  id: number,
): Promise<AppleCardStatementRow | null> {
  try {
    const rows = await inspectQuery<DbRow>(
      `SELECT ${SELECT}, ${TXN_COUNT_SUBQUERY} AS transaction_count
       FROM finance_apple_card_statements acs
       WHERE acs.id = $1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  } catch (err) {
    financeDbError(err);
  }
}

export async function getLatestAppleCardStatement(
  institutionAccountId: number,
): Promise<AppleCardStatementRow | null> {
  const rows = await listAppleCardStatements(institutionAccountId, 1);
  return rows[0] ?? null;
}

export async function upsertAppleCardStatement(input: {
  institutionAccountId: number;
  parsed: ParsedAppleCardStatement;
  rawImportId?: number | null;
  storagePath?: string | null;
  workflowStatus?: string;
}): Promise<number> {
  try {
    const rows = await inspectQuery<{ id: string }>(
      `INSERT INTO finance_apple_card_statements (
         institution_account_id, statement_period, statement_start, statement_end,
         previous_balance, ending_balance, total_balance, minimum_due, due_date,
         payment_total, purchase_total, interest_total, daily_cash_total,
         monthly_installment_remaining, workflow_status, storage_path, raw_import_id, dedupe_key
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (dedupe_key) DO UPDATE SET
         previous_balance = EXCLUDED.previous_balance,
         ending_balance = EXCLUDED.ending_balance,
         total_balance = EXCLUDED.total_balance,
         minimum_due = EXCLUDED.minimum_due,
         due_date = EXCLUDED.due_date,
         payment_total = EXCLUDED.payment_total,
         purchase_total = EXCLUDED.purchase_total,
         interest_total = EXCLUDED.interest_total,
         daily_cash_total = EXCLUDED.daily_cash_total,
         monthly_installment_remaining = EXCLUDED.monthly_installment_remaining,
         workflow_status = EXCLUDED.workflow_status,
         storage_path = COALESCE(EXCLUDED.storage_path, finance_apple_card_statements.storage_path),
         raw_import_id = COALESCE(EXCLUDED.raw_import_id, finance_apple_card_statements.raw_import_id),
         updated_at = now()
       RETURNING id`,
      [
        input.institutionAccountId,
        input.parsed.statementPeriod,
        input.parsed.statementStart,
        input.parsed.statementEnd,
        input.parsed.previousBalance,
        input.parsed.endingBalance,
        input.parsed.totalBalance,
        input.parsed.minimumDue,
        input.parsed.dueDate,
        input.parsed.paymentTotal,
        input.parsed.purchaseTotal,
        input.parsed.interestTotal,
        input.parsed.dailyCashTotal,
        input.parsed.monthlyInstallmentRemaining,
        input.workflowStatus ?? "imported",
        input.storagePath ?? null,
        input.rawImportId ?? null,
        input.parsed.dedupeKey,
      ],
    );
    return Number(rows[0]!.id);
  } catch (err) {
    financeDbError(err);
  }
}
