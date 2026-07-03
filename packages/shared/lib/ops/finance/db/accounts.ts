import "server-only";

import { inspectExecute, inspectQuery } from "@/lib/inspect/pg";

import type { FinanceAccount } from "@/lib/ops/finance/finance-account";
import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";

export type { FinanceAccount } from "@/lib/ops/finance/finance-account";
export { sortFinanceAccountsByName } from "@/lib/ops/finance/finance-account";

export type FinanceAccountRow = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  merged_into_id: number | null;
  workbook_txn_count: number;
  txn_count?: string | number;
  total_spend?: string | number;
};

function mapAccount(row: FinanceAccountRow): FinanceAccount {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active,
    mergedIntoId: row.merged_into_id,
    workbookTxnCount: row.workbook_txn_count,
    txnCount: Number(row.txn_count ?? 0),
    totalSpend: Number(row.total_spend ?? 0),
  };
}

const ACCOUNT_SELECT = `
  SELECT a.id, a.name, a.slug, a.active, a.merged_into_id, a.workbook_txn_count,
         COUNT(t.id)::text AS txn_count,
         COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.flow_kind = 'expense' AND t.amount > 0), 0)::text AS total_spend
  FROM finance_accounts a
  LEFT JOIN finance_transactions t ON t.account_id = a.id AND t.archived_at IS NULL
`;

export async function listFinanceAccounts(): Promise<FinanceAccount[]> {
  try {
    const rows = await inspectQuery<FinanceAccountRow>(
      `${ACCOUNT_SELECT}
       WHERE a.merged_into_id IS NULL
       GROUP BY a.id
       ORDER BY lower(a.name) ASC`,
    );
    return rows.map(mapAccount);
  } catch (err) {
    financeDbError(err);
  }
}

export async function listActiveFinanceAccounts(limit?: number): Promise<FinanceAccount[]> {
  const accounts = await listFinanceAccounts();
  const active = accounts.filter((a) => a.active);
  return limit ? active.slice(0, limit) : active;
}

export async function getFinanceAccountById(id: number): Promise<FinanceAccount | null> {
  try {
    const rows = await inspectQuery<FinanceAccountRow>(
      `${ACCOUNT_SELECT}
       WHERE a.id = $1 AND a.merged_into_id IS NULL
       GROUP BY a.id`,
      [id],
    );
    return rows[0] ? mapAccount(rows[0]) : null;
  } catch (err) {
    financeDbError(err);
  }
}

export async function getFinanceAccountByName(name: string): Promise<FinanceAccount | null> {
  try {
    const rows = await inspectQuery<FinanceAccountRow>(
      `${ACCOUNT_SELECT}
       WHERE lower(a.name) = lower($1) AND a.merged_into_id IS NULL
       GROUP BY a.id
       LIMIT 1`,
      [name.trim()],
    );
    return rows[0] ? mapAccount(rows[0]) : null;
  } catch (err) {
    financeDbError(err);
  }
}

export async function getFinanceAccountBySlug(slug: string): Promise<FinanceAccount | null> {
  try {
    const rows = await inspectQuery<FinanceAccountRow>(
      `${ACCOUNT_SELECT}
       WHERE a.slug = $1 AND a.merged_into_id IS NULL
       GROUP BY a.id
       LIMIT 1`,
      [slug],
    );
    return rows[0] ? mapAccount(rows[0]) : null;
  } catch (err) {
    financeDbError(err);
  }
}

export function accountSlugFromName(name: string, suffix = 0): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "account";
  return suffix > 0 ? `${base}-${suffix + 1}` : base;
}

export async function createFinanceAccount(input: {
  name: string;
  active?: boolean;
}): Promise<FinanceAccount> {
  const name = input.name.trim();
  if (!name) throw new Error("Account name required");

  const existing = await getFinanceAccountByName(name);
  if (existing) throw new Error(`Account already exists: ${name}`);

  let slug = accountSlugFromName(name);
  let attempt = 0;
  while (await getFinanceAccountBySlug(slug)) {
    attempt++;
    slug = accountSlugFromName(name, attempt);
  }

  try {
    const rows = await inspectQuery<{ id: number }>(
      `INSERT INTO finance_accounts (name, slug, active, workbook_txn_count)
       VALUES ($1, $2, $3, 0)
       RETURNING id`,
      [name, slug, input.active !== false],
    );
    const id = rows[0]?.id;
    if (!id) throw new Error("Failed to create account");
    const account = await getFinanceAccountById(id);
    if (!account) throw new Error("Failed to load created account");
    return account;
  } catch (err) {
    financeDbError(err);
  }
}

