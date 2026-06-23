import "server-only";

import { inspectExecute, inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";
import type { FinanceImportPreviewRow } from "@/lib/ops/finance/import-preview";
import type { ParsedFinanceRow } from "@/lib/ops/finance/finance-model";

export type StagingRow = FinanceImportPreviewRow & {
  id: number;
  dedupeKey: string;
  source: string;
  accountId: number | null;
  taxTreatment: string | null;
  reviewStatus: string;
};

export async function clearImportStaging(importId: number): Promise<void> {
  try {
    await inspectExecute(`DELETE FROM finance_import_staging WHERE import_id = $1`, [importId]);
  } catch (err) {
    financeDbError(err);
  }
}

export async function insertImportStaging(
  importId: number,
  rows: Array<
    ParsedFinanceRow & {
      proposedAccount?: string | null;
      duplicateWarning?: string | null;
      accountId?: number | null;
      reviewStatus?: string;
      taxTreatment?: string | null;
      importance?: string | null;
    }
  >,
): Promise<number> {
  let inserted = 0;
  for (const row of rows) {
    try {
      const result = await inspectExecute(
        `INSERT INTO finance_import_staging
           (import_id, transaction_date, merchant, description, amount, source, flow_kind,
            account_id, subcategory, importance, tax_treatment, review_status, dedupe_key,
            proposed_account, duplicate_warning)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (import_id, dedupe_key) DO NOTHING`,
        [
          importId,
          row.transactionDate,
          row.merchant,
          row.description,
          row.amount,
          row.source,
          row.flowKind ?? "expense",
          row.accountId ?? null,
          row.subcategory ?? null,
          row.importance ?? null,
          row.taxTreatment ?? null,
          row.reviewStatus ?? "pending",
          row.dedupeKey,
          row.proposedAccount ?? null,
          row.duplicateWarning ?? null,
        ],
      );
      if (result > 0) inserted++;
    } catch (err) {
      financeDbError(err);
    }
  }
  return inserted;
}

export async function listImportStaging(importId: number): Promise<StagingRow[]> {
  try {
    const rows = await inspectQuery<{
      id: number;
      transaction_date: string;
      merchant: string;
      description: string;
      amount: string;
      source: string;
      flow_kind: string;
      account_id: number | null;
      importance: string | null;
      tax_treatment: string | null;
      review_status: string;
      dedupe_key: string;
      proposed_account: string | null;
      duplicate_warning: string | null;
    }>(
      `SELECT id, transaction_date::text, merchant, description, amount::text, source, flow_kind,
              account_id, importance, tax_treatment, review_status, dedupe_key,
              proposed_account, duplicate_warning
       FROM finance_import_staging
       WHERE import_id = $1
       ORDER BY transaction_date DESC, id DESC`,
      [importId],
    );
    return rows.map((r) => ({
      id: Number(r.id),
      transactionDate: r.transaction_date,
      merchant: r.merchant,
      description: r.description,
      amount: Number(r.amount),
      source: r.source,
      flowKind: r.flow_kind,
      proposedAccount: r.proposed_account,
      duplicateWarning: r.duplicate_warning,
      dedupeKey: r.dedupe_key,
      accountId: r.account_id ? Number(r.account_id) : null,
      taxTreatment: r.tax_treatment,
      reviewStatus: r.review_status,
    }));
  } catch (err) {
    financeDbError(err);
  }
}

export function stagingToParsedRows(rows: StagingRow[]): ParsedFinanceRow[] {
  return rows.map((r) => ({
    transactionDate: r.transactionDate,
    merchant: r.merchant,
    description: r.description,
    amount: r.amount,
    source: r.source as ParsedFinanceRow["source"],
    flowKind: r.flowKind as ParsedFinanceRow["flowKind"],
    dedupeKey: r.dedupeKey,
    subcategory: r.description,
    accountName: r.proposedAccount ?? undefined,
  }));
}

export async function updateImportStagingRow(
  importId: number,
  rowId: number,
  patch: {
    transactionDate?: string;
    merchant?: string;
    description?: string;
    amount?: number;
    proposedAccount?: string | null;
    notes?: string | null;
  },
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (patch.transactionDate !== undefined) {
    sets.push(`transaction_date = $${i++}`);
    params.push(patch.transactionDate);
  }
  if (patch.merchant !== undefined) {
    sets.push(`merchant = $${i++}`);
    params.push(patch.merchant);
  }
  if (patch.description !== undefined) {
    sets.push(`description = $${i++}`);
    params.push(patch.description);
  }
  if (patch.amount !== undefined) {
    sets.push(`amount = $${i++}`);
    params.push(patch.amount);
  }
  if (patch.proposedAccount !== undefined) {
    sets.push(`proposed_account = $${i++}`);
    params.push(patch.proposedAccount);
  }

  if (!sets.length) return;

  params.push(importId, rowId);
  try {
    await inspectExecute(
      `UPDATE finance_import_staging SET ${sets.join(", ")}
       WHERE import_id = $${i++} AND id = $${i}`,
      params,
    );
  } catch (err) {
    financeDbError(err);
  }
}

export function computeStagingActivity(rows: StagingRow[]): {
  additions: number;
  subtractions: number;
  net: number;
} {
  let additions = 0;
  let subtractions = 0;
  for (const row of rows) {
    if (row.flowKind === "income") additions += row.amount;
    else subtractions += row.amount;
  }
  return { additions, subtractions, net: additions - subtractions };
}
