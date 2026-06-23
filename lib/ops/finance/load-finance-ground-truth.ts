import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import {
  queryIncomeTotal,
  querySpendTotal,
  querySubscriptions,
} from "@/lib/ops/finance/db/transactions";
import type {
  FinanceGroundTruthData,
  GroundTruthAccount,
  ReconcileStatus,
} from "@/lib/ops/finance/ground-truth-types";
import { activeBookkeepingFilters } from "@/lib/ops/finance/finance-filters";
import type { FinanceFilters } from "@/lib/ops/finance/finance-filters";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import {
  HOME_ACCOUNT_SLUGS,
  NET_WORTH_REQUIRED_SLUGS,
} from "@/lib/ops/finance/institution-accounts-config";

const HOME_ACCOUNT_SLUGS_LIST = [...HOME_ACCOUNT_SLUGS];

function currentMonthFilters(): FinanceFilters {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    period: "custom",
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
    sources: [],
    categories: [],
  };
}

function reconcileLabel(status: ReconcileStatus): string {
  switch (status) {
    case "reconciled":
      return "Reconciled";
    case "needs_review":
      return "Needs review";
    case "needs_import":
      return "Needs import";
    default:
      return "Not set";
  }
}

function deriveReconcileStatus(input: {
  workflowStatus: string | null;
  reconciledAt: string | null;
  postedAt: string | null;
  statementEnd: string | null;
}): ReconcileStatus {
  if (input.postedAt || input.workflowStatus === "posted") return "reconciled";
  if (input.reconciledAt || input.workflowStatus === "reconciled") return "reconciled";
  if (input.workflowStatus === "reviewed" || input.workflowStatus === "parsed") {
    return "needs_review";
  }
  if (input.workflowStatus) return "needs_review";
  return "needs_import";
}

