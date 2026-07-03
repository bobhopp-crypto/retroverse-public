import { inspectQuery } from "@/lib/inspect/pg";

import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { queryMonthlySpend, querySpendTotal } from "@/lib/ops/finance/db/transactions";
import type { FinanceFilters } from "@/lib/ops/finance/finance-filters";
import { buildFilterSql } from "@/lib/ops/finance/finance-filters";
import {
  inferSpendingEditCategory,
  SPENDING_EDIT_CATEGORIES,
  type SpendingEditCategoryId,
} from "@/lib/ops/finance/spending-category-edit";
import {
  PRIMARY_SPENDING_CATEGORIES,
  MORE_SPENDING_CATEGORIES,
  type SpendingHomeCategoryId,
} from "@/lib/ops/finance/spending-home-categories";

export type CategoryAuditRow = {
  merchant: string;
  count: number;
  totalSpend: number;
  currentCategory: string;
  sampleDescription: string;
};

export type CategoryAuditSection = {
  categoryId: SpendingHomeCategoryId;
  categoryLabel: string;
  ytdTotal: number;
  rows: CategoryAuditRow[];
};

export type CategoryAuditReport = {
  generatedAt: string;
  year: number;
  sections: CategoryAuditSection[];
};

export type MisclassificationFlag = {
  id: string;
  reason: string;
  transactionId: number;
  merchant: string;
  amount: number;
  transactionDate: string;
  currentCategory: string;
  suggestedCategory: SpendingEditCategoryId;
  suggestedLabel: string;
};

export type MisclassificationReport = {
  flags: MisclassificationFlag[];
};

const AUDIT_CATEGORY_IDS: SpendingHomeCategoryId[] = [
  ...PRIMARY_SPENDING_CATEGORIES.filter((c) => c.id !== "total").map((c) => c.id),
  ...MORE_SPENDING_CATEGORIES.filter((c) => ["ai", "medical", "shopping"].includes(c.id)).map(
    (c) => c.id,
  ),
];

function ytdFilters(categoryId: SpendingHomeCategoryId): FinanceFilters {
  const all = [...PRIMARY_SPENDING_CATEGORIES, ...MORE_SPENDING_CATEGORIES];
  const def = all.find((c) => c.id === categoryId)!;
  const year = String(new Date().getFullYear());
  return {
    period: year as FinanceFilters["period"],
    from: null,
    to: null,
    categories: def.filters,
    sources: def.sources ?? [],
  };
}

export async function loadCategoryAuditReport(): Promise<CategoryAuditReport> {
  await ensureFinanceSchema();
  const year = new Date().getFullYear();
  const sections: CategoryAuditSection[] = [];

  for (const catId of AUDIT_CATEGORY_IDS) {
    const def = [...PRIMARY_SPENDING_CATEGORIES, ...MORE_SPENDING_CATEGORIES].find(
      (c) => c.id === catId,
    )!;
    const filters = ytdFilters(catId);
    const { sql, params } = buildFilterSql(filters);

    const [ytdTotal, rows] = await Promise.all([
      querySpendTotal(filters),
      inspectQuery<{
        merchant: string;
        count: string;
        total: string;
        sample_description: string;
        account_name: string | null;
        source: string;
        account_id: string | null;
        subcategory: string | null;
        flow_kind: string;
        max_amount: string;
        max_id: string;
        max_date: string;
      }>(
        `SELECT COALESCE(NULLIF(TRIM(t.merchant), ''), 'Unknown') AS merchant,
                COUNT(*)::text AS count,
                SUM(ABS(t.amount))::text AS total,
                MAX(t.description) AS sample_description,
                MAX(a.name) AS account_name,
                MAX(t.source) AS source,
                MAX(t.account_id::text) AS account_id,
                MAX(t.subcategory) AS subcategory,
                MAX(t.flow_kind) AS flow_kind,
                MAX(t.amount)::text AS max_amount,
                MAX(t.id)::text AS max_id,
                MAX(t.transaction_date::text) AS max_date
         FROM finance_transactions t
         LEFT JOIN finance_accounts a ON a.id = t.account_id
         LEFT JOIN finance_categories c ON c.id = t.category_id
         ${sql}
         GROUP BY 1
         ORDER BY SUM(ABS(t.amount)) DESC
         LIMIT 15`,
        params,
      ),
    ]);

    sections.push({
      categoryId: catId,
      categoryLabel: def.label,
      ytdTotal,
      rows: rows.map((r) => {
        const txn = {
          id: Number(r.max_id),
          merchant: r.merchant,
          accountName: r.account_name,
          subcategory: r.subcategory,
          source: r.source,
          accountId: r.account_id ? Number(r.account_id) : null,
          flowKind: r.flow_kind,
        } as Parameters<typeof inferSpendingEditCategory>[0];
        const editId = inferSpendingEditCategory(txn);
        const editLabel =
          SPENDING_EDIT_CATEGORIES.find((c) => c.id === editId)?.label ?? "Uncategorized";
        return {
          merchant: r.merchant,
          count: Number(r.count),
          totalSpend: Number(r.total),
          currentCategory: editLabel,
          sampleDescription: r.sample_description,
        };
      }),
    });
  }

  return { generatedAt: new Date().toISOString(), year, sections };
}

