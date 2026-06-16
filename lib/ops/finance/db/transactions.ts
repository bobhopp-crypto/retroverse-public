import { inspectExecute, inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";
import type { FinanceFilters } from "@/lib/ops/finance/finance-filters";
import { buildFilterSql, priorPeriodFilters } from "@/lib/ops/finance/finance-filters";
import type { FinanceImportSource, FinanceReviewStatus, ParsedFinanceRow } from "@/lib/ops/finance/finance-model";
import { defaultImportanceForCategory } from "@/lib/ops/finance/finance-importance";
import { getFinanceAccountByName, getFinanceAccountBySlug } from "@/lib/ops/finance/db/accounts";
import { incrementRuleHit, matchRule, type FinanceRule } from "@/lib/ops/finance/db/rules";

export type FinanceTransactionRow = {
  id: number | string;
  source: string;
  transaction_date: Date | string;
  merchant: string;
  description: string;
  amount: string | number;
  category_id: number | null;
  account_id: number | null;
  subcategory: string | null;
  review_status: string;
  raw_import_id: number | null;
  created_at: Date | string;
  category_slug?: string | null;
  category_label?: string | null;
  account_slug?: string | null;
  account_name?: string | null;
  group_name?: string | null;
  importance?: string | null;
  flow_kind?: string | null;
  tax_treatment?: string | null;
  notes?: string | null;
  rule_pattern?: string | null;
};

export type FinanceTransaction = {
  id: number;
  source: string;
  transactionDate: string;
  merchant: string;
  description: string;
  amount: number;
  categoryId: number | null;
  accountId: number | null;
  categorySlug: string | null;
  categoryLabel: string | null;
  accountName: string | null;
  groupName: string | null;
  importance: string | null;
  subcategory: string | null;
  reviewStatus: FinanceReviewStatus;
  rawImportId: number | null;
  createdAt: string;
  flowKind: string;
  taxTreatment: string | null;
  notes: string | null;
  rulePattern: string | null;
};

function mapTxn(row: FinanceTransactionRow): FinanceTransaction {
  const date =
    row.transaction_date instanceof Date
      ? row.transaction_date.toISOString().slice(0, 10)
      : String(row.transaction_date).slice(0, 10);
  const accountName = row.account_name ?? null;
  return {
    id: Number(row.id),
    source: row.source,
    transactionDate: date,
    merchant: row.merchant,
    description: row.description,
    amount: Number(row.amount),
    categoryId: row.category_id ? Number(row.category_id) : null,
    accountId: row.account_id ? Number(row.account_id) : null,
    categorySlug: row.account_slug ?? row.category_slug ?? null,
    categoryLabel: accountName ?? row.category_label ?? null,
    accountName,
    groupName: row.group_name ?? accountGroupName(accountName ?? row.category_label ?? ""),
    importance: row.importance ?? null,
    subcategory: row.subcategory,
    reviewStatus: row.review_status as FinanceReviewStatus,
    rawImportId: row.raw_import_id ? Number(row.raw_import_id) : null,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
    flowKind: row.flow_kind ?? "expense",
    taxTreatment: row.tax_treatment ?? null,
    notes: row.notes ?? null,
    rulePattern: row.rule_pattern ?? null,
  };
}

function accountGroupName(name: string): string {
  if (!name) return "Uncategorized";
  const split = name.split(/\s*[-_]\s*/);
  return split[0]?.trim() || name;
}

const TXN_SELECT = `
  t.id, t.source, t.transaction_date, t.merchant, t.description, t.amount,
  t.category_id, t.account_id, t.subcategory, t.review_status, t.raw_import_id, t.created_at,
  t.importance,
  t.flow_kind, t.tax_treatment, t.notes,
  r.merchant_pattern AS rule_pattern,
  a.slug AS account_slug, a.name AS account_name,
  c.slug AS category_slug, c.label AS category_label,
  COALESCE(
    NULLIF(split_part(a.name, ' - ', 1), ''),
    NULLIF(split_part(a.name, ' _ ', 1), ''),
    NULLIF(c.group_name, ''),
    'General'
  ) AS group_name
`;

const TXN_FROM = `
  FROM finance_transactions t
  LEFT JOIN finance_accounts a ON a.id = t.account_id
  LEFT JOIN finance_categories c ON c.id = t.category_id
  LEFT JOIN finance_rules r ON r.id = t.rule_id
`;

export async function querySpendTotal(filters: FinanceFilters): Promise<number> {
  const { sql, params } = buildFilterSql(filters);
  try {
    const rows = await inspectQuery<{ total: string }>(
      `SELECT COALESCE(SUM(ABS(t.amount)), 0)::text AS total ${TXN_FROM} ${sql}`,
      params,
    );
    return Number(rows[0]?.total ?? 0);
  } catch (err) {
    financeDbError(err);
  }
}

export async function querySpendByCategory(
  filters: FinanceFilters,
): Promise<{ slug: string; label: string; groupName: string; amount: number }[]> {
  const { sql, params } = buildFilterSql(filters);
  try {
    const rows = await inspectQuery<{
      slug: string;
      label: string;
      group_name: string;
      amount: string;
    }>(
      `SELECT COALESCE(a.slug, 'uncategorized') AS slug,
              COALESCE(a.name, 'Uncategorized') AS label,
              COALESCE(
                NULLIF(split_part(a.name, ' - ', 1), ''),
                NULLIF(split_part(a.name, ' _ ', 1), ''),
                'General'
              ) AS group_name,
              SUM(ABS(t.amount))::text AS amount
       ${TXN_FROM}
       ${sql}
       GROUP BY a.slug, a.name
       ORDER BY SUM(ABS(t.amount)) DESC`,
      params,
    );
    return rows.map((r) => ({
      slug: r.slug,
      label: r.label,
      groupName: r.group_name,
      amount: Number(r.amount),
    }));
  } catch (err) {
    financeDbError(err);
  }
}

export async function queryMonthlySpend(
  filters: FinanceFilters,
  groupName?: string,
): Promise<{ month: string; amount: number }[]> {
  const { sql, params } = buildFilterSql(filters, { groupName });
  try {
    const rows = await inspectQuery<{ month: string; amount: string }>(
      `SELECT to_char(date_trunc('month', t.transaction_date), 'Mon YY') AS month,
              SUM(ABS(t.amount))::text AS amount
       ${TXN_FROM}
       ${sql}
       GROUP BY date_trunc('month', t.transaction_date)
       ORDER BY date_trunc('month', t.transaction_date)`,
      params,
    );
    return rows.map((r) => ({ month: r.month, amount: Number(r.amount) }));
  } catch (err) {
    financeDbError(err);
  }
}

export async function querySpendBySource(
  filters: FinanceFilters,
): Promise<{ source: string; amount: number }[]> {
  const { sql, params } = buildFilterSql(filters);
  try {
    const rows = await inspectQuery<{ source: string; amount: string }>(
      `SELECT t.source, SUM(ABS(t.amount))::text AS amount
       ${TXN_FROM}
       ${sql}
       GROUP BY t.source
       ORDER BY SUM(ABS(t.amount)) DESC`,
      params,
    );
    return rows.map((r) => ({ source: r.source, amount: Number(r.amount) }));
  } catch (err) {
    financeDbError(err);
  }
}

export async function queryGroupSpend(
  filters: FinanceFilters,
  groupName: string,
): Promise<number> {
  const { sql, params } = buildFilterSql(filters, { groupName });
  try {
    const rows = await inspectQuery<{ total: string }>(
      `SELECT COALESCE(SUM(ABS(t.amount)), 0)::text AS total ${TXN_FROM} ${sql}`,
      params,
    );
    return Number(rows[0]?.total ?? 0);
  } catch (err) {
    financeDbError(err);
  }
}

export async function querySourceSpend(
  filters: FinanceFilters,
  source: FinanceImportSource,
): Promise<number> {
  if (filters.sources.length > 0 && !filters.sources.includes(source)) {
    return 0;
  }
  const { sql, params } = buildFilterSql(filters);
  try {
    const rows = await inspectQuery<{ total: string }>(
      `SELECT COALESCE(SUM(ABS(t.amount)), 0)::text AS total ${TXN_FROM} ${sql} AND t.source = $${params.length + 1}`,
      [...params, source],
    );
    return Number(rows[0]?.total ?? 0);
  } catch (err) {
    financeDbError(err);
  }
}

export async function queryIncomeTotal(filters: FinanceFilters): Promise<number> {
  if (filters.categories.length > 0 && !filters.categories.includes("income")) {
    return 0;
  }
  const incomeFilters: FinanceFilters = { ...filters, categories: ["income"] };
  const { sql, params } = buildFilterSql(incomeFilters, { incomeMode: true });
  try {
    const rows = await inspectQuery<{ total: string }>(
      `SELECT COALESCE(SUM(ABS(t.amount)), 0)::text AS total ${TXN_FROM} ${sql}`,
      params,
    );
    return Number(rows[0]?.total ?? 0);
  } catch (err) {
    financeDbError(err);
  }
}

export async function queryMonthlyIncome(
  filters: FinanceFilters,
): Promise<{ month: string; amount: number }[]> {
  if (filters.categories.length > 0 && !filters.categories.includes("income")) {
    return [];
  }
  const incomeFilters: FinanceFilters = { ...filters, categories: ["income"] };
  const { sql, params } = buildFilterSql(incomeFilters, { incomeMode: true });
  try {
    const rows = await inspectQuery<{ month: string; amount: string }>(
      `SELECT to_char(date_trunc('month', t.transaction_date), 'Mon YY') AS month,
              SUM(ABS(t.amount))::text AS amount
       ${TXN_FROM}
       ${sql}
       GROUP BY date_trunc('month', t.transaction_date)
       ORDER BY date_trunc('month', t.transaction_date)`,
      params,
    );
    return rows.map((r) => ({ month: r.month, amount: Number(r.amount) }));
  } catch (err) {
    financeDbError(err);
  }
}

export async function queryMonthlyCashFlow(
  filters: FinanceFilters,
): Promise<{ month: string; in: number; out: number; net: number }[]> {
  const [outRows, inRows] = await Promise.all([
    queryMonthlySpend(filters),
    queryMonthlyIncome(filters),
  ]);
  const inMap = new Map(inRows.map((r) => [r.month, r.amount]));
  const months = new Set([...outRows.map((r) => r.month), ...inRows.map((r) => r.month)]);
  return [...months].map((month) => {
    const out = outRows.find((r) => r.month === month)?.amount ?? 0;
    const inc = inMap.get(month) ?? 0;
    return { month, in: inc, out, net: inc - out };
  });
}

export async function querySubscriptions(
  filters: FinanceFilters,
): Promise<
  { vendor: string; monthly: number; annual: number; lastCharge: string; count: number }[]
> {
  const subFilters: FinanceFilters = {
    ...filters,
    categories: filters.categories.length ? filters.categories : [],
  };
  const { sql, params } = buildFilterSql(subFilters);
  const subClause = `AND (COALESCE(t.subcategory, '') ILIKE 'SUB -%' OR COALESCE(t.subcategory, '') ILIKE 'SUB _%' OR COALESCE(t.subcategory, '') ILIKE 'AI -%' OR c.group_name = 'AI')`;

  try {
    const rows = await inspectQuery<{
      merchant: string;
      total: string;
      months: string;
      last_charge: string;
    }>(
      `SELECT t.merchant,
              SUM(ABS(t.amount))::text AS total,
              COUNT(DISTINCT date_trunc('month', t.transaction_date))::text AS months,
              MAX(t.transaction_date)::text AS last_charge
       ${TXN_FROM}
       ${sql} ${subClause}
       GROUP BY t.merchant
       HAVING COUNT(*) >= 1
       ORDER BY SUM(ABS(t.amount)) DESC
       LIMIT 40`,
      params,
    );
    return rows.map((r) => {
      const total = Number(r.total);
      const months = Math.max(Number(r.months), 1);
      const monthly = total / months;
      return {
        vendor: r.merchant,
        monthly,
        annual: monthly * 12,
        lastCharge: r.last_charge?.slice(0, 10) ?? "",
        count: months,
      };
    });
  } catch (err) {
    financeDbError(err);
  }
}

export async function queryFastestGrowing(
  filters: FinanceFilters,
): Promise<{ category: string; amount: number; priorAmount: number; changePct: number }[]> {
  const prior = priorPeriodFilters(filters);
  if (!prior) return [];

  const [current, previous] = await Promise.all([
    querySpendByCategory(filters),
    querySpendByCategory(prior),
  ]);

  const priorMap = new Map(previous.map((c) => [c.slug, c.amount]));
  const rows = current
    .map((c) => {
      const prev = priorMap.get(c.slug) ?? 0;
      const changePct = prev > 0 ? ((c.amount - prev) / prev) * 100 : c.amount > 0 ? 100 : 0;
      return { category: c.label, amount: c.amount, priorAmount: prev, changePct };
    })
    .filter((r) => r.amount >= 50)
    .sort((a, b) => b.changePct - a.changePct);
  return rows.slice(0, 5);
}

export async function countReviewQueue(filters: FinanceFilters): Promise<number> {
  if (filters.categories.length > 0 && !filters.categories.includes("uncategorized")) {
    return 0;
  }
  const { sql, params } = buildFilterSql({ ...filters, categories: [] });
  try {
    const rows = await inspectQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count ${TXN_FROM} ${sql}
       AND t.review_status = 'pending'
       AND t.account_id IS NULL`,
      params,
    );
    return Number(rows[0]?.count ?? 0);
  } catch (err) {
    financeDbError(err);
  }
}

export async function countFinanceTransactions(): Promise<number> {
  try {
    const rows = await inspectQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM finance_transactions
       WHERE COALESCE(flow_kind, 'expense') = 'expense' AND amount > 0`,
    );
    return Number(rows[0]?.count ?? 0);
  } catch (err) {
    financeDbError(err);
  }
}

