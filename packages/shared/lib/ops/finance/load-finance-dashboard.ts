import { execFile } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import type { FinanceDashboardData } from "@/lib/ops/finance/types";
import { buildDashboardFromTransactions } from "@/lib/ops/finance/aggregate-dashboard";
import {
  defaultFinanceFilters,
  filtersDateRange,
  formatActiveFiltersLabel,
  type FinanceFilters,
} from "@/lib/ops/finance/finance-filters";
import { calculateRetirementReadiness } from "@/lib/ops/finance/retirement-readiness";
import { retirementIncomeMonthly, RETIREMENT_INCOME_STREAMS } from "@/lib/ops/finance/retirement-profile";
import {
  buildRetirementSimulator,
  estimateTaxAnnual,
  mergeBillsWithBaseline,
  mergeIncomeWithBaseline,
} from "@/lib/ops/finance/retirement-simulator";

const execFileAsync = promisify(execFile);

const DEFAULT_WORKBOOK = "/Users/bobhopp/FINANCIAL/2021-2026 Financial Workbook.xlsx";
const SNAPSHOT_PATH = join(process.cwd(), "reports/finance-snapshot.json");
const GENERATOR = join(process.cwd(), "tools/generate-finance-snapshot.py");

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function maybeRefreshSnapshot(): Promise<void> {
  const workbookPath = process.env.FINANCE_WORKBOOK_PATH?.trim() || DEFAULT_WORKBOOK;
  if (!(await fileExists(workbookPath)) || !(await fileExists(GENERATOR))) {
    return;
  }

  let snapshotMtime = 0;
  if (await fileExists(SNAPSHOT_PATH)) {
    snapshotMtime = (await stat(SNAPSHOT_PATH)).mtimeMs;
  }

  const workbookMtime = (await stat(workbookPath)).mtimeMs;
  if (workbookMtime <= snapshotMtime) {
    return;
  }

  try {
    await execFileAsync("python3", [GENERATOR, workbookPath], {
      cwd: process.cwd(),
      timeout: 60_000,
    });
  } catch {
    // Fall back to committed snapshot if live refresh fails.
  }
}

async function loadSnapshotDashboard(): Promise<FinanceDashboardData> {
  await maybeRefreshSnapshot();
  const raw = await readFile(SNAPSHOT_PATH, "utf8");
  const data = JSON.parse(raw) as FinanceDashboardData;

  const incomeMerged = mergeIncomeWithBaseline(
    data.income.monthlyEstimate,
    data.income.sources,
  );
  const billsMerged = mergeBillsWithBaseline(
    data.requiredBills.monthlyEstimate,
    data.requiredBills.lines,
  );

  const retirement = buildRetirementSimulator({
    incomeMonthly: incomeMerged.monthly,
    incomeLines: incomeMerged.lines,
    incomeSource: incomeMerged.source,
    requiredBillsMonthly: billsMerged.monthly,
    billsLines: billsMerged.lines,
    billsSource: billsMerged.source,
    aiMonthly: data.ai.monthlyAvg,
    retroverseMonthly: data.retroverse.opsMonthly,
    totalSpendMonthly:
      billsMerged.monthly + data.ai.monthlyAvg + data.retroverse.opsMonthly + 800,
    byImportance: {} as Partial<Record<"required" | "useful" | "optional" | "luxury", number>>,
    notes: [...incomeMerged.notes, ...billsMerged.notes, "Snapshot mode — filters do not re-aggregate."],
  });

  const taxEstimate = estimateTaxAnnual(incomeMerged.monthly * 12);

  return {
    ...data,
    dataSource: "snapshot",
    income: {
      ...data.income,
      monthlyEstimate: incomeMerged.monthly,
      sources: incomeMerged.lines,
    },
    requiredBills: {
      ...data.requiredBills,
      monthlyEstimate: billsMerged.monthly,
      lines: billsMerged.lines,
    },
    cashFlow: {
      ...data.cashFlow,
      monthlyNet: retirement.monthlySurplus,
    },
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
      ytdSpend: 0,
      monthlyAvg: 0,
      byCategory: [],
      retroverseSpend: 0,
      printing3dSpend: 0,
      topItems: [],
    },
    readiness: calculateRetirementReadiness({
      currentIncomeMonthly: incomeMerged.monthly,
      retirementIncomeMonthly: retirementIncomeMonthly(RETIREMENT_INCOME_STREAMS, "A"),
      currentSpendingMonthly: data.ai.monthlyAvg + data.retroverse.opsMonthly + billsMerged.monthly + 800,
      requiredSpendingMonthly: billsMerged.monthly,
      importanceMonthly: {},
      pendingReview: 0,
    }),
  };
}

export async function loadFinanceDashboard(
  filters: FinanceFilters = defaultFinanceFilters(),
): Promise<FinanceDashboardData> {
  const fromDb = await buildDashboardFromTransactions(filters);
  if (fromDb) {
    return fromDb;
  }
  const snapshot = await loadSnapshotDashboard();
  const range = filtersDateRange(filters);
  return {
    ...snapshot,
    periodLabel: range.label,
    activeFiltersLabel: formatActiveFiltersLabel(filters),
    dataThrough: range.to ?? snapshot.dataThrough,
  };
}

export type { FinanceDashboardData, FinanceHealthLabel } from "@/lib/ops/finance/types";
export type { FinanceFilters } from "@/lib/ops/finance/finance-filters";
export { parseFinanceFilters, defaultFinanceFilters, formatActiveFiltersLabel } from "@/lib/ops/finance/finance-filters";
export type { FinancePeriod } from "@/lib/ops/finance/finance-model";
export { FINANCE_PERIODS } from "@/lib/ops/finance/finance-model";
