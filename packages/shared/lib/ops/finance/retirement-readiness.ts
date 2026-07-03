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

export function calculateRetirementReadiness(input: {
  currentIncomeMonthly: number;
  retirementIncomeMonthly: number;
  currentSpendingMonthly: number;
  requiredSpendingMonthly: number;
  importanceMonthly: { required?: number; useful?: number; optional?: number; luxury?: number };
  pendingReview: number;
}): RetirementReadiness {
  const required = input.importanceMonthly.required ?? input.requiredSpendingMonthly;
  const useful = input.importanceMonthly.useful ?? 0;
  const optional = input.importanceMonthly.optional ?? 0;
  const luxury = input.importanceMonthly.luxury ?? 0;

  const retirementExpenses =
    required + useful;
  const retirementSurplus = input.retirementIncomeMonthly - retirementExpenses;
  const downsizingSavings = optional + luxury;

  const explanation: string[] = [];
  let score = 0;

  if (input.retirementIncomeMonthly >= input.requiredSpendingMonthly) {
    score += 30;
    explanation.push("+30 Income covers required bills in retirement scenario A");
  } else {
    explanation.push("−30 Retirement income below required bills");
  }

  if (retirementSurplus >= 0) {
    score += 25;
    explanation.push("+25 Positive surplus keeping required + useful spend");
  } else {
    explanation.push(`−25 Retirement deficit ${Math.abs(retirementSurplus).toFixed(0)}/mo`);
  }

  const requiredRatio =
    input.currentSpendingMonthly > 0 ? required / input.currentSpendingMonthly : 1;
  if (requiredRatio <= 0.45) {
    score += 20;
    explanation.push("+20 Required spend under 45% of total");
  } else if (requiredRatio <= 0.6) {
    score += 10;
    explanation.push("+10 Required spend moderate");
  } else {
    explanation.push("−20 Required spend dominates budget");
  }

  const discRatio =
    input.currentSpendingMonthly > 0 ? (optional + luxury) / input.currentSpendingMonthly : 0;
  if (discRatio <= 0.2) {
    score += 15;
    explanation.push("+15 Low optional/luxury share");
  } else if (discRatio <= 0.35) {
    score += 8;
    explanation.push("+8 Moderate discretionary spend");
  } else {
    explanation.push("−15 High optional/luxury spend");
  }

  if (input.pendingReview < 50) {
    score += 10;
    explanation.push("+10 Review queue manageable");
  } else {
    explanation.push("−10 Large review queue — categorization incomplete");
  }

  score = Math.max(0, Math.min(100, score));

  let label = "Needs work";
  if (score >= 80) label = "Retirement ready";
  else if (score >= 60) label = "On track";
  else if (score >= 40) label = "Tight";

  return {
    score,
    label,
    currentIncomeMonthly: input.currentIncomeMonthly,
    retirementIncomeMonthly: input.retirementIncomeMonthly,
    currentSpendingMonthly: input.currentSpendingMonthly,
    requiredSpendingMonthly: required,
    retirementSurplusMonthly: retirementSurplus,
    importanceMonthly: { required, useful, optional, luxury },
    downsizingScenario: {
      monthlySavings: downsizingSavings,
      annualSavings: downsizingSavings * 12,
      description: "Keep Required + Useful · drop Optional + Luxury",
    },
    explanation,
  };
}
