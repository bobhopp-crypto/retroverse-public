import { inspectExecute, inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";
import { FINANCE_ACTIVE_BOOKKEEPING_START } from "@/lib/ops/finance/finance-filters";
import { normalizeMerchant } from "@/lib/ops/finance/finance-model";

export type MerchantSummary = {
  merchantKey: string;
  merchant: string;
  txnCount: number;
  totalSpend: number;
  firstSeen: string;
  lastSeen: string;
  pendingCount: number;
  currentRule: string | null;
  currentAccount: string | null;
  suggestedAccount: string | null;
  suggestedImportance: string | null;
  mixed: boolean;
  needsReview: boolean;
};

export type MerchantDetail = MerchantSummary & {
  accountId: number | null;
  ruleId: number | null;
  taxTreatment: string | null;
};

const merchantKeySql = `lower(regexp_replace(trim(t.merchant), '[^a-zA-Z0-9]+', ' ', 'g'))`;

export type MerchantWorkloadMetrics = {
  totalMerchants: number;
  needsAction: number;
  activeIn2026: number;
  withRules: number;
  withoutRules: number;
  historical: number;
  staleUnassignedExpenses: number;
};

const merchantBaseCte = `
  WITH base AS (
    SELECT ${merchantKeySql} AS merchant_key,
           MIN(t.merchant) AS merchant,
           MAX(t.transaction_date) AS last_seen,
           COUNT(*) FILTER (
             WHERE t.account_id IS NULL AND t.review_status = 'pending'
               AND t.flow_kind = 'expense' AND t.amount > 0
           )::bigint AS pending_count,
           COUNT(*) FILTER (
             WHERE t.account_id IS NULL AND t.review_status = 'approved'
               AND t.flow_kind = 'expense' AND t.amount > 0
           )::bigint AS stale_unassigned_count
    FROM finance_transactions t
    WHERE t.flow_kind IN ('expense', 'income', 'transfer')
    GROUP BY ${merchantKeySql}
  ),
  enriched AS (
    SELECT b.*,
           EXTRACT(YEAR FROM b.last_seen)::int AS last_year,
           r.merchant_pattern AS rule_pattern
    FROM base b
    LEFT JOIN LATERAL (
      SELECT r2.merchant_pattern
      FROM finance_rules r2
      WHERE lower(b.merchant) LIKE '%' || r2.merchant_pattern || '%'
      ORDER BY r2.confidence DESC, r2.hit_count DESC
      LIMIT 1
    ) r ON true
  )`;

export async function queryMerchantWorkloadMetrics(): Promise<MerchantWorkloadMetrics> {
  try {
    const rows = await inspectQuery<{
      total_merchants: string;
      needs_action: string;
      active_in_2026: string;
      with_rules: string;
      without_rules: string;
      historical: string;
      stale_unassigned_expenses: string;
    }>(
      `${merchantBaseCte}
       SELECT COUNT(*)::text AS total_merchants,
              COUNT(*) FILTER (WHERE pending_count > 0)::text AS needs_action,
              COUNT(*) FILTER (WHERE last_year = 2026)::text AS active_in_2026,
              COUNT(*) FILTER (WHERE rule_pattern IS NOT NULL)::text AS with_rules,
              COUNT(*) FILTER (WHERE rule_pattern IS NULL)::text AS without_rules,
              COUNT(*) FILTER (WHERE last_year < 2026)::text AS historical,
              COALESCE(SUM(stale_unassigned_count), 0)::text AS stale_unassigned_expenses
       FROM enriched`,
    );
    const r = rows[0];
    return {
      totalMerchants: Number(r?.total_merchants ?? 0),
      needsAction: Number(r?.needs_action ?? 0),
      activeIn2026: Number(r?.active_in_2026 ?? 0),
      withRules: Number(r?.with_rules ?? 0),
      withoutRules: Number(r?.without_rules ?? 0),
      historical: Number(r?.historical ?? 0),
      staleUnassignedExpenses: Number(r?.stale_unassigned_expenses ?? 0),
    };
  } catch (err) {
    financeDbError(err);
  }
}

export async function countMerchantsNeedingAction(): Promise<number> {
  const metrics = await queryMerchantWorkloadMetrics();
  return metrics.needsAction;
}

export async function listMerchantSummaries(opts?: {
  pendingOnly?: boolean;
  activeBookkeepingOnly?: boolean;
  limit?: number;
}): Promise<MerchantSummary[]> {
  return listMerchantSummariesSimple(opts);
}

async function listMerchantSummariesSimple(opts?: {
  pendingOnly?: boolean;
  activeBookkeepingOnly?: boolean;
  limit?: number;
}): Promise<MerchantSummary[]> {
  const limit = opts?.limit ?? 200;
  const activeStart = opts?.activeBookkeepingOnly !== false ? FINANCE_ACTIVE_BOOKKEEPING_START : null;
  const whereClauses: string[] = [];
  if (opts?.pendingOnly) whereClauses.push("b.pending_count > 0");
  if (activeStart) {
    whereClauses.push(`(b.last_seen >= $2::date OR b.pending_count > 0)`);
  }
  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  try {
    const rows = await inspectQuery<{
      merchant_key: string;
      merchant: string;
      txn_count: string;
      total_spend: string;
      first_seen: string;
      last_seen: string;
      pending_count: string;
      top_account: string | null;
      mixed: boolean;
      suggested_importance: string | null;
      rule_pattern: string | null;
      rule_account: string | null;
    }>(
      `WITH base AS (
         SELECT ${merchantKeySql} AS merchant_key,
                MIN(t.merchant) AS merchant,
                COUNT(*)::bigint AS txn_count,
                COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.flow_kind = 'expense'), 0) AS total_spend,
                MIN(t.transaction_date) AS first_seen,
                MAX(t.transaction_date) AS last_seen,
                COUNT(*) FILTER (
                  WHERE t.account_id IS NULL AND t.review_status = 'pending'
                    AND t.flow_kind = 'expense' AND t.amount > 0
                    AND ($2::date IS NULL OR t.transaction_date >= $2::date)
                )::bigint AS pending_count,
                MODE() WITHIN GROUP (ORDER BY a.name) FILTER (WHERE a.name IS NOT NULL) AS top_account
         FROM finance_transactions t
         LEFT JOIN finance_accounts a ON a.id = t.account_id
         WHERE t.flow_kind IN ('expense', 'income', 'transfer')
         GROUP BY ${merchantKeySql}
       )
       SELECT b.*,
              COALESCE(mp.mixed, false) AS mixed,
              mp.suggested_importance,
              r.merchant_pattern AS rule_pattern,
              ra.name AS rule_account
       FROM base b
       LEFT JOIN finance_merchant_profiles mp ON mp.merchant_key = b.merchant_key
       LEFT JOIN LATERAL (
         SELECT r2.id, r2.merchant_pattern, r2.account_id
         FROM finance_rules r2
         WHERE lower(b.merchant) LIKE '%' || r2.merchant_pattern || '%'
         ORDER BY r2.confidence DESC, r2.hit_count DESC
         LIMIT 1
       ) r ON true
       LEFT JOIN finance_accounts ra ON ra.id = r.account_id
       ${whereSql}
       ORDER BY b.pending_count DESC, b.total_spend DESC
       LIMIT $1`,
      activeStart ? [limit, activeStart] : [limit, null],
    );

    return rows.map((r) => ({
      merchantKey: r.merchant_key,
      merchant: r.merchant,
      txnCount: Number(r.txn_count),
      totalSpend: Number(r.total_spend),
      firstSeen: String(r.first_seen).slice(0, 10),
      lastSeen: String(r.last_seen).slice(0, 10),
      pendingCount: Number(r.pending_count),
      currentRule: r.rule_pattern,
      currentAccount: r.rule_account ?? r.top_account,
      suggestedAccount: r.rule_account ?? r.top_account,
      suggestedImportance: r.suggested_importance ?? "optional",
      mixed: r.mixed,
      needsReview: Number(r.pending_count) > 0,
    }));
  } catch (err) {
    financeDbError(err);
  }
}

export async function getMerchantDetail(merchantKey: string): Promise<MerchantDetail | null> {
  const key = decodeURIComponent(merchantKey).toLowerCase();
  const rows = await listMerchantSummariesSimple({ limit: 500 });
  const summary = rows.find((r) => r.merchantKey === key || normalizeMerchant(r.merchant) === key);
  if (!summary) return null;

  const profile = await inspectQuery<{
    mixed: boolean;
    suggested_account_id: number | null;
    suggested_importance: string | null;
  }>(`SELECT mixed, suggested_account_id, suggested_importance FROM finance_merchant_profiles WHERE merchant_key = $1`, [
    summary.merchantKey,
  ]);

  const rule = await inspectQuery<{ id: number; account_id: number | null; merchant_pattern: string }>(
    `SELECT id, account_id, merchant_pattern FROM finance_rules
     WHERE lower($1) LIKE '%' || merchant_pattern || '%'
     ORDER BY confidence DESC LIMIT 1`,
    [summary.merchant],
  );

  return {
    ...summary,
    mixed: profile[0]?.mixed ?? summary.mixed,
    suggestedImportance: profile[0]?.suggested_importance ?? summary.suggestedImportance,
    accountId: rule[0]?.account_id ?? null,
    ruleId: rule[0]?.id ?? null,
    taxTreatment: null,
  };
}

export async function upsertMerchantProfile(input: {
  merchantKey: string;
  displayName: string;
  mixed?: boolean;
  suggestedAccountId?: number | null;
  suggestedImportance?: string | null;
}): Promise<void> {
  await inspectExecute(
    `INSERT INTO finance_merchant_profiles (merchant_key, display_name, mixed, suggested_account_id, suggested_importance, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (merchant_key) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       mixed = EXCLUDED.mixed,
       suggested_account_id = EXCLUDED.suggested_account_id,
       suggested_importance = EXCLUDED.suggested_importance,
       updated_at = now()`,
    [
      input.merchantKey,
      input.displayName,
      input.mixed ?? false,
      input.suggestedAccountId ?? null,
      input.suggestedImportance ?? null,
    ],
  );
}

export function merchantKeyFromName(merchant: string): string {
  return normalizeMerchant(merchant);
}
