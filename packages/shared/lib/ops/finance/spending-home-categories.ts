import type { FinanceCategoryFilter } from "@/lib/ops/finance/finance-filters";

export type SpendingHomeCategoryId =
  | "total"
  | "groceries"
  | "dining"
  | "gas"
  | "utilities"
  | "insurance"
  | "home"
  | "subscriptions"
  | "ai"
  | "retroverse"
  | "personal"
  | "shopping"
  | "medical"
  | "amazon";

export type SpendingHomeCategoryDef = {
  id: SpendingHomeCategoryId;
  label: string;
  tier: "primary" | "more";
  filters: FinanceCategoryFilter[];
  sources?: ("amazon")[];
};

export const SPENDING_HOME_CATEGORIES: SpendingHomeCategoryDef[] = [
  { id: "total", label: "Total", tier: "primary", filters: [] },
  { id: "groceries", label: "Groceries", tier: "primary", filters: ["grocery"] },
  { id: "dining", label: "Dining", tier: "primary", filters: ["restaurants"] },
  { id: "gas", label: "Gas", tier: "primary", filters: ["gas"] },
  { id: "utilities", label: "Utilities", tier: "primary", filters: ["utilities"] },
  { id: "insurance", label: "Insurance", tier: "primary", filters: ["insurance"] },
  { id: "home", label: "Home", tier: "primary", filters: ["home"] },
  { id: "subscriptions", label: "Subscriptions", tier: "primary", filters: ["subscriptions"] },
  { id: "ai", label: "AI", tier: "more", filters: ["ai"] },
  { id: "retroverse", label: "Retroverse", tier: "more", filters: ["retroverse"] },
  { id: "personal", label: "Personal", tier: "more", filters: ["personal"] },
  { id: "shopping", label: "Shopping", tier: "more", filters: ["shopping"] },
  { id: "medical", label: "Medical", tier: "more", filters: ["medical"] },
  { id: "amazon", label: "Amazon", tier: "more", filters: [], sources: ["amazon"] },
];

export const PRIMARY_SPENDING_CATEGORIES = SPENDING_HOME_CATEGORIES.filter((c) => c.tier === "primary");
export const MORE_SPENDING_CATEGORIES = SPENDING_HOME_CATEGORIES.filter((c) => c.tier === "more");

export function spendingCategoryById(id: SpendingHomeCategoryId): SpendingHomeCategoryDef {
  return SPENDING_HOME_CATEGORIES.find((c) => c.id === id) ?? SPENDING_HOME_CATEGORIES[0]!;
}

export function isSpendingHomeCategoryId(id: string): id is SpendingHomeCategoryId {
  return SPENDING_HOME_CATEGORIES.some((c) => c.id === id);
}
