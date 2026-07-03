import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import { listInstitutionAccountStatements } from "@/lib/ops/finance/db/account-statements";
import { listAppleCardStatements } from "@/lib/ops/finance/db/apple-card-statements";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { queryMonthlySpend, querySpendTotal } from "@/lib/ops/finance/db/transactions";
import type { FinanceFilters } from "@/lib/ops/finance/finance-filters";
import { filtersDateRange } from "@/lib/ops/finance/finance-filters";
import { SPENDING_HOME_CATEGORIES } from "@/lib/ops/finance/spending-home-categories";

export type IntegrityVerdict = "PASS" | "FAIL";

export type FinanceIntegrityRow = {
  check: string;
  uiValue: number | null;
  calculatedValue: number | null;
  sourceStatementValue: number | null;
  verdict: IntegrityVerdict;
  notes: string;
};

export type FinanceIntegrityReport = {
  generatedAt: string;
  summary: { passCount: number; failCount: number; total: number };
  rows: FinanceIntegrityRow[];
};

type InstitutionAccount = {
  id: number;
  slug: string;
  ledgerSource: string | null;
};

function moneyMatch(a: number | null, b: number | null, tolerance = 0.01): boolean {
  if (a == null || b == null) return a === b;
  return Math.abs(a - b) <= tolerance;
}

function passFail(ok: boolean): IntegrityVerdict {
  return ok ? "PASS" : "FAIL";
}

async function getAccount(slug: string): Promise<InstitutionAccount | null> {
  const rows = await inspectQuery<{
    id: string;
    slug: string;
    ledger_source: string | null;
  }>(
    `SELECT id, slug, ledger_source
     FROM finance_institution_accounts
     WHERE slug = $1
     LIMIT 1`,
    [slug],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    slug: row.slug,
    ledgerSource: row.ledger_source,
  };
}

function last12MonthFilters(): FinanceFilters {
  return { period: "last_12m", from: null, to: null, sources: [], categories: [] };
}

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

function ytdFilters(): FinanceFilters {
  const year = String(new Date().getFullYear());
  return { period: year as FinanceFilters["period"], from: null, to: null, sources: [], categories: [] };
}

async function loadSpendingUiSeries() {
  return Promise.all(
    SPENDING_HOME_CATEGORIES.map(async (def) => {
      const chartFilters = {
        ...last12MonthFilters(),
        categories: def.filters,
        sources: def.sources ?? [],
      };
      const monthFilters = {
        ...currentMonthFilters(),
        categories: def.filters,
        sources: def.sources ?? [],
      };
      const ytd = {
        ...ytdFilters(),
        categories: def.filters,
        sources: def.sources ?? [],
      };
      const [months, ytdSpend, monthlySpend] = await Promise.all([
        queryMonthlySpend(chartFilters),
        querySpendTotal(ytd),
        querySpendTotal(monthFilters),
      ]);
      const total12m = months.reduce((sum, m) => sum + m.amount, 0);
      return {
        id: def.id,
        label: def.label,
        tier: def.tier,
        monthlySpend,
        ytdSpend,
        total12m,
        averageMonthly: months.length ? total12m / months.length : 0,
      };
    }),
  );
}

