import type { FinanceImportance } from "@/lib/ops/finance/finance-importance";

export type RetirementIncomeStream = {
  id: string;
  label: string;
  monthly: number;
  note?: string;
  /** Included in Scenario A (retire today) */
  scenarioA: boolean;
  /** Funeral home — Scenario B */
  scenarioB?: boolean;
  /** DJ / side income — Scenario C */
  scenarioC?: boolean;
};

/** Canonical retirement income baseline (Bob). */
export const RETIREMENT_INCOME_STREAMS: RetirementIncomeStream[] = [
  { id: "ss", label: "Social Security", monthly: 1715, scenarioA: true, scenarioB: true, scenarioC: true },
  {
    id: "ssm",
    label: "SSM Health",
    monthly: 1781.19,
    note: "$822.19 biweekly",
    scenarioA: true,
    scenarioB: true,
    scenarioC: true,
  },
  { id: "funeral", label: "Funeral Home", monthly: 400, scenarioA: false, scenarioB: true, scenarioC: false },
  { id: "dj", label: "DJ / Other", monthly: 167, scenarioA: false, scenarioB: false, scenarioC: true },
];

export type RequiredBillLine = {
  label: string;
  monthly: number;
  importance: FinanceImportance;
  matchSubcategories?: string[];
};

/** Canonical required monthly bills (minimum floor). */
export const REQUIRED_BILL_LINES: RequiredBillLine[] = [
  { label: "Mortgage", monthly: 724.31, importance: "required", matchSubcategories: ["Home Loan", "Mortgage"] },
  { label: "Power / Gas", monthly: 240, importance: "required", matchSubcategories: ["Power", "Gas"] },
  { label: "Water", monthly: 60, importance: "required", matchSubcategories: ["Water"] },
  { label: "Internet", monthly: 50, importance: "required", matchSubcategories: ["Internet"] },
  { label: "Cell", monthly: 138, importance: "required", matchSubcategories: ["Cell", "Telephone"] },
];

export function retirementIncomeMonthly(streams: RetirementIncomeStream[], scenario: "A" | "B" | "C"): number {
  return streams.reduce((sum, s) => {
    const include =
      scenario === "A"
        ? s.scenarioA
        : scenario === "B"
          ? s.scenarioA || s.scenarioB
          : s.scenarioA || s.scenarioC;
    return include ? sum + s.monthly : sum;
  }, 0);
}

export function requiredBillsMonthly(): number {
  return REQUIRED_BILL_LINES.reduce((sum, line) => sum + line.monthly, 0);
}

export function totalBaselineIncomeMonthly(): number {
  return RETIREMENT_INCOME_STREAMS.reduce((sum, s) => sum + s.monthly, 0);
}
