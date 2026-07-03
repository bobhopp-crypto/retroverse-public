import { inspectExecute } from "@/lib/inspect/pg";

import { getFinanceAccountByName } from "@/lib/ops/finance/db/accounts";
import { categorizeTransactions, type FinanceTransaction } from "@/lib/ops/finance/db/transactions";
import {
  SPENDING_EDIT_CATEGORIES,
  type SpendingEditCategoryId,
} from "@/lib/ops/finance/spending-category-config";

export type { SpendingEditCategoryId, SpendingEditCategoryOption } from "@/lib/ops/finance/spending-category-config";
export { SPENDING_EDIT_CATEGORIES } from "@/lib/ops/finance/spending-category-config";

const ACCOUNT_NAME_HINTS: Array<{ id: SpendingEditCategoryId; test: (name: string) => boolean }> = [
  { id: "groceries", test: (n) => n === "Grocery" },
  { id: "dining", test: (n) => n === "Restaurants" },
  { id: "gas", test: (n) => n === "Gas" },
  {
    id: "utilities",
    test: (n) =>
      ["Power and Light", "Internet", "Telephone", "Water Utility", "Helium", "Utilities"].includes(n) ||
      /power|internet|telephone|utility|water/i.test(n),
  },
  { id: "insurance", test: (n) => /insurance/i.test(n) },
  { id: "home", test: (n) => n === "Home" },
  { id: "medical", test: (n) => n === "Medical" || n === "SSM Health" },
  { id: "shopping", test: (n) => n === "Shopping" },
  { id: "amazon", test: (n) => n === "Amazon" },
  { id: "ai", test: (n) => n.startsWith("AI -") || n.startsWith("Software - ChatGPT") },
  { id: "subscriptions", test: (n) => n.startsWith("SUB -") || n.startsWith("SUB _") },
  { id: "personal", test: (n) => n === "Personal" },
  {
    id: "retroverse",
    test: (n) =>
      ["Inventory", "Engraving", "3D Printing", "Lighting Eq", "Audio Eq", "Video Eq"].includes(n),
  },
];

export function inferSpendingEditCategory(txn: FinanceTransaction): SpendingEditCategoryId {
  if (!txn.accountId) {
    return txn.source === "amazon" ? "amazon" : "uncategorized";
  }
  const name = txn.accountName ?? txn.subcategory ?? "";
  for (const hint of ACCOUNT_NAME_HINTS) {
    if (hint.test(name)) return hint.id;
  }
  return "personal";
}

export async function resolveAccountIdForSpendingCategory(
  categoryId: SpendingEditCategoryId,
): Promise<number | null> {
  const opt = SPENDING_EDIT_CATEGORIES.find((c) => c.id === categoryId);
  if (!opt?.defaultAccountName) return null;
  const acct = await getFinanceAccountByName(opt.defaultAccountName);
  return acct?.id ?? null;
}

export async function assignSpendingCategoryToTransaction(
  transactionId: number,
  categoryId: SpendingEditCategoryId,
): Promise<void> {
  if (categoryId === "uncategorized") {
    await inspectExecute(
      `UPDATE finance_transactions
       SET account_id = NULL, subcategory = NULL, review_status = 'pending', updated_at = now()
       WHERE id = $1`,
      [transactionId],
    );
    return;
  }
  const accountId = await resolveAccountIdForSpendingCategory(categoryId);
  if (!accountId) {
    throw new Error(`No bookkeeping account mapped for category: ${categoryId}`);
  }
  await categorizeTransactions({
    transactionIds: [transactionId],
    accountId,
    learnRule: false,
  });
}
