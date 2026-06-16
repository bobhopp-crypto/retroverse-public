import type { FinanceImportance } from "@/lib/ops/finance/finance-importance";
import { downsizingPotentialMonthly } from "@/lib/ops/finance/finance-importance";
import {
  REQUIRED_BILL_LINES,
  RETIREMENT_INCOME_STREAMS,
  requiredBillsMonthly,
  retirementIncomeMonthly,
  totalBaselineIncomeMonthly,
} from "@/lib/ops/finance/retirement-profile";

export type RetirementScenarioId = "A" | "B" | "C";

export type RetirementScenario = {
  id: RetirementScenarioId;
  label: string;
  description: string;
  incomeMonthly: number;
  expensesMonthly: number;
  surplusMonthly: number;
  surplusAnnual: number;
  incomeLines: { label: string; amount: number }[];
  expenseLines: { label: string; amount: number }[];
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

const SCENARIO_META: Record<RetirementScenarioId, { label: string; description: string }> = {
  A: { label: "Retire today", description: "Social Security + SSM Health only" },
  B: { label: "Keep funeral home", description: "Scenario A + funeral home income (~$400/mo)" },
  C: { label: "DJ occasionally", description: "Scenario A + DJ side income (~$167/mo avg)" },
};

export function buildRetirementSimulator(input: {
  incomeMonthly: number;
  incomeLines: { label: string; amount: number }[];
  incomeSource: "baseline" | "transactions" | "blended";
  requiredBillsMonthly: number;
  billsLines: { label: string; amount: number }[];
  billsSource: "baseline" | "transactions" | "blended";
  aiMonthly: number;
  retroverseMonthly: number;
  totalSpendMonthly: number;
  byImportance: Partial<Record<FinanceImportance, number>>;
  notes?: string[];
}): RetirementSimulatorData {
  const requiredBills = input.requiredBillsMonthly;
  const discretionary = Math.max(
    0,
    input.totalSpendMonthly - requiredBills - input.aiMonthly - input.retroverseMonthly,
  );
  const totalExpenses = requiredBills + discretionary + input.aiMonthly + input.retroverseMonthly;
  const monthlySurplus = input.incomeMonthly - totalExpenses;

  const expenseLines = [
    { label: "Required bills", amount: requiredBills },
    { label: "Discretionary", amount: discretionary },
    { label: "AI spending", amount: input.aiMonthly },
    { label: "Retroverse spending", amount: input.retroverseMonthly },
  ];

  const scenarios: RetirementScenario[] = (["A", "B", "C"] as RetirementScenarioId[]).map((id) => {
    const incomeMonthly = retirementIncomeMonthly(RETIREMENT_INCOME_STREAMS, id);
    const incomeLines = RETIREMENT_INCOME_STREAMS.filter((s) => {
      if (id === "A") return s.scenarioA;
      if (id === "B") return s.scenarioA || s.scenarioB;
      return s.scenarioA || s.scenarioC;
    }).map((s) => ({ label: s.label, amount: s.monthly }));

    const surplusMonthly = incomeMonthly - totalExpenses;
    return {
      id,
      label: SCENARIO_META[id].label,
      description: SCENARIO_META[id].description,
      incomeMonthly,
      expensesMonthly: totalExpenses,
      surplusMonthly,
      surplusAnnual: surplusMonthly * 12,
      incomeLines,
      expenseLines,
    };
  });

  return {
    currentIncomeMonthly: input.incomeMonthly,
    requiredBillsMonthly: requiredBills,
    discretionaryMonthly: discretionary,
    aiMonthly: input.aiMonthly,
    retroverseMonthly: input.retroverseMonthly,
    totalExpensesMonthly: totalExpenses,
    monthlySurplus,
    annualSurplus: monthlySurplus * 12,
    incomeSource: input.incomeSource,
    billsSource: input.billsSource,
    downsizing: downsizingPotentialMonthly(input.byImportance),
    byImportance: input.byImportance,
    scenarios,
    notes: input.notes ?? [],
  };
}

export function mergeIncomeWithBaseline(
  transactionMonthly: number,
  transactionLines: { label: string; amount: number }[],
): {
  monthly: number;
  lines: { label: string; amount: number }[];
  source: "baseline" | "transactions" | "blended";
  notes: string[];
} {
  const baseline = totalBaselineIncomeMonthly();
  const notes: string[] = [];

  if (transactionMonthly <= 0) {
    notes.push("Money In uses retirement baseline — NEBAT deposits not yet imported.");
    return {
      monthly: baseline,
      lines: RETIREMENT_INCOME_STREAMS.map((s) => ({ label: s.label, amount: s.monthly })),
      source: "baseline",
      notes,
    };
  }

  if (transactionMonthly < baseline * 0.85) {
    notes.push("Imported income below baseline — showing higher of baseline vs transactions.");
    return {
      monthly: Math.max(baseline, transactionMonthly),
      lines:
        transactionMonthly > baseline
          ? transactionLines
          : RETIREMENT_INCOME_STREAMS.map((s) => ({ label: s.label, amount: s.monthly })),
      source: "blended",
      notes,
    };
  }

  return { monthly: transactionMonthly, lines: transactionLines, source: "transactions", notes };
}

export function mergeBillsWithBaseline(
  transactionMonthly: number,
  transactionLines: { label: string; amount: number }[],
): {
  monthly: number;
  lines: { label: string; amount: number }[];
  source: "baseline" | "transactions" | "blended";
  notes: string[];
} {
  const baseline = requiredBillsMonthly();
  const notes: string[] = [];

  if (transactionMonthly <= 0) {
    notes.push("Required Bills uses baseline floor — utilities/mortgage not fully categorized in DB.");
    return {
      monthly: baseline,
      lines: REQUIRED_BILL_LINES.map((l) => ({ label: l.label, amount: l.monthly })),
      source: "baseline",
      notes,
    };
  }

  if (transactionMonthly < baseline * 0.75) {
    notes.push("Categorized bills undercount vs known minimum — using baseline floor.");
    return {
      monthly: Math.max(baseline, transactionMonthly),
      lines:
        transactionMonthly >= baseline
          ? transactionLines
          : REQUIRED_BILL_LINES.map((l) => ({ label: l.label, amount: l.monthly })),
      source: "blended",
      notes,
    };
  }

  return { monthly: transactionMonthly, lines: transactionLines, source: "transactions", notes };
}

export function estimateTaxAnnual(incomeAnnual: number): {
  estimatedLiability: number;
  effectiveRate: number;
  marginalRate: number;
} {
  const standardDeduction = 14600;
  const taxable = Math.max(0, incomeAnnual - standardDeduction);
  const brackets = [
    { upTo: 11600, rate: 0.1 },
    { upTo: 47150, rate: 0.12 },
    { upTo: 100525, rate: 0.22 },
    { upTo: 191950, rate: 0.24 },
    { upTo: 243725, rate: 0.32 },
    { upTo: 609350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ];

  let tax = 0;
  let prev = 0;
  let marginalRate = 0.1;
  for (const b of brackets) {
    const slice = Math.min(taxable, b.upTo) - prev;
    if (slice <= 0) break;
    tax += slice * b.rate;
    marginalRate = b.rate;
    prev = b.upTo;
    if (taxable <= b.upTo) break;
  }

  return {
    estimatedLiability: Math.round(tax),
    effectiveRate: incomeAnnual > 0 ? Math.round((tax / incomeAnnual) * 1000) / 10 : 0,
    marginalRate: Math.round(marginalRate * 1000) / 10,
  };
}

export function simulate401kContribution(input: {
  annualIncome: number;
  contributionAnnual: number;
}): {
  taxReduction: number;
  netTakeHomeImpact: number;
  effectiveCost: number;
} {
  const before = estimateTaxAnnual(input.annualIncome);
  const after = estimateTaxAnnual(Math.max(0, input.annualIncome - input.contributionAnnual));
  const taxReduction = before.estimatedLiability - after.estimatedLiability;
  const netTakeHomeImpact = input.contributionAnnual - taxReduction;
  return {
    taxReduction: Math.round(taxReduction),
    netTakeHomeImpact: Math.round(netTakeHomeImpact),
    effectiveCost: Math.round(netTakeHomeImpact),
  };
}
