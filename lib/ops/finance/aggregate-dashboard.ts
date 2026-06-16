import type { FinanceDashboardData, FinanceHealthLabel } from "@/lib/ops/finance/types";
import { inspectPing } from "@/lib/inspect/pg";

import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { queryAmazonSummary } from "@/lib/ops/finance/db/amazon-orders";
import {
  countFinanceTransactions,
  countReviewQueue,
  queryFastestGrowing,
  queryGroupSpend,
  queryIncomeBySource,
  queryIncomeTotal,
  queryMonthlyCashFlow,
  queryMonthlySpend,
  querySpendByCategory,
  querySpendByImportance,
  querySpendTotal,
  querySourceSpend,
  querySubscriptions,
} from "@/lib/ops/finance/db/transactions";
import type { FinanceFilters } from "@/lib/ops/finance/finance-filters";
import { filtersDateRange, formatActiveFiltersLabel, priorPeriodFilters } from "@/lib/ops/finance/finance-filters";
import type { FinanceImportance } from "@/lib/ops/finance/finance-importance";
import {
  buildRetirementSimulator,
  estimateTaxAnnual,
  mergeBillsWithBaseline,
  mergeIncomeWithBaseline,
} from "@/lib/ops/finance/retirement-simulator";
import { retirementIncomeMonthly, RETIREMENT_INCOME_STREAMS } from "@/lib/ops/finance/retirement-profile";
import { calculateRetirementReadiness } from "@/lib/ops/finance/retirement-readiness";

function healthAi(monthly: number): FinanceHealthLabel {
  if (monthly >= 250) return "Problem";
  if (monthly >= 150) return "Review";
  if (monthly >= 75) return "Watch";
  return "Healthy";
}

function healthRetro(monthly: number): FinanceHealthLabel {
  if (monthly >= 800) return "Problem";
  if (monthly >= 500) return "Review";
  if (monthly >= 350) return "Watch";
  return "Healthy";
}

function padTrend(months: { month: string; amount: number }[]) {
  const copy = [...months];
  while (copy.length < 12) {
    copy.unshift({ month: "—", amount: 0 });
  }
  return copy.slice(-12);
}

function widgetCategoryFilters(
  filters: FinanceFilters,
  category: FinanceFilters["categories"][number],
): FinanceFilters | null {
  if (filters.categories.length > 0 && !filters.categories.includes(category)) {
    return null;
  }
  return { ...filters, categories: [category] };
}

function billsWidgetFilters(filters: FinanceFilters): FinanceFilters | null {
  if (filters.categories.length === 0) {
    return { ...filters, categories: ["utilities", "home"] };
  }
  const billCats = filters.categories.filter((c) => c === "utilities" || c === "home");
  if (!billCats.length) return null;
  return { ...filters, categories: billCats };
}

