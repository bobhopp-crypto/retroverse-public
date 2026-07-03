import { inspectQuery } from "@/lib/inspect/pg";

import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import type { FinanceTransaction } from "@/lib/ops/finance/db/transactions";
import {
  queryMonthlySpend,
  querySpendTotal,
  queryTopMerchants,
} from "@/lib/ops/finance/db/transactions";
import type { FinanceFilters } from "@/lib/ops/finance/finance-filters";
import {
  inferSpendingEditCategory,
  SPENDING_EDIT_CATEGORIES,
} from "@/lib/ops/finance/spending-category-edit";
import { spendingMonthDateRange } from "@/lib/ops/finance/spending-month";
import {
  spendingCategoryById,
  type SpendingHomeCategoryId,
} from "@/lib/ops/finance/spending-home-categories";

export type SpendingDrillDownTxn = {
  id: number;
  transactionDate: string;
  merchant: string;
  description: string;
  amount: number;
  categoryId: string;
  categoryLabel: string;
  accountName: string | null;
};

export type SpendingDrillDownMerchant = {
  merchant: string;
  amount: number;
  count: number;
};

export type SpendingDrillDownData = {
  month: string;
  monthDisplay: string;
  categoryId: SpendingHomeCategoryId;
  categoryLabel: string;
  totalSpending: number;
  transactionCount: number;
  topMerchants: SpendingDrillDownMerchant[];
  transactions: SpendingDrillDownTxn[];
};

export type SpendingSeriesRefresh = {
  months: { month: string; amount: number }[];
  monthlySpend: number;
  ytdSpend: number;
  averageMonthly: number;
};

function filtersForCategoryMonth(
  categoryId: SpendingHomeCategoryId,
  from: string,
  to: string,
): FinanceFilters {
  const def = spendingCategoryById(categoryId);
  return {
    period: "custom",
    from,
    to,
    categories: def.filters,
    sources: def.sources ?? [],
  };
}

function ytdFiltersForCategory(categoryId: SpendingHomeCategoryId): FinanceFilters {
  const def = spendingCategoryById(categoryId);
  const year = String(new Date().getFullYear());
  return {
    period: year as FinanceFilters["period"],
    from: null,
    to: null,
    categories: def.filters,
    sources: def.sources ?? [],
  };
}

function currentMonthFiltersForCategory(categoryId: SpendingHomeCategoryId): FinanceFilters {
  const def = spendingCategoryById(categoryId);
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    period: "custom",
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
    categories: def.filters,
    sources: def.sources ?? [],
  };
}

function last12MonthFiltersForCategory(categoryId: SpendingHomeCategoryId): FinanceFilters {
  const def = spendingCategoryById(categoryId);
  return {
    period: "last_12m",
    from: null,
    to: null,
    categories: def.filters,
    sources: def.sources ?? [],
  };
}

export async function loadSpendingSeriesRefresh(
  categoryId: SpendingHomeCategoryId,
): Promise<SpendingSeriesRefresh> {
  await ensureFinanceSchema();
  const [months, monthlySpend, ytdSpend] = await Promise.all([
    queryMonthlySpend(last12MonthFiltersForCategory(categoryId)),
    querySpendTotal(currentMonthFiltersForCategory(categoryId)),
    querySpendTotal(ytdFiltersForCategory(categoryId)),
  ]);
  const total12m = months.reduce((s, m) => s + m.amount, 0);
  return {
    months,
    monthlySpend,
    ytdSpend,
    averageMonthly: months.length ? total12m / months.length : 0,
  };
}