export async function countIncomeTransactions(): Promise<number> {
  try {
    const rows = await inspectQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM finance_transactions WHERE flow_kind = 'income'`,
    );
    return Number(rows[0]?.count ?? 0);
  } catch (err) {
    financeDbError(err);
  }
}

export async function queryIncomeBySource(
  filters: FinanceFilters,
): Promise<{ label: string; amount: number }[]> {
  if (filters.categories.length > 0 && !filters.categories.includes("income")) {
    return [];
  }
  const incomeFilters: FinanceFilters = { ...filters, categories: ["income"] };
  const { sql, params } = buildFilterSql(incomeFilters, { incomeMode: true });
  try {
    const rows = await inspectQuery<{ label: string; amount: string }>(
      `SELECT COALESCE(c.label, t.merchant, 'Income') AS label,
              SUM(ABS(t.amount))::text AS amount
       ${TXN_FROM}
       ${sql}
       GROUP BY c.label, t.merchant
       ORDER BY SUM(ABS(t.amount)) DESC`,
      params,
    );
    return rows.map((r) => ({ label: r.label, amount: Number(r.amount) }));
  } catch (err) {
    financeDbError(err);
  }
}

export async function querySpendByImportance(
  filters: FinanceFilters,
): Promise<{ importance: string; amount: number }[]> {
  const { sql, params } = buildFilterSql(filters);
  try {
    const rows = await inspectQuery<{ importance: string; amount: string }>(
      `SELECT COALESCE(t.importance, c.default_importance, 'optional') AS importance,
              SUM(ABS(t.amount))::text AS amount
       ${TXN_FROM}
       ${sql}
       GROUP BY COALESCE(t.importance, c.default_importance, 'optional')
       ORDER BY SUM(ABS(t.amount)) DESC`,
      params,
    );
    return rows.map((r) => ({ importance: r.importance, amount: Number(r.amount) }));
  } catch (err) {
    financeDbError(err);
  }
}

// --- mutations unchanged below ---

export async function insertFinanceTransactions(
  rows: ParsedFinanceRow[],
  importId: number,
  rules: FinanceRule[],
): Promise<{ inserted: number; skipped: number; updated: number; autoCategorized: number; pending: number }> {
  let inserted = 0;
  let skipped = 0;
  let updated = 0;
  let autoCategorized = 0;
  let pending = 0;

  for (const row of rows) {
    const rule =
      row.accountName || row.categorySlug ? null : matchRule(rules, row.merchant, row.description);

    let accountId: number | null = null;
    let subcategory = row.subcategory ?? row.accountName ?? null;
    let reviewStatus: FinanceReviewStatus = "pending";
    const flowKind = row.flowKind ?? "expense";
    let importance: string | null = null;

    if (row.accountName) {
      const acct = await getFinanceAccountByName(row.accountName);
      if (acct) {
        accountId = acct.id;
        subcategory = acct.name;
        reviewStatus = "approved";
        autoCategorized++;
      }
    } else if (row.categorySlug) {
      const acct = await getFinanceAccountBySlug(row.categorySlug);
      if (acct) {
        accountId = acct.id;
        subcategory = acct.name;
        reviewStatus = "approved";
        importance = defaultImportanceForCategory(row.categorySlug);
        autoCategorized++;
      }
    } else if (rule?.accountId) {
      accountId = rule.accountId;
      subcategory = rule.accountName ?? rule.subcategory;
      importance = rule.importance ?? null;
      reviewStatus = "approved";
      autoCategorized++;
      await incrementRuleHit(rule.id);
    }

    if (reviewStatus === "pending") pending++;

    try {
      const existing = await inspectQuery<{ id: number; account_id: number | null }>(
        `SELECT id, account_id FROM finance_transactions WHERE dedupe_key = $1 LIMIT 1`,
        [row.dedupeKey],
      );

      if (existing[0]) {
        if (!existing[0].account_id && accountId) {
          await inspectExecute(
            `UPDATE finance_transactions
             SET account_id = $1, subcategory = $2, review_status = 'approved',
                 importance = $3, updated_at = now()
             WHERE id = $4`,
            [accountId, subcategory, importance, existing[0].id],
          );
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      const result = await inspectExecute(
        `INSERT INTO finance_transactions
           (source, transaction_date, merchant, description, amount, account_id, subcategory,
            review_status, raw_import_id, dedupe_key, flow_kind, importance)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          row.source,
          row.transactionDate,
          row.merchant,
          row.description,
          row.amount,
          accountId,
          subcategory,
          reviewStatus,
          importId,
          row.dedupeKey,
          flowKind,
          importance,
        ],
      );
      if (result > 0) inserted++;
      else skipped++;
    } catch (err) {
      financeDbError(err);
    }
  }

  return { inserted, skipped, updated, autoCategorized, pending };
}

