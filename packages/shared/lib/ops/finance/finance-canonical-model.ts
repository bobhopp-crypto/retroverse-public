import type { FinanceFlowKind, FinanceImportSource } from "@/lib/ops/finance/finance-model";
import type { FinanceImportance } from "@/lib/ops/finance/finance-importance";

/** Canonical finance transaction (maps to finance_transactions). */
export type FinanceCanonicalTransaction = {
  transactionId: number;
  source: FinanceImportSource;
  transactionDate: string;
  merchant: string;
  description: string;
  amount: number;
  flowKind: FinanceFlowKind;
  category: string | null;
  categorySlug: string | null;
  importance: FinanceImportance | null;
  reviewStatus: "pending" | "approved";
  createdAt: string;
  updatedAt: string;
};

export type FinanceImportStats = {
  lastImportDate: string | null;
  totalImports: number;
  transactionsAdded: number;
  transactionsUpdated: number;
  transactionsAwaitingReview: number;
};

export type FinanceImportHistoryRow = {
  id: number;
  label: string;
  statusLabel: string;
  detail: string;
  difference: number | null;
  createdAt: string;
  fileName: string;
  source: string;
  status: string;
  transactionsInserted: number;
  transactionsSkipped: number;
  transactionsUpdated: number;
  transactionsPending: number;
};

export type FinanceAmazonImportReport = {
  ordersImported: number;
  itemsImported: number;
  duplicatesSkipped: number;
  spendByCategory: { category: string; amount: number }[];
  totalSpend: number;
};
