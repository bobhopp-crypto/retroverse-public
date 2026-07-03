/**
 * Finance import architecture (Phase 2 — design only, no OCR).
 *
 * Pipeline:
 *   Drop file → Import Queue → Parser → Transaction Store → Review Queue → Rules Engine
 */

export type FinanceImportQueueStatus =
  | "queued"
  | "parsing"
  | "parsed"
  | "failed"
  | "stored";

export type FinanceImportFileKind = "csv" | "pdf" | "xlsx" | "image" | "unknown";

export type FinanceImportQueueItem = {
  id: string;
  fileName: string;
  source: "apple_card" | "amazon" | "nebat" | "paypal" | "unknown";
  fileKind: FinanceImportFileKind;
  status: FinanceImportQueueStatus;
  storagePath: string;
  transactionCount: number;
  reviewCount: number;
  errorMessage?: string;
  createdAt: string;
};

/** Maps to finance_imports + finance_transactions tables. */
export type FinanceTransactionStore = {
  transactions: "finance_transactions";
  imports: "finance_imports";
  categories: "finance_categories";
  rules: "finance_rules";
};

export type FinanceReviewQueueItem = {
  transactionId: number;
  merchant: string;
  description: string;
  amount: number;
  transactionDate: string;
  source: string;
  suggestedCategories: string[];
};

export type FinanceCategorizationRule = {
  id: number;
  merchantPattern: string;
  descriptionPattern: string;
  categorySlug: string;
  subcategory?: string;
  importance?: string;
  confidence: number;
  hitCount: number;
};

export const FINANCE_IMPORT_SOURCES = [
  { id: "apple_card", label: "Apple Card", formats: ["CSV"], parser: "parseAppleCardCsv", ocr: false },
  { id: "amazon", label: "Amazon", formats: ["CSV"], parser: "parseAmazonCsv", ocr: false },
  { id: "nebat", label: "NEBAT", formats: ["CSV", "PDF"], parser: "parseNebatCsv", ocr: "future" },
  { id: "paypal", label: "PayPal", formats: ["CSV"], parser: "parsePayPalCsv", ocr: false },
] as const;

export const FINANCE_IMPORT_PIPELINE_STEPS = [
  "1. User drops statement at /ops/finance/import",
  "2. File stored under data/finance-imports/ (gitignored)",
  "3. finance_imports row created (status: queued)",
  "4. Parser detects source + extracts rows (CSV today; PDF OCR later)",
  "5. Rule engine auto-categorizes known merchants",
  "6. Unknown rows → review_status=review, category_id=NULL",
  "7. User categorizes at /ops/finance/review → rule upserted",
  "8. Dashboard aggregates from finance_transactions",
] as const;
