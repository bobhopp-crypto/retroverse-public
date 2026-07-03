import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { inspectExecute, inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";
import type { FinanceImportSource } from "@/lib/ops/finance/finance-model";

const IMPORT_DIR = join(process.cwd(), "data/finance-imports");

export type FinanceImportRecord = {
  id: number;
  source: FinanceImportSource;
  fileName: string;
  fileType: string;
  storagePath: string | null;
  status: string;
  transactionCount: number;
  postedTransactionCount: number;
  errorMessage: string | null;
  createdAt: string;
  workflowStatus: string;
  institutionAccountId: number | null;
  beginningBalance: number | null;
  endingBalance: number | null;
  computedActivity: number | null;
  balanceDifference: number | null;
  reconciledAt: string | null;
  postedAt: string | null;
  statementStart: string | null;
  statementEnd: string | null;
};

type ImportRow = {
  id: number | string;
  source: string;
  file_name: string;
  file_type: string;
  storage_path: string | null;
  status: string;
  transaction_count: number;
  posted_transaction_count?: number;
  error_message: string | null;
  created_at: Date | string;
  workflow_status?: string;
  institution_account_id?: number | null;
  beginning_balance?: string | number | null;
  ending_balance?: string | number | null;
  computed_activity?: string | number | null;
  balance_difference?: string | number | null;
  reconciled_at?: Date | string | null;
  posted_at?: Date | string | null;
  statement_start?: string | null;
  statement_end?: string | null;
};

function isoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function mapImport(row: ImportRow): FinanceImportRecord {
  return {
    id: Number(row.id),
    source: row.source as FinanceImportSource,
    fileName: row.file_name,
    fileType: row.file_type,
    storagePath: row.storage_path,
    status: row.status,
    transactionCount: row.transaction_count,
    postedTransactionCount: Number(row.posted_transaction_count ?? 0),
    errorMessage: row.error_message,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
    workflowStatus: row.workflow_status ?? "uploaded",
    institutionAccountId: row.institution_account_id ? Number(row.institution_account_id) : null,
    beginningBalance: row.beginning_balance != null ? Number(row.beginning_balance) : null,
    endingBalance: row.ending_balance != null ? Number(row.ending_balance) : null,
    computedActivity: row.computed_activity != null ? Number(row.computed_activity) : null,
    balanceDifference: row.balance_difference != null ? Number(row.balance_difference) : null,
    reconciledAt: isoDate(row.reconciled_at),
    postedAt: isoDate(row.posted_at),
    statementStart: row.statement_start ?? null,
    statementEnd: row.statement_end ?? null,
  };
}

const IMPORT_SELECT = `id, source, file_name, file_type, storage_path, status, transaction_count, posted_transaction_count, error_message, created_at,
  workflow_status, institution_account_id, beginning_balance, ending_balance, computed_activity, balance_difference,
  reconciled_at, posted_at, statement_start, statement_end`;

export async function saveImportFile(
  importId: number,
  fileName: string,
  buffer: Buffer,
): Promise<string> {
  const dir = join(IMPORT_DIR, String(importId));
  await mkdir(dir, { recursive: true });
  const storagePath = join(dir, fileName);
  await writeFile(storagePath, buffer);
  return storagePath;
}

export async function createFinanceImport(input: {
  source: FinanceImportSource;
  fileName: string;
  fileType: string;
  status?: string;
  errorMessage?: string | null;
}): Promise<FinanceImportRecord> {
  try {
    const rows = await inspectQuery<ImportRow>(
      `INSERT INTO finance_imports (source, file_name, file_type, status, error_message, workflow_status)
       VALUES ($1, $2, $3, $4, $5, 'uploaded')
       RETURNING ${IMPORT_SELECT}`,
      [
        input.source,
        input.fileName,
        input.fileType,
        input.status ?? "pending",
        input.errorMessage ?? null,
      ],
    );
    return mapImport(rows[0]!);
  } catch (err) {
    financeDbError(err);
  }
}

export async function updateFinanceImport(
  id: number,
  patch: {
    storagePath?: string;
    status?: string;
    transactionCount?: number;
    postedTransactionCount?: number;
    transactionsInserted?: number;
    transactionsSkipped?: number;
    transactionsUpdated?: number;
    transactionsPending?: number;
    errorMessage?: string | null;
    workflowStatus?: string;
    institutionAccountId?: number | null;
    beginningBalance?: number | null;
    endingBalance?: number | null;
    computedActivity?: number | null;
    balanceDifference?: number | null;
    reconciledAt?: string | null;
    postedAt?: string | null;
    statementStart?: string | null;
    statementEnd?: string | null;
  },
): Promise<void> {
  const sets: string[] = ["updated_at = now()"];
  const params: unknown[] = [];
  let i = 1;

  if (patch.storagePath !== undefined) {
    sets.push(`storage_path = $${i++}`);
    params.push(patch.storagePath);
  }
  if (patch.status !== undefined) {
    sets.push(`status = $${i++}`);
    params.push(patch.status);
  }
  if (patch.transactionCount !== undefined) {
    sets.push(`transaction_count = $${i++}`);
    params.push(patch.transactionCount);
  }
  if (patch.postedTransactionCount !== undefined) {
    sets.push(`posted_transaction_count = $${i++}`);
    params.push(patch.postedTransactionCount);
  }
  if (patch.transactionsInserted !== undefined) {
    sets.push(`transactions_inserted = $${i++}`);
    params.push(patch.transactionsInserted);
  }
  if (patch.transactionsSkipped !== undefined) {
    sets.push(`transactions_skipped = $${i++}`);
    params.push(patch.transactionsSkipped);
  }
  if (patch.transactionsUpdated !== undefined) {
    sets.push(`transactions_updated = $${i++}`);
    params.push(patch.transactionsUpdated);
  }
  if (patch.transactionsPending !== undefined) {
    sets.push(`transactions_pending = $${i++}`);
    params.push(patch.transactionsPending);
  }
  if (patch.errorMessage !== undefined) {
    sets.push(`error_message = $${i++}`);
    params.push(patch.errorMessage);
  }
  if (patch.workflowStatus !== undefined) {
    sets.push(`workflow_status = $${i++}`);
    params.push(patch.workflowStatus);
  }
  if (patch.institutionAccountId !== undefined) {
    sets.push(`institution_account_id = $${i++}`);
    params.push(patch.institutionAccountId);
  }
  if (patch.beginningBalance !== undefined) {
    sets.push(`beginning_balance = $${i++}`);
    params.push(patch.beginningBalance);
  }
  if (patch.endingBalance !== undefined) {
    sets.push(`ending_balance = $${i++}`);
    params.push(patch.endingBalance);
  }
  if (patch.computedActivity !== undefined) {
    sets.push(`computed_activity = $${i++}`);
    params.push(patch.computedActivity);
  }
  if (patch.balanceDifference !== undefined) {
    sets.push(`balance_difference = $${i++}`);
    params.push(patch.balanceDifference);
  }
  if (patch.reconciledAt !== undefined) {
    sets.push(`reconciled_at = $${i++}`);
    params.push(patch.reconciledAt);
  }
  if (patch.postedAt !== undefined) {
    sets.push(`posted_at = $${i++}`);
    params.push(patch.postedAt);
  }
  if (patch.statementStart !== undefined) {
    sets.push(`statement_start = $${i++}`);
    params.push(patch.statementStart);
  }
  if (patch.statementEnd !== undefined) {
    sets.push(`statement_end = $${i++}`);
    params.push(patch.statementEnd);
  }

  params.push(id);
  try {
    await inspectExecute(
      `UPDATE finance_imports SET ${sets.join(", ")} WHERE id = $${i}`,
      params,
    );
  } catch (err) {
    financeDbError(err);
  }
}

export async function getFinanceImport(id: number): Promise<FinanceImportRecord | null> {
  try {
    const rows = await inspectQuery<ImportRow>(
      `SELECT ${IMPORT_SELECT} FROM finance_imports WHERE id = $1`,
      [id],
    );
    return rows[0] ? mapImport(rows[0]) : null;
  } catch (err) {
    financeDbError(err);
  }
}

export async function listRecentImports(limit = 20): Promise<FinanceImportRecord[]> {
  try {
    const rows = await inspectQuery<ImportRow>(
      `SELECT ${IMPORT_SELECT}
       FROM finance_imports
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map(mapImport);
  } catch (err) {
    financeDbError(err);
  }
}
