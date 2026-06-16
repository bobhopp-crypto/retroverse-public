import { inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";
import { FINANCE_ACTIVE_BOOKKEEPING_START } from "@/lib/ops/finance/finance-filters";
import type {
  FinanceImportHistoryRow,
  FinanceImportStats,
} from "@/lib/ops/finance/finance-canonical-model";

export async function queryImportStats(): Promise<FinanceImportStats> {
  try {
    const rows = await inspectQuery<{
      last_import: string | null;
      total_imports: string;
      added: string;
      updated: string;
      pending: string;
    }>(
      `SELECT MAX(created_at)::text AS last_import,
              COUNT(*)::text AS total_imports,
              COALESCE(SUM(transactions_inserted), 0)::text AS added,
              COALESCE(SUM(transactions_updated), 0)::text AS updated,
              (SELECT COUNT(*)::text FROM finance_transactions
               WHERE account_id IS NULL AND review_status = 'pending'
                 AND flow_kind = 'expense' AND amount > 0
                 AND transaction_date >= $1::date) AS pending
       FROM finance_imports`,
      [FINANCE_ACTIVE_BOOKKEEPING_START],
    );
    const r = rows[0];
    return {
      lastImportDate: r?.last_import ?? null,
      totalImports: Number(r?.total_imports ?? 0),
      transactionsAdded: Number(r?.added ?? 0),
      transactionsUpdated: Number(r?.updated ?? 0),
      transactionsAwaitingReview: Number(r?.pending ?? 0),
    };
  } catch (err) {
    financeDbError(err);
  }
}

export async function listImportHistory(limit = 30): Promise<FinanceImportHistoryRow[]> {
  try {
    const rows = await inspectQuery<{
      id: string;
      file_name: string;
      source: string;
      status: string;
      transactions_inserted: number;
      transactions_skipped: number;
      transactions_updated: number;
      transactions_pending: number;
      created_at: string;
    }>(
      `SELECT id, file_name, source, status,
              transactions_inserted, transactions_skipped, transactions_updated, transactions_pending,
              created_at::text
       FROM finance_imports
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map((r) => ({
      id: Number(r.id),
      fileName: r.file_name,
      source: r.source,
      status: r.status,
      transactionsInserted: Number(r.transactions_inserted),
      transactionsSkipped: Number(r.transactions_skipped),
      transactionsUpdated: Number(r.transactions_updated),
      transactionsPending: Number(r.transactions_pending),
      createdAt: r.created_at,
    }));
  } catch (err) {
    financeDbError(err);
  }
}