export async function buildDashboardFromTransactions(
  filters: FinanceFilters,
): Promise<FinanceDashboardData | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;
  const ready = await ensureFinanceSchema();
  if (!ready) return null;

  const txnCount = await countFinanceTransactions();
  if (txnCount <= 0) return null;

  const range = filtersDateRange(filters);
  const total = await querySpendTotal(filters);
  const byCategory = await querySpendByCategory(filters);
  const allMonthly = await queryMonthlySpend(filters);
  const monthsInPeriod = Math.max(allMonthly.length, 1);

  const aiFilters = widgetCategoryFilters(filters, "ai");
  const retroFilters = widgetCategoryFilters(filters, "retroverse");
  const billsFilters = billsWidgetFilters(filters);

  const [
    aiTotal,
    retroTotal,
    aiMonthly,
    retroMonthly,
    appleSpend,
    amazonSpend,
    incomeTotal,
    incomeLines,
    billsTotal,
    reviewCount,
    subs,
    cashMonths,
    fastestGrowing,
    byImportanceRows,
    amazonSummary,
  ] = await Promise.all([
    aiFilters ? queryGroupSpend(aiFilters, "AI") : Promise.resolve(0),
    retroFilters ? queryGroupSpend(retroFilters, "Retroverse") : Promise.resolve(0),
    aiFilters ? queryMonthlySpend(aiFilters, "AI") : Promise.resolve([]),
    retroFilters ? queryMonthlySpend(retroFilters, "Retroverse") : Promise.resolve([]),
    querySourceSpend(filters, "apple_card"),
    querySourceSpend(filters, "amazon"),
    queryIncomeTotal(filters),
    queryIncomeBySource(filters),
    billsFilters ? querySpendTotal(billsFilters) : Promise.resolve(0),
    countReviewQueue(filters),
    querySubscriptions(filters),
    queryMonthlyCashFlow(filters),
    queryFastestGrowing(filters),
    querySpendByImportance(filters),
    queryAmazonSummary(),
  ]);

  const aiAvg = aiTotal / monthsInPeriod;
  const retroAvg = retroTotal / monthsInPeriod;
  const totalSpendMonthly = total / monthsInPeriod;

  const prior = priorPeriodFilters(filters);
  let aiPctChange = 0;
  if (prior && aiFilters) {
    const priorAi = await queryGroupSpend({ ...prior, categories: ["ai"] }, "AI");
    aiPctChange = priorAi > 0 ? ((aiTotal - priorAi) / priorAi) * 100 : aiTotal > 0 ? 100 : 0;
  }

  const billsCategories = billsFilters
    ? byCategory.filter((c) =>
        ["utilities", "home"].includes(c.slug) || ["Utilities", "Household"].includes(c.groupName),
      )
    : [];

  const txnIncomeMonthly = incomeTotal / monthsInPeriod;
  const txnBillsMonthly = billsTotal / monthsInPeriod;

  const incomeMerged = mergeIncomeWithBaseline(
    txnIncomeMonthly,
    incomeLines.map((l) => ({ label: l.label, amount: l.amount / monthsInPeriod })),
  );

  const billsMerged = mergeBillsWithBaseline(
    txnBillsMonthly,
    billsCategories.map((c) => ({ label: c.label, amount: c.amount / monthsInPeriod })),
  );

  const byImportance: Partial<Record<FinanceImportance, number>> = {};
  for (const row of byImportanceRows) {
    const key = row.importance as FinanceImportance;
    byImportance[key] = (byImportance[key] ?? 0) + row.amount / monthsInPeriod;
  }

  const retirementNotes = [...incomeMerged.notes, ...billsMerged.notes];
  const retirement = buildRetirementSimulator({
    incomeMonthly: incomeMerged.monthly,
    incomeLines: incomeMerged.lines,
    incomeSource: incomeMerged.source,
    requiredBillsMonthly: billsMerged.monthly,
    billsLines: billsMerged.lines,
    billsSource: billsMerged.source,
    aiMonthly: aiAvg,
    retroverseMonthly: retroAvg,
    totalSpendMonthly,
    byImportance,
    notes: retirementNotes,
  });

  const taxEstimate = estimateTaxAnnual(incomeMerged.monthly * 12);

  const readiness = calculateRetirementReadiness({
    currentIncomeMonthly: incomeMerged.monthly,
    retirementIncomeMonthly: retirementIncomeMonthly(RETIREMENT_INCOME_STREAMS, "A"),
    currentSpendingMonthly: totalSpendMonthly,
    requiredSpendingMonthly: billsMerged.monthly,
    importanceMonthly: {
      required: byImportance.required ?? billsMerged.monthly,
      useful: byImportance.useful ?? 0,
      optional: byImportance.optional ?? 0,
      luxury: byImportance.luxury ?? 0,
    },
    pendingReview: reviewCount,
  });

  const topCategories = byCategory.slice(0, 10).map((c) => ({
    category: c.label,
    amount: c.amount,
    pct: total > 0 ? Math.round((c.amount / total) * 1000) / 10 : 0,
  }));

  const dataThrough = range.to ?? new Date().toISOString().slice(0, 10);
  const recentCutoff = new Date(`${dataThrough}T12:00:00`);
  recentCutoff.setDate(recentCutoff.getDate() - 45);

  const activeSubs = subs
    .filter((s) => s.lastCharge && new Date(`${s.lastCharge}T12:00:00`) >= recentCutoff)
    .map((s) => ({
      vendor: s.vendor,
      monthly: s.monthly,
      annual: s.annual,
      lastCharge: s.lastCharge,
      status: (s.monthly >= 50 ? "Watch" : "Healthy") as FinanceHealthLabel,
      note: s.count > 1 ? `${s.count} charges in period` : undefined,
    }));

  const subsMonthly = activeSubs.reduce((s, sub) => s + sub.monthly, 0);

  const paddedCash = cashMonths.length
    ? [...cashMonths].slice(-12)
    : Array.from({ length: 12 }, () => ({ month: "—", in: 0, out: 0, net: 0 }));

  while (paddedCash.length < 12) {
    paddedCash.unshift({ month: "—", in: 0, out: 0, net: 0 });
  }

  if (incomeMerged.monthly > 0 && paddedCash.length) {
    const last = paddedCash[paddedCash.length - 1];
    if (last) last.in = incomeMerged.monthly;
  }

  const savings = [];
  if (reviewCount > 0) {
    savings.push({
      id: "review-queue",
      label: "Review queue",
      estimateMonthly: 0,
      detail: `${reviewCount} transactions need a category`,
      status: "Review" as FinanceHealthLabel,
    });
  }
  if (retirement.downsizing.total > 0) {
    savings.push({
      id: "downsizing",
      label: "Retirement downsizing",
      estimateMonthly: retirement.downsizing.total,
      detail: "Optional + luxury spend could be trimmed",
      status: "Watch" as FinanceHealthLabel,
    });
  }

  const monthlyNet = retirement.monthlySurplus;

  return {
    generatedAt: new Date().toISOString(),
    workbookPath: "finance_transactions",
    workbookMtime: null,
    periodLabel: range.label,
    activeFiltersLabel: formatActiveFiltersLabel(filters),
    dataThrough,
    dataSource: "postgres",
    income: {
      monthlyEstimate: incomeMerged.monthly,
      ytd: incomeMerged.monthly * monthsInPeriod,
      status: incomeMerged.monthly >= 3500 ? "Healthy" : "Watch",
      sources: incomeMerged.lines,
    },
    requiredBills: {
      monthlyEstimate: billsMerged.monthly,
      status: billsMerged.monthly > 1500 ? "Watch" : "Healthy",
      lines: billsMerged.lines,
    },
    appleCard: {
      lifetime: appleSpend,
      ytd: appleSpend,
      monthlyAvg: appleSpend / monthsInPeriod,
      status: appleSpend > 50000 ? "Watch" : "Healthy",
    },
    amazon: {
      lifetime: amazonSpend,
      ytd: amazonSpend,
      monthlyAvg: amazonSpend / monthsInPeriod,
      status: amazonSpend / monthsInPeriod > 500 ? "Watch" : "Healthy",
      note: "From imported transactions",
    },
    ai: {
      monthlyAvg: aiAvg,
      ytd: aiTotal,
      runRateAnnual: aiAvg * 12,
      lifetime: aiTotal,
      pctOfAppleSpend: appleSpend > 0 ? Math.round((aiTotal / appleSpend) * 1000) / 10 : 0,
      pctChangeVsPriorYear: aiPctChange,
      status: healthAi(aiAvg),
      tools: byCategory.filter((c) => c.groupName === "AI").map((c) => c.label),
      flags: reviewCount > 0 ? [`${reviewCount} items in review queue`] : [],
      trend: {
        months: padTrend(aiMonthly),
        monthlyAvg12: aiAvg,
        annualProjection: aiAvg * 12,
      },
    },
    retroverse: {
      opsMonthly: retroAvg,
      opsYtd: retroTotal,
      gearYtd: byCategory.find((c) => c.slug === "retro-equipment")?.amount ?? 0,
      hostingMonthly:
        (byCategory.find((c) => c.slug === "retro-hosting")?.amount ?? 0) / monthsInPeriod,
      annualEstimate: retroAvg * 12,
      status: healthRetro(retroAvg),
      lines: byCategory
        .filter((c) => c.groupName === "Retroverse")
        .slice(0, 6)
        .map((c) => ({ label: c.label, amount: c.amount / monthsInPeriod })),
      trend: {
        months: padTrend(retroMonthly),
        monthlyAvg12: retroAvg,
        annualProjection: retroAvg * 12,
      },
    },
    subscriptions: {
      monthlyTotal: subsMonthly,
      annualTotal: subsMonthly * 12,
      status: subsMonthly >= 300 ? "Watch" : "Healthy",
      active: activeSubs,
      top: subs.slice(0, 5).map((s) => ({
        vendor: s.vendor,
        monthly: s.monthly,
        lifetime: s.annual,
        status: (s.monthly >= 50 ? "Watch" : "Healthy") as FinanceHealthLabel,
      })),
      moreCount: Math.max(0, subs.length - 5),
      moreMonthly: subs.slice(5).reduce((sum, s) => sum + s.monthly, 0),
    },
    cashFlow: {
      status: monthlyNet >= 0 ? "Healthy" : "Review",
      monthlyNet,
      nebatBalance: 0,
      months: paddedCash.slice(-12),
    },
    topCategories,
    opportunity: {
      largest: topCategories.slice(0, 6).map((c) => ({
        category: c.category,
        amount: c.amount,
        pct: c.pct,
      })),
      fastestGrowing: fastestGrowing.map((r) => ({
        category: r.category,
        amount: r.amount,
        priorAmount: r.priorAmount,
        changePct: r.changePct,
      })),
      potentialSavings: savings,
    },
    reviewNeeded: reviewCount
      ? [
          {
            id: "review-queue",
            label: "Review queue",
            detail: `${reviewCount} uncategorized transactions`,
            status: "Review" as FinanceHealthLabel,
          },
        ]
      : [],
    retirement,
    tax: {
      estimatedAnnualIncome: Math.round(incomeMerged.monthly * 12),
      estimatedTaxLiability: taxEstimate.estimatedLiability,
      effectiveTaxRate: taxEstimate.effectiveRate,
      marginalTaxRate: taxEstimate.marginalRate,
      status: taxEstimate.effectiveRate > 18 ? "Watch" : "Healthy",
      note: "Federal estimate only · single filer · standard deduction",
    },
    amazonOrders: {
      ytdSpend: amazonSummary.ytdSpend,
      monthlyAvg: amazonSummary.monthlyAvg,
      byCategory: amazonSummary.byCategory.map((c) => ({
        category: c.category,
        amount: c.amount,
      })),
      retroverseSpend: amazonSummary.retroverseSpend,
      printing3dSpend: amazonSummary.printing3dSpend,
      topItems: amazonSummary.topItems.map((i) => ({
        description: i.description,
        amount: i.amount,
      })),
    },
    readiness,
  };
}
