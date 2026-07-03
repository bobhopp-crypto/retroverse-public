/** Client-safe spending category config — no DB or server imports. */

export type SpendingEditCategoryId =
  | "groceries"
  | "dining"
  | "gas"
  | "utilities"
  | "insurance"
  | "home"
  | "medical"
  | "shopping"
  | "amazon"
  | "ai"
  | "subscriptions"
  | "personal"
  | "retroverse"
  | "uncategorized";

export type SpendingEditCategoryOption = {
  id: SpendingEditCategoryId;
  label: string;
  defaultAccountName: string | null;
};

export const SPENDING_EDIT_CATEGORIES: SpendingEditCategoryOption[] = [
  { id: "groceries", label: "Groceries", defaultAccountName: "Grocery" },
  { id: "dining", label: "Dining", defaultAccountName: "Restaurants" },
  { id: "gas", label: "Gas", defaultAccountName: "Gas" },
  { id: "utilities", label: "Utilities", defaultAccountName: "Power and Light" },
  { id: "insurance", label: "Insurance", defaultAccountName: "Insurance" },
  { id: "home", label: "Home", defaultAccountName: "Home" },
  { id: "medical", label: "Medical", defaultAccountName: "Medical" },
  { id: "shopping", label: "Shopping", defaultAccountName: "Shopping" },
  { id: "amazon", label: "Amazon", defaultAccountName: "Amazon" },
  { id: "ai", label: "AI", defaultAccountName: "AI - ChatGPT" },
  { id: "subscriptions", label: "Subscriptions", defaultAccountName: "SUB - HBO Max" },
  { id: "personal", label: "Personal", defaultAccountName: "Personal" },
  { id: "retroverse", label: "Retroverse", defaultAccountName: "Inventory" },
  { id: "uncategorized", label: "Uncategorized", defaultAccountName: null },
];
