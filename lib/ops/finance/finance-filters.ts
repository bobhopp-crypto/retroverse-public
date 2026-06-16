import type { FinanceImportSource } from "@/lib/ops/finance/finance-model";
import { FINANCE_PERIODS, type FinancePeriod } from "@/lib/ops/finance/finance-model";

export type FinanceCategoryFilter =
  | "ai"
  | "retroverse"
  | "home"
  | "utilities"
  | "grocery"
  | "restaurants"
  | "personal"
  | "shopping"
  | "entertainment"
  | "income"
  | "uncategorized";

export type FinanceSourceFilter = FinanceImportSource;

export type FinanceFilters = {
  period: FinancePeriod | "custom";
  from: string | null;
  to: string | null;
  sources: FinanceSourceFilter[];
  categories: FinanceCategoryFilter[];
};

export const FINANCE_SOURCE_OPTIONS: { id: FinanceSourceFilter; label: string }[] = [
  { id: "apple_card", label: "Apple Card" },
  { id: "amazon", label: "Amazon" },
  { id: "nebat", label: "NEBAT" },
  { id: "paypal", label: "PayPal" },
];

export const FINANCE_CATEGORY_OPTIONS: { id: FinanceCategoryFilter; label: string }[] = [
  { id: "ai", label: "AI" },
  { id: "retroverse", label: "Retroverse" },
  { id: "home", label: "Home" },
  { id: "utilities", label: "Utilities" },
  { id: "grocery", label: "Grocery" },
  { id: "restaurants", label: "Restaurants" },
  { id: "personal", label: "Personal" },
  { id: "shopping", label: "Shopping" },
  { id: "entertainment", label: "Entertainment" },
  { id: "income", label: "Income" },
  { id: "uncategorized", label: "Uncategorized" },
];

export type FinanceFilterPreset = {
  id: string;
  label: string;
  apply: (current: FinanceFilters) => FinanceFilters;
};

const CURRENT_YEAR = String(new Date().getFullYear());
const LAST_YEAR = String(new Date().getFullYear() - 1);

export const FINANCE_FILTER_PRESETS: FinanceFilterPreset[] = [
  {
    id: "this_year",
    label: "This Year",
    apply: (f) => ({ ...f, period: CURRENT_YEAR as FinancePeriod, from: null, to: null, categories: [], sources: [] }),
  },
  {
    id: "last_year",
    label: "Last Year",
    apply: (f) => ({ ...f, period: LAST_YEAR as FinancePeriod, from: null, to: null, categories: [], sources: [] }),
  },
  {
    id: "ai_only",
    label: "AI Only",
    apply: (f) => ({ ...f, categories: ["ai"], sources: [] }),
  },
  {
    id: "retroverse_only",
    label: "Retroverse Only",
    apply: (f) => ({ ...f, categories: ["retroverse"], sources: [] }),
  },
  {
    id: "income_only",
    label: "Income Only",
    apply: (f) => ({ ...f, categories: ["income"], sources: [] }),
  },
  {
    id: "amazon_only",
    label: "Amazon Only",
    apply: (f) => ({ ...f, sources: ["amazon"], categories: [] }),
  },
  {
    id: "bills_only",
    label: "Bills Only",
    apply: (f) => ({ ...f, categories: ["utilities", "home"], sources: [] }),
  },
];

const VALID_PERIODS = new Set([...FINANCE_PERIODS.map((p) => p.id), "custom"]);
const VALID_SOURCES = new Set(FINANCE_SOURCE_OPTIONS.map((s) => s.id));
const VALID_CATEGORIES = new Set(FINANCE_CATEGORY_OPTIONS.map((c) => c.id));

/** Bookkeeping active from 2026 onward; earlier years are historical reference. */
export const FINANCE_ACTIVE_BOOKKEEPING_START = "2026-01-01";

export function activeBookkeepingYear(): FinancePeriod {
  const y = Math.max(2026, new Date().getFullYear());
  return String(y) as FinancePeriod;
}

export function activeBookkeepingFilters(): FinanceFilters {
  return {
    period: activeBookkeepingYear(),
    from: null,
    to: null,
    sources: [],
    categories: [],
  };
}

export function defaultFinanceFilters(): FinanceFilters {
  return activeBookkeepingFilters();
}

export function parseFinanceFilters(
  input: Record<string, string | string[] | undefined>,
): FinanceFilters {
  const defaultPeriod = activeBookkeepingYear();
  const periodRaw = String(input.period ?? defaultPeriod);
  const period = VALID_PERIODS.has(periodRaw as FinancePeriod | "custom")
    ? (periodRaw as FinancePeriod | "custom")
    : defaultPeriod;

  const from = typeof input.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.from) ? input.from : null;
  const to = typeof input.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.to) ? input.to : null;

  const sourcesRaw = typeof input.sources === "string" ? input.sources : "";
  const sources = sourcesRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is FinanceSourceFilter => VALID_SOURCES.has(s as FinanceSourceFilter));

  const categoriesRaw = typeof input.categories === "string" ? input.categories : "";
  const categories = categoriesRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is FinanceCategoryFilter => VALID_CATEGORIES.has(s as FinanceCategoryFilter));

  return {
    period: period === "custom" && from && to ? "custom" : period === "custom" ? defaultPeriod : period,
    from: period === "custom" ? from : null,
    to: period === "custom" ? to : null,
    sources,
    categories,
  };
}

export function filtersToSearchParams(filters: FinanceFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("period", filters.period);
  if (filters.period === "custom" && filters.from && filters.to) {
    params.set("from", filters.from);
    params.set("to", filters.to);
  }
  if (filters.sources.length) params.set("sources", filters.sources.join(","));
  if (filters.categories.length) params.set("categories", filters.categories.join(","));
  return params;
}