export async function loadFinanceIntegrityReport(): Promise<FinanceIntegrityReport | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;
  await ensureFinanceSchema();

  const rows: FinanceIntegrityRow[] = [];

  const [appleAccount, nebatAccount, spendingUi] = await Promise.all([
    getAccount("apple-card"),
    getAccount("nebat-checking"),
    loadSpendingUiSeries(),
  ]);

  // —— Apple Card ——
  const appleStatements = appleAccount
    ? await listAppleCardStatements(appleAccount.id)
    : [];
  const latestAppleStmtRow = appleStatements[0] ?? null;
  const sourceAppleStmtBalance = latestAppleStmtRow?.endingBalance ?? null;
  const uiAppleStmtBalance = sourceAppleStmtBalance;

  rows.push({
    check: "Apple Card — statement balance",
    uiValue: uiAppleStmtBalance,
    calculatedValue: sourceAppleStmtBalance,
    sourceStatementValue: sourceAppleStmtBalance,
    verdict: passFail(moneyMatch(uiAppleStmtBalance, sourceAppleStmtBalance)),
    notes: latestAppleStmtRow
      ? `${latestAppleStmtRow.statementPeriod} end ${latestAppleStmtRow.statementEnd} (${latestAppleStmtRow.workflowStatus})`
      : "No statements",
  });

  // —— NEBAT ——
  const nebatStmtTable = await inspectQuery<{ statement_end: string; ending_balance: string }>(
    `SELECT statement_end::text, ending_balance::text
     FROM finance_nebat_statements
     WHERE statement_type = 'checking'
     ORDER BY statement_end DESC
     LIMIT 1`,
  );
  const sourceNebatStmtBalance = nebatStmtTable[0]
    ? Number(nebatStmtTable[0].ending_balance)
    : null;

  const nebatStatements = nebatAccount
    ? await listInstitutionAccountStatements(nebatAccount.id, "nebat-checking")
    : [];
  const latestNebatStmt = nebatStatements.find((s) => s.endingBalance != null) ?? null;
  const uiNebatStmtBalance =
    latestNebatStmt?.endingBalance ?? sourceNebatStmtBalance;

  rows.push({
    check: "NEBAT — statement balance",
    uiValue: uiNebatStmtBalance,
    calculatedValue: sourceNebatStmtBalance,
    sourceStatementValue: sourceNebatStmtBalance,
    verdict: passFail(moneyMatch(uiNebatStmtBalance, sourceNebatStmtBalance)),
    notes: nebatStmtTable[0]
      ? `finance_nebat_statements end ${nebatStmtTable[0].statement_end}`
      : "No NEBAT statement rows",
  });

  // —— Spending totals ——
  const totalUi = spendingUi.find((c) => c.id === "total");
  const total12mCalc = await querySpendTotal(last12MonthFilters());
  const totalMonthCalc = await querySpendTotal(currentMonthFilters());
  const totalYtdCalc = await querySpendTotal(ytdFilters());
  const totalMonths = await queryMonthlySpend(last12MonthFilters());
  const total12mFromMonths = totalMonths.reduce((s, m) => s + m.amount, 0);
  const range = filtersDateRange(last12MonthFilters());

  rows.push({
    check: "Spending — total last 12 months",
    uiValue: totalUi?.total12m ?? null,
    calculatedValue: total12mCalc,
    sourceStatementValue: total12mFromMonths,
    verdict: passFail(
      moneyMatch(totalUi?.total12m ?? null, total12mCalc) &&
        moneyMatch(total12mCalc, total12mFromMonths),
    ),
    notes: `${range.label} (${range.from ?? "…"} → ${range.to ?? "today"})`,
  });

  rows.push({
    check: "Spending — total current month",
    uiValue: totalUi?.monthlySpend ?? null,
    calculatedValue: totalMonthCalc,
    sourceStatementValue: totalMonthCalc,
    verdict: passFail(moneyMatch(totalUi?.monthlySpend ?? null, totalMonthCalc)),
    notes: `YTD match: ${passFail(moneyMatch(totalUi?.ytdSpend ?? null, totalYtdCalc))}`,
  });

  rows.push({
    check: "Spending — total YTD",
    uiValue: totalUi?.ytdSpend ?? null,
    calculatedValue: totalYtdCalc,
    sourceStatementValue: totalYtdCalc,
    verdict: passFail(moneyMatch(totalUi?.ytdSpend ?? null, totalYtdCalc)),
    notes: `Calendar year ${new Date().getFullYear()}`,
  });

  for (const def of SPENDING_HOME_CATEGORIES.filter((c) => c.tier === "primary" && c.id !== "total")) {
    const uiCat = spendingUi.find((c) => c.id === def.id);
    const filters = {
      ...last12MonthFilters(),
      categories: def.filters,
      sources: def.sources ?? [],
    };
    const cat12m = await querySpendTotal(filters);
    const catMonths = await queryMonthlySpend(filters);
    const cat12mMonths = catMonths.reduce((s, m) => s + m.amount, 0);

    rows.push({
      check: `Category — ${def.label} (12m)`,
      uiValue: uiCat?.total12m ?? null,
      calculatedValue: cat12m,
      sourceStatementValue: cat12mMonths,
      verdict: passFail(
        moneyMatch(uiCat?.total12m ?? null, cat12m) && moneyMatch(cat12m, cat12mMonths),
      ),
      notes:
        def.filters.length > 0
          ? `category filters: ${def.filters.join(", ")}`
          : def.sources?.length
            ? `source: ${def.sources.join(", ")}`
            : "all expenses",
    });
  }

  const passCount = rows.filter((r) => r.verdict === "PASS").length;
  const failCount = rows.filter((r) => r.verdict === "FAIL").length;

  return {
    generatedAt: new Date().toISOString(),
    summary: { passCount, failCount, total: rows.length },
    rows,
  };
}
