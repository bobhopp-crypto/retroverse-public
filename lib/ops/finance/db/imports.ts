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
  errorMessage: string | null;
  createdAt: string;
};

type ImportRow = {
  id: number | string;
  source: string;
  file_name: string;
  file_type: string;
  storage_path: string | null;
  status: string;
  transaction_count: number;
  error_message: string | null;
  created_at: Date | string;
};

function mapImport(row: ImportRow): FinanceImportRecord {
  return {
    id: Number(row.id),
    source: row.source as FinanceImportSource,
    fileName: row.file_name,
    fileType: row.file_type,
    storagePath: row.storage_path,
    status: row.status,
    transactionCount: row.transaction_count,
    errorMessage: row.error_message,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
}

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
      `INSERT INTO finance_imports (source, file_name, file_type, status, error_message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, source, file_name, file_type, storage_path, status, transaction_count, error_message, created_at`,
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
    transactionsInserted?: number;
    transactionsSkipped?: number;
    transactionsUpdated?: number;
    transactionsPending?: number;
    errorMessage?: string | null;
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

export async function listRecentImports(limit = 20): Promise<FinanceImportRecord[]> {
  try {
    const rows = await inspectQuery<ImportRow>(
      `SELECT id, source, file_name, file_type, storage_path, status, transaction_count, error_message, created_at
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