export function filtersDateRange(filters: FinanceFilters): {
  from: string | null;
  to: string | null;
  label: string;
} {
  const today = new Date().toISOString().slice(0, 10);

  if (filters.period === "custom" && filters.from && filters.to) {
    return { from: filters.from, to: filters.to, label: `${filters.from} → ${filters.to}` };
  }

  if (filters.period === "lifetime") {
    return { from: null, to: null, label: "Lifetime" };
  }

  if (filters.period.startsWith("last_")) {
    const days = filters.period === "last_30" ? 30 : filters.period === "last_90" ? 90 : 365;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const label = FINANCE_PERIODS.find((p) => p.id === filters.period)?.label ?? filters.period;
    return { from: fromDate.toISOString().slice(0, 10), to: today, label };
  }

  return {
    from: `${filters.period}-01-01`,
    to: `${filters.period}-12-31`,
    label: filters.period,
  };
}

export function formatActiveFiltersLabel(filters: FinanceFilters): string {
  const time = filtersDateRange(filters).label;
  const sources =
    filters.sources.length === 0
      ? "All Sources"
      : filters.sources
          .map((s) => FINANCE_SOURCE_OPTIONS.find((o) => o.id === s)?.label ?? s)
          .join(" + ");
  const categories =
    filters.categories.length === 0
      ? "All Categories"
      : filters.categories
          .map((c) => FINANCE_CATEGORY_OPTIONS.find((o) => o.id === c)?.label ?? c)
          .join(" + ");
  return `${time} • ${sources} • ${categories}`;
}

/** SQL fragment per category filter (references t, c). */
export function categoryFilterSql(cat: FinanceCategoryFilter): string {
  switch (cat) {
    case "ai":
      return "(a.name ILIKE 'AI -%' OR a.name ILIKE 'Software - ChatGPT%' OR COALESCE(t.subcategory, '') ILIKE 'AI -%')";
    case "retroverse":
      return "(a.name IN ('Inventory', 'Engraving', '3D Printing', 'Lighting Eq', 'Audio Eq', 'Video Eq') OR COALESCE(t.subcategory, '') ILIKE '%Inventory%')";
    case "home":
      return "(a.name = 'Home' OR COALESCE(t.subcategory, '') = 'Home')";
    case "utilities":
      return "(a.name IN ('Power and Light', 'Internet', 'Telephone', 'Water Utility', 'Gas', 'Helium', 'Utilities') OR COALESCE(t.subcategory, '') ILIKE ANY(ARRAY['%Power%', '%Internet%', '%Telephone%', '%Utility%', '%Gas%']))";
    case "grocery":
      return "(a.name = 'Grocery' OR COALESCE(t.subcategory, '') = 'Grocery')";
    case "restaurants":
      return "(a.name = 'Restaurants' OR COALESCE(t.subcategory, '') = 'Restaurants')";
    case "personal":
      return "(a.name = 'Personal' OR COALESCE(t.subcategory, '') = 'Personal')";
    case "shopping":
      return "(a.name IN ('Amazon', 'Shopping', 'Personal') OR COALESCE(t.subcategory, '') ILIKE '%Amazon%')";
    case "entertainment":
      return "(a.name ILIKE 'SUB -%' OR a.name ILIKE 'SUB _%' OR COALESCE(t.subcategory, '') ILIKE 'SUB -%' OR COALESCE(t.subcategory, '') ILIKE 'SUB _%')";
    case "income":
      return "(t.flow_kind = 'income' OR c.group_name = 'Income')";
    case "uncategorized":
      return "(t.account_id IS NULL)";
    default:
      return "TRUE";
  }
}

export function buildFilterSql(
  filters: FinanceFilters,
  opts?: { groupName?: string; sourceOnly?: FinanceSourceFilter; incomeMode?: boolean },
): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  const clauses: string[] = [];

  const incomeOnly =
    opts?.incomeMode ?? (filters.categories.length === 1 && filters.categories[0] === "income");
  if (incomeOnly) {
    clauses.push("t.flow_kind = 'income'");
  } else {
    clauses.push("t.flow_kind = 'expense'");
    clauses.push("t.amount > 0");
  }

  const range = filtersDateRange(filters);
  if (range.from) {
    params.push(range.from);
    clauses.push(`t.transaction_date >= $${params.length}`);
  }
  if (range.to) {
    params.push(range.to);
    clauses.push(`t.transaction_date <= $${params.length}`);
  }

  const sources = opts?.sourceOnly ? [opts.sourceOnly] : filters.sources;
  if (sources.length) {
    params.push(sources);
    clauses.push(`t.source = ANY($${params.length}::text[])`);
  }

  if (filters.categories.length && !opts?.groupName) {
    const catParts = filters.categories.map((c) => categoryFilterSql(c));
    clauses.push(`(${catParts.join(" OR ")})`);
  }

  if (opts?.groupName) {
    params.push(opts.groupName);
    clauses.push(`c.group_name = $${params.length}`);
  }

  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export function priorPeriodFilters(filters: FinanceFilters): FinanceFilters | null {
  const range = filtersDateRange(filters);
  if (!range.from || !range.to) return null;
  const from = new Date(`${range.from}T12:00:00`);
  const to = new Date(`${range.to}T12:00:00`);
  const spanMs = to.getTime() - from.getTime();
  const priorTo = new Date(from.getTime() - 86400000);
  const priorFrom = new Date(priorTo.getTime() - spanMs);
  return {
    ...filters,
    period: "custom",
    from: priorFrom.toISOString().slice(0, 10),
    to: priorTo.toISOString().slice(0, 10),
  };
}
