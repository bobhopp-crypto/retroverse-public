import { inspectQuery } from "@/lib/inspect/pg";

import { getFinanceAccountByName, getFinanceAccountBySlug } from "@/lib/ops/finance/db/accounts";
import { matchRule, type FinanceRule } from "@/lib/ops/finance/db/rules";
import type { ParsedFinanceRow } from "@/lib/ops/finance/finance-model";

export type FinanceImportPreviewRow = {
  stagingId?: number;
  transactionDate: string;
  merchant: string;
  description: string;
  amount: number;
  proposedAccount: string | null;
  duplicateWarning: string | null;
  flowKind: string;
  notes?: string | null;
};

async function resolveProposedAccount(
  row: ParsedFinanceRow,
  rules: FinanceRule[],
): Promise<string | null> {
  if (row.accountName) {
    const acct = await getFinanceAccountByName(row.accountName);
    if (acct) return acct.name;
    return row.accountName;
  }
  if (row.categorySlug) {
    const acct = await getFinanceAccountBySlug(row.categorySlug);
    if (acct) return acct.name;
  }
  const rule = matchRule(rules, row.merchant, row.description);
  if (rule?.accountName) return rule.accountName;
  if (rule?.subcategory) return rule.subcategory;
  return null;
}

async function loadDuplicateHints(
  keys: string[],
): Promise<Map<string, "skip" | "update">> {
  const map = new Map<string, "skip" | "update">();
  if (!keys.length) return map;

  const rows = await inspectQuery<{ dedupe_key: string; has_account: boolean }>(
    `SELECT dedupe_key, (account_id IS NOT NULL) AS has_account
     FROM finance_transactions
     WHERE archived_at IS NULL AND dedupe_key = ANY($1::text[])`,
    [keys],
  );
  for (const row of rows) {
    map.set(row.dedupe_key, row.has_account ? "skip" : "update");
  }
  return map;
}

function duplicateWarning(hint: "skip" | "update" | undefined): string | null {
  if (hint === "skip") return "Already in ledger";
  if (hint === "update") return "Duplicate — will assign account";
  return null;
}

export async function previewParsedRows(
  rows: ParsedFinanceRow[],
  rules: FinanceRule[],
): Promise<FinanceImportPreviewRow[]> {
  const dupes = await loadDuplicateHints(rows.map((r) => r.dedupeKey));
  const preview: FinanceImportPreviewRow[] = [];

  for (const row of rows) {
    const proposedAccount = await resolveProposedAccount(row, rules);
    preview.push({
      transactionDate: row.transactionDate,
      merchant: row.merchant,
      description: row.description,
      amount: row.amount,
      proposedAccount,
      duplicateWarning: duplicateWarning(dupes.get(row.dedupeKey)),
      flowKind: row.flowKind ?? "expense",
    });
  }

  return preview;
}
