import { inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";

export type AccountStatementRow = {
  /** finance_imports.id when present */
  importId: number | null;
  /** finance_nebat_statements.id for native-only rows */
  nebatStatementId: number | null;
  label: string;
  status: string;
  transactionCount: number;
  ledgerTransactionCount: number;
  beginningBalance: number | null;
  endingBalance: number | null;
  difference: number | null;
  statementStart: string | null;
  statementEnd: string | null;
  postedAt: string | null;
  reconciled: boolean;
};

function statementLabel(statementEnd: string | null, statementStart: string | null): string {
  const iso = statementEnd ?? statementStart;
  if (!iso) return "Unknown period";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function workflowStatusLabel(status: string, postedAt: string | null): string {
  if (postedAt || status === "posted") return "Posted";
  if (status === "reconciled") return "Ready to Post";
  if (status === "reviewed" || status === "parsed") return "Needs Review";
  return "In Progress";
}

function resolveTransactionCount(input: {
  postedAt: string | null;
  postedTransactionCount: number;
  ledgerCount: number;
  stagedCount: number;
  importTransactionCount: number;
}): number {
  if (input.ledgerCount > 0) return input.ledgerCount;
  if (input.postedAt) {
    return Math.max(input.postedTransactionCount, input.importTransactionCount);
  }
  if (input.stagedCount > 0) return input.stagedCount;
  return input.importTransactionCount;
}

export async function listInstitutionAccountStatements(
  institutionAccountId: number,
  accountSlug: string,
): Promise<AccountStatementRow[]> {
  try {
    const importRows = await inspectQuery<{
      id: string;
      workflow_status: string;
      transaction_count: number;
      posted_transaction_count: number;
      beginning_balance: string | null;
      ending_balance: string | null;
      balance_difference: string | null;
      statement_start: string | null;
      statement_end: string | null;
      posted_at: string | null;
      reconciled_at: string | null;
      staged_count: string;
      ledger_count: string;
      nebat_beginning: string | null;
      nebat_ending: string | null;
      nebat_start: string | null;
      nebat_end: string | null;
    }>(
      `SELECT fi.id, fi.workflow_status, fi.transaction_count, fi.posted_transaction_count,
              fi.beginning_balance::text, fi.ending_balance::text, fi.balance_difference::text,
              fi.statement_start::text, fi.statement_end::text,
              fi.posted_at::text, fi.reconciled_at::text,
              (SELECT COUNT(*)::text FROM finance_import_staging s WHERE s.import_id = fi.id) AS staged_count,
              (SELECT COUNT(*)::text FROM finance_transactions t
               WHERE t.raw_import_id = fi.id AND t.archived_at IS NULL) AS ledger_count,
              ns.beginning_balance::text AS nebat_beginning,
              ns.ending_balance::text AS nebat_ending,
              ns.statement_start::text AS nebat_start,
              ns.statement_end::text AS nebat_end
       FROM finance_imports fi
       LEFT JOIN finance_nebat_statements ns ON ns.raw_import_id = fi.id AND ns.statement_type = 'checking'
       WHERE fi.institution_account_id = $1
         AND (
           fi.statement_end IS NOT NULL
           OR fi.beginning_balance IS NOT NULL
           OR fi.ending_balance IS NOT NULL
           OR fi.posted_at IS NOT NULL
           OR EXISTS (
             SELECT 1 FROM finance_import_staging s WHERE s.import_id = fi.id
           )
           OR EXISTS (
             SELECT 1 FROM finance_transactions t
             WHERE t.raw_import_id = fi.id AND t.archived_at IS NULL
           )
         )
       ORDER BY COALESCE(fi.statement_end, fi.statement_start, fi.created_at::date) DESC, fi.id DESC
       LIMIT 36`,
      [institutionAccountId],
    );

    const fromImports: AccountStatementRow[] = importRows.map((r) => {
      const ledgerCount = Number(r.ledger_count);
      const stagedCount = Number(r.staged_count);
      const postedTransactionCount = Number(r.posted_transaction_count ?? 0);
      const beginning =
        r.beginning_balance != null
          ? Number(r.beginning_balance)
          : r.nebat_beginning != null
            ? Number(r.nebat_beginning)
            : null;
      const ending =
        r.ending_balance != null
          ? Number(r.ending_balance)
          : r.nebat_ending != null
            ? Number(r.nebat_ending)
            : null;
      const statementStart = r.statement_start ?? r.nebat_start;
      const statementEnd = r.statement_end ?? r.nebat_end;

      return {
        importId: Number(r.id),
        nebatStatementId: null,
        label: statementLabel(statementEnd, statementStart),
        status: workflowStatusLabel(r.workflow_status, r.posted_at),
        transactionCount: resolveTransactionCount({
          postedAt: r.posted_at,
          postedTransactionCount,
          ledgerCount,
          stagedCount,
          importTransactionCount: r.transaction_count,
        }),
        ledgerTransactionCount: ledgerCount,
        beginningBalance: beginning,
        endingBalance: ending,
        difference: r.balance_difference != null ? Number(r.balance_difference) : null,
        statementStart,
        statementEnd,
        postedAt: r.posted_at,
        reconciled: Boolean(r.posted_at || r.reconciled_at || r.workflow_status === "reconciled"),
      };
    });

    if (accountSlug !== "nebat-checking") {
      return fromImports;
    }

    const linkedImportIds = new Set(fromImports.map((s) => s.importId).filter(Boolean));

    const nativeRows = await inspectQuery<{
      id: string;
      statement_start: string | null;
      statement_end: string;
      beginning_balance: string | null;
      ending_balance: string;
      raw_import_id: string | null;
      ledger_count: string;
    }>(
      `SELECT ns.id, ns.statement_start::text, ns.statement_end::text,
              ns.beginning_balance::text, ns.ending_balance::text, ns.raw_import_id::text,
              (SELECT COUNT(*)::text FROM finance_transactions t
               WHERE t.archived_at IS NULL
                 AND (
                   (ns.raw_import_id IS NOT NULL AND t.raw_import_id = ns.raw_import_id)
                   OR (
                     ns.raw_import_id IS NULL
                     AND t.source = 'nebat'
                     AND t.transaction_date >= COALESCE(ns.statement_start, ns.statement_end)
                     AND t.transaction_date <= ns.statement_end
                   )
                 )) AS ledger_count
       FROM finance_nebat_statements ns
       WHERE ns.statement_type = 'checking'
         AND ns.statement_end IS NOT NULL
       ORDER BY ns.statement_end DESC
       LIMIT 36`,
    );

    const nativeStatements: AccountStatementRow[] = nativeRows
      .filter((r) => {
        const importId = r.raw_import_id ? Number(r.raw_import_id) : null;
        return importId == null || !linkedImportIds.has(importId);
      })
      .map((r) => {
        const ledgerCount = Number(r.ledger_count);
        const importId = r.raw_import_id ? Number(r.raw_import_id) : null;
        return {
          importId,
          nebatStatementId: Number(r.id),
          label: statementLabel(r.statement_end, r.statement_start),
          status: "Posted",
          transactionCount: ledgerCount,
          ledgerTransactionCount: ledgerCount,
          beginningBalance: r.beginning_balance != null ? Number(r.beginning_balance) : null,
          endingBalance: Number(r.ending_balance),
          difference: 0,
          statementStart: r.statement_start,
          statementEnd: r.statement_end,
          postedAt: r.statement_end,
          reconciled: true,
        };
      });

    return [...fromImports, ...nativeStatements].sort((a, b) =>
      (b.statementEnd ?? "").localeCompare(a.statementEnd ?? ""),
    );
  } catch (err) {
    financeDbError(err);
  }
}

/** @deprecated use listInstitutionAccountStatements */
export async function listAccountStatements(institutionAccountId: number): Promise<AccountStatementRow[]> {
  return listInstitutionAccountStatements(institutionAccountId, "nebat-checking");
}

export async function listMortgagePaymentStatements(limit = 12): Promise<AccountStatementRow[]> {
  try {
    const rows = await inspectQuery<{
      id: string;
      statement_date: string;
      outstanding_principal: string;
      raw_import_id: string | null;
      ledger_count: string;
      beginning_principal: string | null;
    }>(
      `SELECT ms.id, ms.statement_date::text, ms.outstanding_principal::text, ms.raw_import_id::text,
              (SELECT COUNT(*)::text FROM finance_transactions t
               WHERE t.archived_at IS NULL
                 AND (
                   (ms.raw_import_id IS NOT NULL AND t.raw_import_id = ms.raw_import_id)
                   OR (t.source = 'nebat' AND t.transaction_date = ms.statement_date)
                 )) AS ledger_count,
              LAG(ms.outstanding_principal) OVER (ORDER BY ms.statement_date)::text AS beginning_principal
       FROM finance_mortgage_statements ms
       ORDER BY ms.statement_date DESC
       LIMIT $1`,
      [limit],
    );

    return rows.map((r) => {
      const ledgerCount = Number(r.ledger_count);
      return {
        importId: r.raw_import_id ? Number(r.raw_import_id) : null,
        nebatStatementId: null,
        label: new Date(`${r.statement_date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        status: "Posted",
        transactionCount: Math.max(ledgerCount, 1),
        ledgerTransactionCount: ledgerCount,
        beginningBalance: r.beginning_principal != null ? Number(r.beginning_principal) : null,
        endingBalance: Number(r.outstanding_principal),
        difference: 0,
        statementStart: r.statement_date,
        statementEnd: r.statement_date,
        postedAt: r.statement_date,
        reconciled: true,
      };
    });
  } catch (err) {
    financeDbError(err);
  }
}

/** @deprecated merged into listInstitutionAccountStatements */
export async function listNebatNativeStatements(limit = 12): Promise<AccountStatementRow[]> {
  return [];
}
