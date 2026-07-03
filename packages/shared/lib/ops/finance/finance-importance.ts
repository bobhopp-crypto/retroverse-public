export type FinanceImportance = "required" | "useful" | "optional" | "luxury";

export const FINANCE_IMPORTANCE_LEVELS: {
  id: FinanceImportance;
  label: string;
  description: string;
  downsizingScore: number;
}[] = [
  {
    id: "required",
    label: "Required",
    description: "Non-negotiable for housing, health, and survival.",
    downsizingScore: 0,
  },
  {
    id: "useful",
    label: "Useful",
    description: "Productive spend — tools, groceries, core subscriptions.",
    downsizingScore: 25,
  },
  {
    id: "optional",
    label: "Optional",
    description: "Comfort spend — dining, hobbies, extra streaming.",
    downsizingScore: 65,
  },
  {
    id: "luxury",
    label: "Luxury",
    description: "Discretionary — impulse buys, gear splurges.",
    downsizingScore: 90,
  },
];

/** Category slug → default importance (rules inherit on categorize). */
export const CATEGORY_DEFAULT_IMPORTANCE: Record<string, FinanceImportance> = {
  home: "required",
  utilities: "required",
  medical: "required",
  mortgage: "required",
  income: "required",
  "income-social-security": "required",
  "income-ssm-health": "required",
  "income-funeral-home": "required",
  "income-dj": "required",
  ai: "useful",
  "ai-chatgpt": "useful",
  "ai-cursor": "useful",
  "ai-claude": "useful",
  "ai-gemini": "useful",
  "ai-grok": "useful",
  "ai-creative-fabrica": "useful",
  "ai-kittl": "useful",
  "ai-abacus": "useful",
  "ai-genspark": "useful",
  grocery: "useful",
  retroverse: "useful",
  business: "useful",
  restaurants: "optional",
  personal: "optional",
  entertainment: "optional",
  "retro-hosting": "optional",
  "retro-domains": "optional",
  "retro-software": "optional",
  "retro-ai-art": "optional",
  "retro-3d-printing": "optional",
  "retro-printing": "optional",
  amazon: "luxury",
  shopping: "luxury",
  gift: "luxury",
  "retro-equipment": "luxury",
  other: "optional",
};

export function defaultImportanceForCategory(slug: string): FinanceImportance {
  return CATEGORY_DEFAULT_IMPORTANCE[slug] ?? "optional";
}

export function downsizingPotentialMonthly(
  byImportance: Partial<Record<FinanceImportance, number>>,
): { optional: number; luxury: number; total: number } {
  const optional = (byImportance.optional ?? 0) * 0.5;
  const luxury = (byImportance.luxury ?? 0) * 0.75;
  return { optional, luxury, total: optional + luxury };
}
