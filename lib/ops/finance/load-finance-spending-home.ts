import { inspectPing } from "@/lib/inspect/pg";

import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import {
  queryMonthlySpend,
  queryRecentSpendTransactions,
  querySpendTotal,
  queryTopMerchants,
} from "@/lib/ops/finance/db/transactions";
import type { FinanceFilters } from "@/lib/ops/finance/finance-filters";
import { filtersDateRange } from "@/lib/ops/finance/finance-filters";
import type { GroundTruthAccount } from "@/lib/ops/finance/ground-truth-types";
import { loadFinanceGroundTruth } from "@/lib/ops/finance/load-finance-ground-truth";
import {
  SPENDING_HOME_CATEGORIES,
  type SpendingHomeCategoryId,
} from "@/lib/ops/finance/spending-home-categories";

export type SpendingMonthPoint = {
  month: string;
  amount: number;
};

export type SpendingMerchantRow = {
  merchant: string;
  amount: number;
  count: number;
};

export type SpendingRecentTxn = {
  transactionDate: string;
  merchant: string;
  description: string;
  amount: number;
};

export type SpendingCategorySeries = {
  id: SpendingHomeCategoryId;
  label: string;
  tier: "primary" | "more";
  months: SpendingMonthPoint[];
  monthlySpend: number;
  ytdSpend: number;
  averageMonthly: number;
  total12m: number;
  topMerchants: SpendingMerchantRow[];
  recentTransactions: SpendingRecentTxn[];
};

export type FinanceSpendingHomeData = {
  generatedAt: string;
  periodLabel: string;
  defaultCategoryId: SpendingHomeCategoryId;
  categories: SpendingCategorySeries[];
  accounts: GroundTruthAccount[];
  importsNeedingAttention: number;
};

function last12MonthFilters(): FinanceFilters {
  return {
    period: "last_12m",
    from: null,
    to: null,
    sources: [],
    categories: [],
  };
}

function ytdFilters(): FinanceFilters {
  const year = String(new Date().getFullYear());
  return {
    period: year as FinanceFilters["period"],
    from: null,
    to: null,
    sources: [],
    categories: [],
  };
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

function filtersForCategory(
  base: FinanceFilters,
  categories: FinanceFilters["categories"],
  sources: FinanceFilters["sources"] = [],
): FinanceFilters {
  return { ...base, categories, sources };
}

async function loadCategorySeries(
  def: (typeof SPENDING_HOME_CATEGORIES)[number],
): Promise<SpendingCategorySeries> {
  const chartFilters = filtersForCategory(last12MonthFilters(), def.filters, def.sources ?? []);
  const ytd = filtersForCategory(ytdFilters(), def.filters, def.sources ?? []);
  const month = filtersForCategory(currentMonthFilters(), def.filters, def.sources ?? []);

  const [months, ytdSpend, monthlySpend, topMerchants, recentTransactions] = await Promise.all([
    queryMonthlySpend(chartFilters),
    querySpendTotal(ytd),
    querySpendTotal(month),
    queryTopMerchants(ytd, 8),
    queryRecentSpendTransactions(ytd, 10),
  ]);

  const total12m = months.reduce((sum, m) => sum + m.amount, 0);
  const averageMonthly = months.length ? total12m / months.length : 0;

  return {
    id: def.id,
    label: def.label,
    tier: def.tier,
    months,
    monthlySpend,
    ytdSpend,
    averageMonthly,
    total12m,
    topMerchants,
    recentTransactions,
  };
}

export async function loadFinanceSpendingHome(): Promise<FinanceSpendingHomeData | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;
  await ensureFinanceSchema();

  const [categories, groundTruth] = await Promise.all([
    Promise.all(SPENDING_HOME_CATEGORIES.map((def) => loadCategorySeries(def))),
    loadFinanceGroundTruth(),
  ]);

  if (!groundTruth) return null;

  const periodLabel = filtersDateRange(last12MonthFilters()).label;

  return {
    generatedAt: new Date().toISOString(),
    periodLabel,
    defaultCategoryId: "total",
    categories,
    accounts: groundTruth.accounts,
    importsNeedingAttention: groundTruth.importsNeedingAttention,
  };
}