export async function loadSpendingDrillDown(input: {
  categoryId: SpendingHomeCategoryId;
  month: string;
  merchant?: string | null;
}): Promise<SpendingDrillDownData | null> {
  await ensureFinanceSchema();
  const range = spendingMonthDateRange(input.month);
  if (!range) return null;

  const def = spendingCategoryById(input.categoryId);
  const filters = filtersForCategoryMonth(input.categoryId, range.from, range.to);

  const { sql, params } = await import("@/lib/ops/finance/finance-filters").then((m) =>
    m.buildFilterSql(filters),
  );

  const merchantClause = input.merchant
    ? ` AND lower(COALESCE(NULLIF(TRIM(t.merchant), ''), 'Unknown')) = lower($${params.length + 1})`
    : "";
  const merchantParams = input.merchant ? [...params, input.merchant] : params;

  const [totalRow, countRow, merchants, txnRows] = await Promise.all([
    inspectQuery<{ total: string }>(
      `SELECT COALESCE(SUM(ABS(t.amount)), 0)::text AS total
       FROM finance_transactions t
       LEFT JOIN finance_accounts a ON a.id = t.account_id
       LEFT JOIN finance_categories c ON c.id = t.category_id
       ${sql}${merchantClause}`,
      merchantParams,
    ),
    inspectQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM finance_transactions t
       LEFT JOIN finance_accounts a ON a.id = t.account_id
       LEFT JOIN finance_categories c ON c.id = t.category_id
       ${sql}${merchantClause}`,
      merchantParams,
    ),
    queryTopMerchants(filters, 12),
    inspectQuery<{
      id: string;
      transaction_date: string;
      merchant: string;
      description: string;
      amount: string;
      account_name: string | null;
      account_slug: string | null;
      subcategory: string | null;
      source: string;
      account_id: string | null;
      flow_kind: string;
      category_label: string | null;
    }>(
      `SELECT t.id::text, t.transaction_date::text, t.merchant, t.description, t.amount::text,
              a.name AS account_name, a.slug AS account_slug, t.subcategory, t.source,
              t.account_id::text, t.flow_kind, c.label AS category_label
       FROM finance_transactions t
       LEFT JOIN finance_accounts a ON a.id = t.account_id
       LEFT JOIN finance_categories c ON c.id = t.category_id
       ${sql}${merchantClause}
       ORDER BY t.transaction_date DESC, t.id DESC
       LIMIT 200`,
      merchantParams,
    ),
  ]);

  const transactions: SpendingDrillDownTxn[] = txnRows.map((r) => {
    const txn: FinanceTransaction = {
      id: Number(r.id),
      transactionDate: r.transaction_date.slice(0, 10),
      merchant: r.merchant,
      description: r.description,
      amount: Number(r.amount),
      accountId: r.account_id ? Number(r.account_id) : null,
      accountName: r.account_name,
      subcategory: r.subcategory,
      source: r.source,
      flowKind: r.flow_kind,
      categorySlug: r.account_slug,
      categoryLabel: r.category_label,
      categoryId: null,
      groupName: null,
      importance: null,
      reviewStatus: "approved",
      rawImportId: null,
      createdAt: "",
      taxTreatment: null,
      notes: null,
      rulePattern: null,
    };
    const catId = inferSpendingEditCategory(txn);
    const catLabel = SPENDING_EDIT_CATEGORIES.find((c) => c.id === catId)?.label ?? "Uncategorized";
    return {
      id: Number(r.id),
      transactionDate: r.transaction_date.slice(0, 10),
      merchant: r.merchant,
      description: r.description,
      amount: Number(r.amount),
      categoryId: catId,
      categoryLabel: catLabel,
      accountName: r.account_name,
    };
  });

  return {
    month: input.month,
    monthDisplay: range.display,
    categoryId: input.categoryId,
    categoryLabel: def.label,
    totalSpending: Number(totalRow[0]?.total ?? 0),
    transactionCount: Number(countRow[0]?.count ?? 0),
    topMerchants: merchants,
    transactions,
  };
}

export function currentChartMonthLabel(): string {
  const d = new Date();
  const mon = d.toLocaleDateString("en-US", { month: "short" });
  const yy = String(d.getFullYear()).slice(-2);
  return `${mon} ${yy}`;
}

export async function loadUtilitiesCurrentMonthTxns(): Promise<SpendingDrillDownTxn[]> {
  const data = await loadSpendingDrillDown({
    categoryId: "utilities",
    month: currentChartMonthLabel(),
  });
  return data?.transactions ?? [];
}
