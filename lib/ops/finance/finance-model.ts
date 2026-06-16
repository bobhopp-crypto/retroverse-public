export type FinancePeriod =
  | "lifetime"
  | "2026"
  | "2025"
  | "2024"
  | "2023"
  | "2022"
  | "2021"
  | "last_30"
  | "last_90"
  | "last_12m";

export const FINANCE_PERIODS: { id: FinancePeriod; label: string }[] = [
  { id: "lifetime", label: "Lifetime" },
  { id: "2026", label: "2026" },
  { id: "2025", label: "2025" },
  { id: "2024", label: "2024" },
  { id: "2023", label: "2023" },
  { id: "2022", label: "2022" },
  { id: "2021", label: "2021" },
  { id: "last_30", label: "Last 30 Days" },
  { id: "last_90", label: "Last 90 Days" },
  { id: "last_12m", label: "Last 12 Months" },
];

export type FinanceImportSource =
  | "apple_card"
  | "amazon"
  | "paypal"
  | "nebat"
  | "unknown";

export type FinanceReviewStatus = "pending" | "approved";

export type FinanceFlowKind = "expense" | "income" | "transfer";

export type ParsedFinanceRow = {
  transactionDate: string;
  merchant: string;
  description: string;
  amount: number;
  source: FinanceImportSource;
  dedupeKey: string;
  flowKind?: FinanceFlowKind;
  /** Workbook Chart of Accounts name (APPLE column E). */
  accountName?: string;
  /** @deprecated Use accountName */
  categorySlug?: string;
  subcategory?: string;
};

export function periodToDateRange(period: FinancePeriod): { from: string | null; to: string | null; label: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);

  if (period === "lifetime") {
    return { from: null, to: null, label: "Lifetime" };
  }
  if (period.startsWith("last_")) {
    const days = period === "last_30" ? 30 : period === "last_90" ? 90 : 365;
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - days);
    const label = FINANCE_PERIODS.find((p) => p.id === period)?.label ?? period;
    return { from: fromDate.toISOString().slice(0, 10), to, label };
  }
  return { from: `${period}-01-01`, to: `${period}-12-31`, label: period };
}

export function normalizeMerchant(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function buildDedupeKey(parts: {
  source: string;
  transactionDate: string;
  amount: number;
  merchant: string;
  description: string;
}): string {
  const raw = [
    parts.source,
    parts.transactionDate,
    parts.amount.toFixed(2),
    normalizeMerchant(parts.merchant),
    parts.description.slice(0, 80),
  ].join("|");
  return raw;
}
