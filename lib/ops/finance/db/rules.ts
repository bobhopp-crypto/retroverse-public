import { inspectExecute, inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";
import { normalizeMerchant } from "@/lib/ops/finance/finance-model";

export type FinanceRuleRow = {
  id: number;
  merchant_pattern: string;
  description_pattern: string | null;
  category_id: number | null;
  account_id: number | null;
  subcategory: string | null;
  importance: string | null;
  confidence: string | number;
  hit_count: number;
  account_name?: string | null;
};

export type FinanceRule = {
  id: number;
  merchantPattern: string;
  descriptionPattern: string | null;
  categoryId: number | null;
  accountId: number | null;
  accountName: string | null;
  subcategory: string | null;
  importance: string | null;
  confidence: number;
  hitCount: number;
};

function mapRule(row: FinanceRuleRow): FinanceRule {
  return {
    id: row.id,
    merchantPattern: row.merchant_pattern,
    descriptionPattern: row.description_pattern,
    categoryId: row.category_id ? Number(row.category_id) : null,
    accountId: row.account_id ? Number(row.account_id) : null,
    accountName: row.account_name ?? null,
    subcategory: row.subcategory,
    importance: row.importance,
    confidence: Number(row.confidence),
    hitCount: row.hit_count,
  };
}

export async function listFinanceRules(): Promise<FinanceRule[]> {
  try {
    const rows = await inspectQuery<FinanceRuleRow>(
      `SELECT r.id, r.merchant_pattern, r.description_pattern, r.category_id, r.account_id,
              r.subcategory, r.importance, r.confidence, r.hit_count, a.name AS account_name
       FROM finance_rules r
       LEFT JOIN finance_accounts a ON a.id = r.account_id
       ORDER BY r.confidence DESC, r.hit_count DESC`,
    );
    return rows.map(mapRule);
  } catch (err) {
    financeDbError(err);
  }
}

export function matchRule(
  rules: FinanceRule[],
  merchant: string,
  description: string,
): FinanceRule | null {
  const m = normalizeMerchant(merchant);
  const d = description.toLowerCase();
  let best: FinanceRule | null = null;

  for (const rule of rules) {
    const p = rule.merchantPattern;
    const merchantHit =
      m.includes(p) || p.includes(m) || d.includes(p) || m.split(" ").some((w) => w.length > 3 && p.includes(w));
    if (!merchantHit) continue;
    if (rule.descriptionPattern && !d.includes(rule.descriptionPattern)) {
      continue;
    }
    if (!best || rule.confidence > best.confidence) {
      best = rule;
    }
  }
  return best;
}

export async function upsertFinanceRule(input: {
  merchant: string;
  description?: string;
  accountId: number;
  subcategory?: string | null;
  importance?: string | null;
}): Promise<void> {
  const merchantPattern = normalizeMerchant(input.merchant).slice(0, 120) || "unknown";
  const descriptionPattern = input.description
    ? input.description.toLowerCase().slice(0, 120)
    : "";

  try {
    await inspectExecute(
      `INSERT INTO finance_rules (merchant_pattern, description_pattern, account_id, subcategory, importance, confidence, hit_count, updated_at)
       VALUES ($1, $2, $3, $4, $5, 0.850, 1, now())
       ON CONFLICT (merchant_pattern, description_pattern)
       DO UPDATE SET
         account_id = EXCLUDED.account_id,
         subcategory = COALESCE(EXCLUDED.subcategory, finance_rules.subcategory),
         importance = COALESCE(EXCLUDED.importance, finance_rules.importance),
         confidence = LEAST(0.990, finance_rules.confidence + 0.020),
         hit_count = finance_rules.hit_count + 1,
         updated_at = now()`,
      [
        merchantPattern,
        descriptionPattern,
        input.accountId,
        input.subcategory ?? null,
        input.importance ?? null,
      ],
    );
  } catch (err) {
    financeDbError(err);
  }
}

export async function incrementRuleHit(ruleId: number): Promise<void> {
  try {
    await inspectExecute(
      `UPDATE finance_rules SET hit_count = hit_count + 1, updated_at = now() WHERE id = $1`,
      [ruleId],
    );
  } catch (err) {
    financeDbError(err);
  }
}