function emptyGroundTruth(): FinanceGroundTruthData {
  const month = currentMonthFilters();
  const monthLabel = new Date(`${month.from}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return {
    generatedAt: new Date().toISOString(),
    dataThrough: month.to ?? new Date().toISOString().slice(0, 10),
    accounts: HOME_ACCOUNT_SLUGS_LIST.map((slug) => ({
      slug,
      name: slug,
      kind: slug === "mortgage" || slug === "apple-card" ? "liability" : "asset",
      balance: null,
      balanceLabel: "—",
      asOfDate: null,
      note: "Postgres offline",
      reconcileStatus: "not_set" as ReconcileStatus,
      reconcileDetail: reconcileLabel("not_set"),
    })),
    netWorth: {
      assets: 0,
      liabilities: 0,
      total: null,
      complete: false,
      missingAccounts: [...NET_WORTH_REQUIRED_SLUGS],
      note: "Unavailable",
    },
    importsNeedingAttention: 0,
    currentMonth: { label: monthLabel, income: 0, spending: 0, net: 0 },
    billsDue: [],
    subscriptions: [],
    subscriptionsMonthlyTotal: 0,
  };
}

export async function loadFinanceGroundTruth(): Promise<FinanceGroundTruthData> {
  const ping = await inspectPing();
  if (!ping.ok) return emptyGroundTruth();
  await ensureFinanceSchema();

  const monthFilters = currentMonthFilters();
  const yearFilters = activeBookkeepingFilters();
  const monthLabel = new Date(`${monthFilters.from}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const [institutions, nebatStmt, mortgageStmt, appleStmt, income, spending, subs, importsAttention] =
    await Promise.all([
    inspectQuery<{
      id: number;
      slug: string;
      name: string;
      kind: string;
      manual_balance: string | null;
      manual_balance_as_of: string | null;
      setup_status: string | null;
      workflow_status: string | null;
      reconciled_at: string | null;
      posted_at: string | null;
      statement_end: string | null;
      ending_balance: string | null;
    }>(
      `SELECT ia.id, ia.slug, ia.name, ia.kind,
              ia.manual_balance::text, ia.manual_balance_as_of::text, ia.setup_status,
              fi.workflow_status, fi.reconciled_at::text, fi.posted_at::text,
              fi.statement_end::text, fi.ending_balance::text
       FROM finance_institution_accounts ia
       LEFT JOIN LATERAL (
         SELECT workflow_status, reconciled_at, posted_at, statement_end, ending_balance
         FROM finance_imports
         WHERE institution_account_id = ia.id
         ORDER BY COALESCE(posted_at, reconciled_at, created_at) DESC
         LIMIT 1
       ) fi ON true
       WHERE ia.slug = ANY($1::text[])
       ORDER BY array_position($1::text[], ia.slug)`,
      [HOME_ACCOUNT_SLUGS_LIST],
    ),
    inspectQuery<{
      ending_balance: string;
      statement_end: string;
    }>(
      `SELECT ending_balance::text, statement_end::text
       FROM finance_nebat_statements
       ORDER BY statement_end DESC NULLS LAST
       LIMIT 1`,
    ),
    inspectQuery<{
      outstanding_principal: string;
      amount_due: string;
      payment_due_date: string | null;
      statement_date: string;
    }>(
      `SELECT outstanding_principal::text, amount_due::text, payment_due_date::text, statement_date::text
       FROM finance_mortgage_statements
       ORDER BY statement_date DESC NULLS LAST
       LIMIT 1`,
    ),
    inspectQuery<{
      ending_balance: string;
      statement_end: string;
    }>(
      `SELECT ending_balance::text, statement_end::text
       FROM finance_apple_card_statements
       ORDER BY statement_end DESC NULLS LAST
       LIMIT 1`,
    ),
    queryIncomeTotal(monthFilters),
    querySpendTotal(monthFilters),
    querySubscriptions(yearFilters),
    countImportsNeedingAttention(),
  ]);

  const nebatBalance = nebatStmt[0] ? Number(nebatStmt[0].ending_balance) : null;
  const nebatAsOf = nebatStmt[0]?.statement_end ?? null;
  const mortgagePrincipal = mortgageStmt[0] ? Number(mortgageStmt[0].outstanding_principal) : null;
  const mortgageAsOf = mortgageStmt[0]?.statement_date ?? null;
  const appleBalance = appleStmt[0] ? Number(appleStmt[0].ending_balance) : null;
  const appleAsOf = appleStmt[0]?.statement_end ?? null;

  const accounts: GroundTruthAccount[] = institutions.map((ia) => {
    const reconcileStatus = deriveReconcileStatus({
      workflowStatus: ia.workflow_status,
      reconciledAt: ia.reconciled_at,
      postedAt: ia.posted_at,
      statementEnd: ia.statement_end,
    });

    if (ia.slug === "nebat-checking") {
      return {
        slug: ia.slug,
        name: ia.name,
        kind: "asset",
        balance: nebatBalance,
        balanceLabel: nebatBalance != null ? String(nebatBalance) : "—",
        asOfDate: nebatAsOf,
        note: nebatBalance != null ? "From latest NEBAT statement" : "Import NEBAT PDF",
        reconcileStatus,
        reconcileDetail: reconcileLabel(reconcileStatus),
      };
    }

    if (ia.slug === "mortgage") {
      return {
        slug: ia.slug,
        name: ia.name,
        kind: "liability",
        balance: mortgagePrincipal,
        balanceLabel: mortgagePrincipal != null ? String(mortgagePrincipal) : "—",
        asOfDate: mortgageAsOf,
        note: mortgagePrincipal != null ? "Outstanding principal" : "Import mortgage statement",
        reconcileStatus,
        reconcileDetail: reconcileLabel(reconcileStatus),
      };
    }

    if (ia.slug === "apple-card") {
      const manualBalance = ia.manual_balance != null ? Number(ia.manual_balance) : null;
      const balance = appleBalance ?? manualBalance;
      const asOf = appleAsOf ?? ia.manual_balance_as_of;
      return {
        slug: ia.slug,
        name: ia.name,
        kind: "liability",
        balance,
        balanceLabel: balance != null ? String(balance) : "—",
        asOfDate: asOf,
        note: balance != null ? "From Apple Card statement" : "Import Apple Card statement for balance",
        reconcileStatus,
        reconcileDetail: reconcileLabel(reconcileStatus),
      };
    }

    const importBalance = ia.ending_balance != null ? Number(ia.ending_balance) : null;
    const manualBalance = ia.manual_balance != null ? Number(ia.manual_balance) : null;
    const balance = importBalance ?? manualBalance;
    const asOf = importBalance != null ? ia.statement_end : ia.manual_balance_as_of;

    return {
      slug: ia.slug,
      name: ia.name,
      kind: ia.kind === "mortgage" || ia.kind === "credit_card" ? "liability" : "asset",
      balance,
      balanceLabel: balance != null ? String(balance) : "—",
      asOfDate: asOf,
      note: balance != null ? "On file" : "Balance not entered yet",
      reconcileStatus,
      reconcileDetail: reconcileLabel(reconcileStatus),
    };
  });

  const missingAccounts = accounts
    .filter((acct) => NET_WORTH_REQUIRED_SLUGS.includes(acct.slug as (typeof NET_WORTH_REQUIRED_SLUGS)[number]))
    .filter((acct) => acct.balance == null)
    .map((acct) => acct.name);

  const netWorthComplete = missingAccounts.length === 0;

  let assets = 0;
  let liabilities = 0;

  if (netWorthComplete) {
    for (const acct of accounts) {
      if (acct.balance == null) continue;
      if (acct.kind === "asset") assets += acct.balance;
      else liabilities += acct.balance;
    }
  }

  const billsDue = [];
  if (mortgageStmt[0]?.payment_due_date) {
    billsDue.push({
      label: "Mortgage",
      amount: mortgageStmt[0].amount_due ? Number(mortgageStmt[0].amount_due) : null,
      dueDate: mortgageStmt[0].payment_due_date,
    });
  }

  const subscriptions = subs.slice(0, 12).map((s) => ({
    vendor: s.vendor,
    monthly: s.monthly,
    lastCharge: s.lastCharge,
  }));

  return {
    generatedAt: new Date().toISOString(),
    dataThrough: monthFilters.to ?? new Date().toISOString().slice(0, 10),
    accounts,
    netWorth: {
      assets,
      liabilities,
      total: netWorthComplete ? assets - liabilities : null,
      complete: netWorthComplete,
      missingAccounts,
      note: netWorthComplete ? "From statement balances" : "Enter missing account balances to calculate net worth",
    },
    importsNeedingAttention: importsAttention,
    currentMonth: {
      label: monthLabel,
      income,
      spending,
      net: income - spending,
    },
    billsDue,
    subscriptions,
    subscriptionsMonthlyTotal: subscriptions.reduce((s, r) => s + r.monthly, 0),
  };
}