export async function listReviewQueue(limit = 100): Promise<FinanceTransaction[]> {
  try {
    const rows = await inspectQuery<FinanceTransactionRow>(
      `SELECT ${TXN_SELECT}
       ${TXN_FROM}
       WHERE t.review_status = 'pending' AND t.account_id IS NULL
         AND t.flow_kind = 'expense' AND t.amount > 0
       ORDER BY t.transaction_date DESC, t.amount DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map(mapTxn);
  } catch (err) {
    financeDbError(err);
  }
}

export async function categorizeTransactions(input: {
  transactionIds: number[];
  accountId: number;
  importance?: string | null;
  learnRule?: boolean;
}): Promise<number> {
  const accounts = await inspectQuery<{ id: number; name: string }>(
    `SELECT id, name FROM finance_accounts WHERE id = $1 AND merged_into_id IS NULL LIMIT 1`,
    [input.accountId],
  );
  const account = accounts[0];
  if (!account) throw new Error(`Unknown account id: ${input.accountId}`);

  const importance = input.importance ?? "optional";

  let updated = 0;
  for (const id of input.transactionIds) {
    const rows = await inspectQuery<{ merchant: string; description: string }>(
      `SELECT merchant, description FROM finance_transactions WHERE id = $1`,
      [id],
    );
    const txn = rows[0];
    if (!txn) continue;

    await inspectExecute(
      `UPDATE finance_transactions
       SET account_id = $1, subcategory = $2, review_status = 'approved', importance = $3, updated_at = now()
       WHERE id = $4`,
      [account.id, account.name, importance, id],
    );
    updated++;

    if (input.learnRule !== false) {
      const { upsertFinanceRule } = await import("@/lib/ops/finance/db/rules");
      await upsertFinanceRule({
        merchant: txn.merchant,
        description: txn.description,
        accountId: Number(account.id),
        subcategory: account.name,
        importance,
      });

      await inspectExecute(
        `UPDATE finance_transactions
         SET account_id = $1, subcategory = $2, review_status = 'approved', importance = $3, updated_at = now()
         WHERE review_status = 'pending'
           AND LOWER(merchant) = LOWER($4)`,
        [account.id, account.name, importance, txn.merchant],
      );
    }
  }
  return updated;
}

export type LedgerFilters = {
  year?: string;
  source?: string;
  accountId?: number;
  merchant?: string;
  search?: string;
  sort?: "date" | "merchant" | "amount" | "account";
  sortDir?: "asc" | "desc";
  limit?: number;
};

export async function queryLedger(filters: LedgerFilters = {}): Promise<FinanceTransaction[]> {
  const params: unknown[] = [];
  const clauses: string[] = ["1=1"];

  if (filters.year) {
    params.push(`${filters.year}-01-01`);
    clauses.push(`t.transaction_date >= $${params.length}`);
    params.push(`${filters.year}-12-31`);
    clauses.push(`t.transaction_date <= $${params.length}`);
  }
  if (filters.source) {
    params.push(filters.source);
    clauses.push(`t.source = $${params.length}`);
  }
  if (filters.accountId) {
    params.push(filters.accountId);
    clauses.push(`t.account_id = $${params.length}`);
  }
  if (filters.merchant) {
    params.push(`%${filters.merchant.toLowerCase()}%`);
    clauses.push(`lower(t.merchant) LIKE $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search.toLowerCase()}%`);
    clauses.push(
      `(lower(t.merchant) LIKE $${params.length} OR lower(t.description) LIKE $${params.length})`,
    );
  }

  const sortCol =
    filters.sort === "merchant"
      ? "t.merchant"
      : filters.sort === "amount"
        ? "t.amount"
        : filters.sort === "account"
          ? "a.name"
          : "t.transaction_date";
  const sortDir = filters.sortDir === "asc" ? "ASC" : "DESC";
  params.push(filters.limit ?? 500);

  try {
    const rows = await inspectQuery<FinanceTransactionRow>(
      `SELECT ${TXN_SELECT}
       ${TXN_FROM}
       WHERE ${clauses.join(" AND ")}
       ORDER BY ${sortCol} ${sortDir}, t.id DESC
       LIMIT $${params.length}`,
      params,
    );
    return rows.map(mapTxn);
  } catch (err) {
    financeDbError(err);
  }
}

export async function updateLedgerTransactions(
  ids: number[],
  patch: {
    accountId?: number | null;
    importance?: string | null;
    taxTreatment?: string | null;
    notes?: string | null;
    flowKind?: string;
  },
): Promise<number> {
  if (!ids.length) return 0;
  const sets: string[] = ["updated_at = now()"];
  const params: unknown[] = [];

  if (patch.accountId !== undefined) {
    params.push(patch.accountId);
    sets.push(`account_id = $${params.length}`);
    if (patch.accountId) {
      params.push(patch.accountId);
      sets.push(`subcategory = (SELECT name FROM finance_accounts WHERE id = $${params.length})`);
    }
  }
  if (patch.importance !== undefined) {
    params.push(patch.importance);
    sets.push(`importance = $${params.length}`);
  }
  if (patch.taxTreatment !== undefined) {
    params.push(patch.taxTreatment);
    sets.push(`tax_treatment = $${params.length}`);
  }
  if (patch.notes !== undefined) {
    params.push(patch.notes);
    sets.push(`notes = $${params.length}`);
  }
  if (patch.flowKind) {
    params.push(patch.flowKind);
    sets.push(`flow_kind = $${params.length}`);
  }
  if (patch.accountId) {
    sets.push(`review_status = 'approved'`);
  }

  params.push(ids);
  const result = await inspectExecute(
    `UPDATE finance_transactions SET ${sets.join(", ")} WHERE id = ANY($${params.length}::bigint[])`,
    params,
  );
  return result;
}

export async function listTransactionLedger(limit = 100): Promise<FinanceTransaction[]> {
  return queryLedger({ limit });
}

export async function queryImportanceMonthlyAverages(
  filters: FinanceFilters,
): Promise<Record<string, number>> {
  const rows = await querySpendByImportance(filters);
  const months = Math.max((await queryMonthlySpend(filters)).length, 1);
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.importance] = r.amount / months;
  }
  return out;
}