export async function renameFinanceAccount(id: number, name: string): Promise<FinanceAccount> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Account name required");

  const conflict = await inspectQuery<{ id: number }>(
    `SELECT id FROM finance_accounts WHERE lower(name) = lower($1) AND id <> $2 AND merged_into_id IS NULL LIMIT 1`,
    [trimmed, id],
  );
  if (conflict[0]) throw new Error(`Account name already in use: ${trimmed}`);

  let slug = accountSlugFromName(trimmed);
  let attempt = 0;
  while (true) {
    const taken = await inspectQuery<{ id: number }>(
      `SELECT id FROM finance_accounts WHERE slug = $1 AND id <> $2 LIMIT 1`,
      [slug, id],
    );
    if (!taken[0]) break;
    attempt++;
    slug = accountSlugFromName(trimmed, attempt);
  }

  try {
    await inspectExecute(
      `UPDATE finance_accounts SET name = $1, slug = $2, updated_at = now() WHERE id = $3`,
      [trimmed, slug, id],
    );
    await inspectExecute(
      `UPDATE finance_transactions SET subcategory = $1, updated_at = now() WHERE account_id = $2`,
      [trimmed, id],
    );
    const account = await getFinanceAccountById(id);
    if (!account) throw new Error("Account not found");
    return account;
  } catch (err) {
    financeDbError(err);
  }
}

export async function setFinanceAccountActive(id: number, active: boolean): Promise<void> {
  try {
    await inspectExecute(
      `UPDATE finance_accounts SET active = $1, updated_at = now() WHERE id = $2`,
      [active, id],
    );
  } catch (err) {
    financeDbError(err);
  }
}

export async function mergeFinanceAccounts(sourceId: number, targetId: number): Promise<void> {
  if (sourceId === targetId) throw new Error("Cannot merge account into itself");

  try {
    await inspectExecute(
      `UPDATE finance_transactions SET account_id = $1, updated_at = now() WHERE account_id = $2`,
      [targetId, sourceId],
    );
    await inspectExecute(
      `UPDATE finance_rules SET account_id = $1, updated_at = now() WHERE account_id = $2`,
      [targetId, sourceId],
    );
    await inspectExecute(
      `UPDATE finance_accounts
       SET active = false, merged_into_id = $1, updated_at = now()
       WHERE id = $2`,
      [targetId, sourceId],
    );
  } catch (err) {
    financeDbError(err);
  }
}

export async function upsertWorkbookAccounts(
  accounts: { name: string; slug: string; workbookTxnCount: number; active: boolean }[],
): Promise<number> {
  let upserted = 0;
  for (const row of accounts) {
    try {
      const existing = await inspectQuery<{ id: number; slug: string }>(
        `SELECT id, slug FROM finance_accounts WHERE lower(name) = lower($1) AND merged_into_id IS NULL LIMIT 1`,
        [row.name],
      );
      if (existing[0]) {
        await inspectExecute(
          `UPDATE finance_accounts
           SET workbook_txn_count = GREATEST(workbook_txn_count, $1),
               active = CASE WHEN $2 = false THEN false ELSE active END,
               updated_at = now()
           WHERE id = $3`,
          [row.workbookTxnCount, row.active, existing[0].id],
        );
      } else {
        await inspectExecute(
          `INSERT INTO finance_accounts (name, slug, active, workbook_txn_count)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (slug) DO UPDATE SET
             name = EXCLUDED.name,
             workbook_txn_count = GREATEST(finance_accounts.workbook_txn_count, EXCLUDED.workbook_txn_count),
             updated_at = now()`,
          [row.name, row.slug, row.active, row.workbookTxnCount],
        );
      }
      upserted++;
    } catch (err) {
      financeDbError(err);
    }
  }
  return upserted;
}

export async function seedFinanceMerchantRules(): Promise<void> {
  const rules: { pattern: string; accountName: string; importance?: string }[] = [
    { pattern: "openai", accountName: "AI - ChatGPT", importance: "useful" },
    { pattern: "chatgpt", accountName: "AI - ChatGPT", importance: "useful" },
    { pattern: "cursor", accountName: "AI - Cursor", importance: "useful" },
    { pattern: "netflix", accountName: "SUB - Netflix", importance: "optional" },
    { pattern: "spectrum", accountName: "Internet", importance: "required" },
    { pattern: "menards", accountName: "Home", importance: "required" },
    { pattern: "culver", accountName: "Restaurants", importance: "optional" },
    { pattern: "amazon", accountName: "Amazon", importance: "luxury" },
    { pattern: "grok", accountName: "AI - Grok", importance: "useful" },
    { pattern: "adobe", accountName: "Software - Adobe", importance: "useful" },
    { pattern: "icloud", accountName: "Software - iCloud", importance: "required" },
  ];

  for (const rule of rules) {
    const account = await getFinanceAccountByName(rule.accountName);
    if (!account) continue;
    await inspectExecute(
      `INSERT INTO finance_rules (merchant_pattern, description_pattern, account_id, importance, confidence, hit_count, updated_at)
       VALUES ($1, '', $2, $3, 0.900, 0, now())
       ON CONFLICT (merchant_pattern, description_pattern)
       DO UPDATE SET
         account_id = EXCLUDED.account_id,
         importance = COALESCE(EXCLUDED.importance, finance_rules.importance),
         updated_at = now()`,
      [rule.pattern, account.id, rule.importance ?? null],
    );
  }
}
