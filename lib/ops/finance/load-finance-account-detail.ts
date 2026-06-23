import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import { listInstitutionAccountStatements } from "@/lib/ops/finance/db/account-statements";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { getInstitutionAccountBySlug } from "@/lib/ops/finance/db/institution-accounts";
import {
  queryAccountTransactions,
  type FinanceTransactionWithStatement,
} from "@/lib/ops/finance/db/transactions";
import type { AccountStatementRow } from "@/lib/ops/finance/db/account-statements";
import type { AccountBalanceKind, ReconcileStatus } from "@/lib/ops/finance/ground-truth-types";
import type { InstitutionAccountSlug } from "@/lib/ops/finance/institution-accounts-config";

import type { AccountRegisterPayload } from "@/lib/ops/finance/load-account-register";
import { loadAccountRegister } from "@/lib/ops/finance/load-account-register";

export type FinanceAccountDetailData = {
  slug: InstitutionAccountSlug;
  name: string;
  kind: AccountBalanceKind;
  currentBalance: number | null;
  statementBalance: number | null;
  asOfDate: string | null;
  lastReconciledDate: string | null;
  reconcileStatus: ReconcileStatus;
  setupStatus: string;
  needsSetup: boolean;
  statements: AccountStatementRow[];
  transactions: FinanceTransactionWithStatement[];
  ledgerSource: string | null;
  register: AccountRegisterPayload | null;
};

function deriveReconcileStatus(input: {
  workflowStatus: string | null;
  postedAt: string | null;
  reconciledAt: string | null;
}): ReconcileStatus {
  if (input.postedAt) return "reconciled";
  if (input.reconciledAt) return "reconciled";
  if (input.workflowStatus === "parsed" || input.workflowStatus === "reviewed") return "needs_review";
  if (input.workflowStatus) return "needs_review";
  return "needs_import";
}

function balanceKind(kind: string, slug: string): AccountBalanceKind {
  if (slug === "mortgage" || kind === "credit_card" || kind === "mortgage") return "liability";
  return "asset";
}

export async function loadFinanceAccountDetail(
  slug: InstitutionAccountSlug,
): Promise<FinanceAccountDetailData | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;
  await ensureFinanceSchema();

  const account = await getInstitutionAccountBySlug(slug);
  if (!account) return null;

  const [latestImport, nebatStmt, mortgageStmt] = await Promise.all([
    inspectQuery<{
      workflow_status: string | null;
      posted_at: string | null;
      reconciled_at: string | null;
      ending_balance: string | null;
      statement_end: string | null;
    }>(
      `SELECT workflow_status, posted_at::text, reconciled_at::text,
              ending_balance::text, statement_end::text
       FROM finance_imports
       WHERE institution_account_id = $1
       ORDER BY COALESCE(posted_at, reconciled_at, created_at) DESC
       LIMIT 1`,
      [account.id],
    ),
    slug === "nebat-checking"
      ? inspectQuery<{ ending_balance: string; statement_end: string }>(
          `SELECT ending_balance::text, statement_end::text
           FROM finance_nebat_statements
           WHERE statement_type = 'checking'
           ORDER BY statement_end DESC LIMIT 1`,
        )
      : Promise.resolve([]),
    slug === "mortgage"
      ? inspectQuery<{ outstanding_principal: string; statement_date: string }>(
          `SELECT outstanding_principal::text, statement_date::text
           FROM finance_mortgage_statements ORDER BY statement_date DESC LIMIT 1`,
        )
      : Promise.resolve([]),
  ]);

  let statements: AccountStatementRow[];
  if (slug === "mortgage") {
    const { listMortgagePaymentStatements } = await import("@/lib/ops/finance/db/account-statements");
    statements = await listMortgagePaymentStatements();
  } else {
    statements = await listInstitutionAccountStatements(account.id, slug);
  }

  const li = latestImport[0];
  const reconcileStatus = deriveReconcileStatus({
    workflowStatus: li?.workflow_status ?? null,
    postedAt: li?.posted_at ?? null,
    reconciledAt: li?.reconciled_at ?? null,
  });

  let currentBalance: number | null = null;
  let statementBalance: number | null = null;
  let asOfDate: string | null = null;

  if (slug === "nebat-checking" && nebatStmt[0]) {
    currentBalance = Number(nebatStmt[0].ending_balance);
    statementBalance = currentBalance;
    asOfDate = nebatStmt[0].statement_end;
  } else if (slug === "mortgage" && mortgageStmt[0]) {
    currentBalance = Number(mortgageStmt[0].outstanding_principal);
    statementBalance = currentBalance;
    asOfDate = mortgageStmt[0].statement_date;
  } else if (li?.ending_balance != null) {
    currentBalance = Number(li.ending_balance);
    statementBalance = currentBalance;
    asOfDate = li.statement_end;
  } else if (account.manualBalance != null) {
    currentBalance = account.manualBalance;
    statementBalance = account.manualBalance;
    asOfDate = account.manualBalanceAsOf;
  }

  const needsSetup = currentBalance == null && account.setupStatus === "pending";

  let transactions: FinanceTransactionWithStatement[] = [];
  if (slug !== "mortgage") {
    transactions = await queryAccountTransactions({
      institutionAccountId: account.id,
      ledgerSource: account.ledgerSource,
    });
  }

  const lastReconciled = await inspectQuery<{ posted_at: string }>(
    `SELECT posted_at::text
     FROM finance_imports
     WHERE institution_account_id = $1 AND posted_at IS NOT NULL
     ORDER BY posted_at DESC LIMIT 1`,
    [account.id],
  );

  const register =
    slug === "nebat-checking" ? await loadAccountRegister("nebat-checking") : null;

  return {
    slug,
    name: account.name,
    kind: balanceKind(account.kind, slug),
    currentBalance,
    statementBalance,
    asOfDate,
    lastReconciledDate: lastReconciled[0]?.posted_at ?? null,
    reconcileStatus,
    setupStatus: account.setupStatus,
    needsSetup,
    statements,
    transactions,
    ledgerSource: account.ledgerSource,
    register,
  };
}