export async function loadMisclassificationFlags(): Promise<MisclassificationReport> {
  await ensureFinanceSchema();
  const year = String(new Date().getFullYear());
  const flags: MisclassificationFlag[] = [];

  const utilitiesMonths = await queryMonthlySpend({
    period: year as FinanceFilters["period"],
    from: null,
    to: null,
    categories: ["utilities"],
    sources: [],
  });
  for (const m of utilitiesMonths) {
    if (m.amount > 500) {
      flags.push({
        id: `utilities-high-${m.month}`,
        reason: `Utilities spending ${m.month} is ${m.amount.toFixed(0)} (over $500)`,
        transactionId: 0,
        merchant: "—",
        amount: m.amount,
        transactionDate: m.month,
        currentCategory: "Utilities",
        suggestedCategory: "utilities",
        suggestedLabel: "Review utilities",
      });
    }
  }

  const suspicious = await inspectQuery<{
    id: string;
    merchant: string;
    description: string;
    amount: string;
    transaction_date: string;
    account_name: string | null;
    subcategory: string | null;
    source: string;
    account_id: string | null;
    flow_kind: string;
  }>(
    `SELECT t.id::text, t.merchant, t.description, t.amount::text, t.transaction_date::text,
            a.name AS account_name, t.subcategory, t.source, t.account_id::text, t.flow_kind
     FROM finance_transactions t
     LEFT JOIN finance_accounts a ON a.id = t.account_id
     WHERE t.archived_at IS NULL AND t.flow_kind = 'expense' AND t.amount > 0
       AND t.transaction_date >= $1
       AND (
         (a.name ILIKE '%Insurance%' AND (lower(t.merchant) LIKE '%home depot%' OR lower(t.merchant) LIKE '%menards%'))
         OR (a.name = 'Gas' AND (lower(t.merchant) LIKE '%amazon%' OR t.source = 'amazon'))
         OR (a.name IN ('Power and Light', 'Internet', 'Telephone') AND lower(t.merchant) LIKE '%amazon%')
       )
     ORDER BY t.amount DESC
     LIMIT 40`,
    [`${year}-01-01`],
  );

  for (const r of suspicious) {
    const txn = {
      id: Number(r.id),
      merchant: r.merchant,
      accountName: r.account_name,
      subcategory: r.subcategory,
      source: r.source,
      accountId: r.account_id ? Number(r.account_id) : null,
      flowKind: r.flow_kind,
    } as Parameters<typeof inferSpendingEditCategory>[0];
    const current = inferSpendingEditCategory(txn);
    const currentLabel = SPENDING_EDIT_CATEGORIES.find((c) => c.id === current)?.label ?? "?";

    let suggested: SpendingEditCategoryId = "shopping";
    let reason = "Merchant may not match category";
    const m = r.merchant.toLowerCase();
    if (m.includes("amazon") || r.source === "amazon") {
      suggested = "amazon";
      reason = "Amazon purchase not filed under Amazon";
    } else if (m.includes("home depot") || m.includes("menards")) {
      suggested = "home";
      reason = "Home improvement store filed as Insurance";
    }

    flags.push({
      id: `txn-${r.id}`,
      reason,
      transactionId: Number(r.id),
      merchant: r.merchant,
      amount: Number(r.amount),
      transactionDate: r.transaction_date.slice(0, 10),
      currentCategory: currentLabel,
      suggestedCategory: suggested,
      suggestedLabel: SPENDING_EDIT_CATEGORIES.find((c) => c.id === suggested)?.label ?? suggested,
    });
  }

  return { flags };
}
