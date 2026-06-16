export type FinanceHealthLabel = "Healthy" | "Watch" | "Review" | "Problem";

export type FinanceTrendMonth = {
  month: string;
  amount: number;
};

export type FinanceTrend = {
  months: FinanceTrendMonth[];
  monthlyAvg12: number;
  annualProjection: number;
};

export type FinanceActiveSubscription = {
  vendor: string;
  monthly: number;
  annual: number;
  lastCharge: string;
  status: FinanceHealthLabel;
  note?: string;
};

export type FinanceOpportunityCategory = {
  category: string;
  amount: number;
  pct?: number;
  changePct?: number;
  priorAmount?: number;
};

export type FinanceSavingsOpportunity = {
  id: string;
  label: string;
  estimateMonthly: number;
  detail: string;
  status: FinanceHealthLabel;
};

export type FinanceOpportunity = {
  largest: FinanceOpportunityCategory[];
  fastestGrowing: FinanceOpportunityCategory[];
  potentialSavings: FinanceSavingsOpportunity[];
};

export type FinanceSourceLine = {
  label: string;
  amount: number;
};

export type FinanceSubscriptionRow = {
  vendor: string;
  monthly: number;
  lifetime: number;
  status: FinanceHealthLabel;
  note?: string;
};

export type FinanceCategoryRow = {
  category: string;
  amount: number;
  pct: number;
};

export type FinanceCashFlowMonth = {
  month: string;
  in: number;
  out: number;
  net: number;
};

export type FinanceReviewItem = {
  id: string;
  label: string;
  detail: string;
  status: FinanceHealthLabel;
};

export type FinanceDashboardData = {
  generatedAt: string;
  workbookPath: string;
  workbookMtime: string | null;
  periodLabel: string;
  activeFiltersLabel?: string;
  dataThrough: string;
  dataSource?: "postgres" | "snapshot";

  income: {
    monthlyEstimate: number;
    ytd: number;
    status: FinanceHealthLabel;
    sources: FinanceSourceLine[];
  };

  requiredBills: {
    monthlyEstimate: number;
    status: FinanceHealthLabel;
    lines: FinanceSourceLine[];
  };

  appleCard: {
    lifetime: number;
    ytd: number;
    monthlyAvg: number;
    status: FinanceHealthLabel;
  };

  amazon: {
    lifetime: number;
    ytd: number;
    monthlyAvg: number;
    status: FinanceHealthLabel;
    note: string;
  };

  ai: {
    monthlyAvg: number;
    ytd: number;
    runRateAnnual: number;
    lifetime: number;
    pctOfAppleSpend: number;
    pctChangeVsPriorYear: number;
    status: FinanceHealthLabel;
    tools: string[];
    flags: string[];
    trend: FinanceTrend;
  };

  retroverse: {
    opsMonthly: number;
    opsYtd: number;
    gearYtd: number;
    hostingMonthly: number;
    annualEstimate: number;
    status: FinanceHealthLabel;
    lines: FinanceSourceLine[];
    trend: FinanceTrend;
  };

  subscriptions: {
    monthlyTotal: number;
    annualTotal: number;
    status: FinanceHealthLabel;
    active: FinanceActiveSubscription[];
    top: FinanceSubscriptionRow[];
    moreCount: number;
    moreMonthly: number;
  };

  cashFlow: {
    status: FinanceHealthLabel;
    monthlyNet: number;
    nebatBalance: number;
    months: FinanceCashFlowMonth[];
  };

  topCategories: FinanceCategoryRow[];

  opportunity: FinanceOpportunity;

  reviewNeeded: FinanceReviewItem[];

  retirement: RetirementSimulatorData;

  tax: FinanceTaxPlanningData;

  amazonOrders: FinanceAmazonSummary;

  readiness: RetirementReadiness;
};

export type FinanceAmazonSummary = {
  ytdSpend: number;
  monthlyAvg: number;
  byCategory: { category: string; amount: number }[];
  retroverseSpend: number;
  printing3dSpend: number;
  topItems: { description: string; amount: number }[];
};

export type RetirementReadiness = {
  score: number;
  label: string;
  currentIncomeMonthly: number;
  retirementIncomeMonthly: number;
  currentSpendingMonthly: number;
  requiredSpendingMonthly: number;
  retirementSurplusMonthly: number;
  importanceMonthly: {
    required: number;
    useful: number;
    optional: number;
    luxury: number;
  };
  downsizingScenario: {
    monthlySavings: number;
    annualSavings: number;
    description: string;
  };
  explanation: string[];
};

export type RetirementScenario = {
  id: "A" | "B" | "C";
  label: string;
  description: string;
  incomeMonthly: number;
  expensesMonthly: number;
  surplusMonthly: number;
  surplusAnnual: number;
  incomeLines: FinanceSourceLine[];
  expenseLines: FinanceSourceLine[];
};

export type RetirementSimulatorData = {
  currentIncomeMonthly: number;
  requiredBillsMonthly: number;
  discretionaryMonthly: number;
  aiMonthly: number;
  retroverseMonthly: number;
  totalExpensesMonthly: number;
  monthlySurplus: number;
  annualSurplus: number;
  incomeSource: "baseline" | "transactions" | "blended";
  billsSource: "baseline" | "transactions" | "blended";
  downsizing: { optional: number; luxury: number; total: number };
  byImportance: Partial<Record<FinanceImportance, number>>;
  scenarios: RetirementScenario[];
  notes: string[];
};

export type FinanceImportance = "required" | "useful" | "optional" | "luxury";

export type FinanceTaxPlanningData = {
  estimatedAnnualIncome: number;
  estimatedTaxLiability: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
  status: FinanceHealthLabel;
  note: string;
};
