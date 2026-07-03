import { inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";
import { FINANCE_ACTIVE_BOOKKEEPING_START } from "@/lib/ops/finance/finance-filters";
import type {
  FinanceImportHistoryRow,
  FinanceImportStats,
} from "@/lib/ops/finance/finance-canonical-model";

const SOURCE_LABELS: Record<string, string> = {
  apple_card: "Apple Card",
  nebat: "NEBAT",
  paypal: "PayPal",
  amazon: "Amazon Orders",
};

function periodLabel(statementEnd: string | null, createdAt: string): string {
  if (statementEnd) {
    return new Date(`${statementEnd.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function statusLabel(workflowStatus: string, postedAt: string | null, source: string): string {
  if (source === "amazon") return "Imported";
  if (postedAt || workflowStatus === "posted") return "Posted";
  if (workflowStatus === "reconciled") return "Ready to Post";
  return "Needs Attention";
}

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
               WHERE archived_at IS NULL AND account_id IS NULL AND review_status = 'pending'
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
      workflow_status: string;
      transactions_inserted: number;
      transactions_skipped: number;
      transactions_updated: number;
      transactions_pending: number;
      transaction_count: number;
      balance_difference: string | null;
      statement_end: string | null;
      posted_at: string | null;
      created_at: string;
      account_name: string | null;
      order_count: string | null;
      item_count: string | null;
    }>(
      `SELECT fi.id, fi.file_name, fi.source, fi.status, fi.workflow_status,
              fi.transactions_inserted, fi.transactions_skipped, fi.transactions_updated,
              fi.transactions_pending, fi.transaction_count, fi.balance_difference::text,
              fi.statement_end::text, fi.posted_at::text, fi.created_at::text,
              ia.name AS account_name,
              (SELECT COUNT(*)::text FROM finance_amazon_orders ao WHERE ao.raw_import_id = fi.id) AS order_count,
              (SELECT COUNT(*)::text FROM finance_amazon_order_items ai
               JOIN finance_amazon_orders ao ON ao.id = ai.order_id
               WHERE ao.raw_import_id = fi.id) AS item_count
       FROM finance_imports fi
       LEFT JOIN finance_institution_accounts ia ON ia.id = fi.institution_account_id
       ORDER BY fi.created_at DESC
       LIMIT $1`,
      [limit],
    );

    return rows.map((r) => {
      const sourceLabel = r.account_name ?? SOURCE_LABELS[r.source] ?? r.source;
      const period = periodLabel(r.statement_end, r.created_at);
      const label = `${sourceLabel} — ${period}`;
      const statusLabelText = statusLabel(r.workflow_status, r.posted_at, r.source);

      let detail = "";
      if (r.source === "amazon") {
        const orders = Number(r.order_count ?? 0);
        const items = Number(r.item_count ?? 0);
        detail = `${orders} orders · ${items} items`;
      } else {
        const count = r.transaction_count || Number(r.transactions_inserted);
        detail = `${count} transaction${count === 1 ? "" : "s"}`;
      }

      return {
        id: Number(r.id),
        label,
        statusLabel: statusLabelText,
        detail,
        difference: r.balance_difference != null ? Number(r.balance_difference) : null,
        createdAt: r.created_at,
        fileName: r.file_name,
        source: r.source,
        status: r.workflow_status || r.status,
        transactionsInserted: Number(r.transactions_inserted),
        transactionsSkipped: Number(r.transactions_skipped),
        transactionsUpdated: Number(r.transactions_updated),
        transactionsPending: Number(r.transactions_pending),
      };
    });
  } catch (err) {
    financeDbError(err);
  }
}
