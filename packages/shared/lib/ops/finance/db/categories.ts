import { inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";

export type FinanceCategoryRow = {
  id: number;
  slug: string;
  label: string;
  group_name: string;
  parent_slug: string | null;
};

export type FinanceCategory = {
  id: number;
  slug: string;
  label: string;
  groupName: string;
  parentSlug: string | null;
};

function mapCategory(row: FinanceCategoryRow): FinanceCategory {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    groupName: row.group_name,
    parentSlug: row.parent_slug,
  };
}

export async function listFinanceCategories(): Promise<FinanceCategory[]> {
  try {
    const rows = await inspectQuery<FinanceCategoryRow>(
      `SELECT id, slug, label, group_name, parent_slug
       FROM finance_categories
       ORDER BY group_name, label`,
    );
    return rows.map(mapCategory);
  } catch (err) {
    financeDbError(err);
  }
}

export async function getCategoryBySlug(slug: string): Promise<FinanceCategory | null> {
  try {
    const rows = await inspectQuery<FinanceCategoryRow>(
      `SELECT id, slug, label, group_name, parent_slug
       FROM finance_categories WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    return rows[0] ? mapCategory(rows[0]) : null;
  } catch (err) {
    financeDbError(err);
  }
}

export async function getCategoryMap(): Promise<Map<string, FinanceCategory>> {
  const cats = await listFinanceCategories();
  return new Map(cats.map((c) => [c.slug, c]));
}
