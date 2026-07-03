import { inspectPing } from "@/lib/inspect/pg";

import {
  getLatestAppleCardStatement,
  listAppleCardStatements,
  type AppleCardStatementRow,
} from "@/lib/ops/finance/db/apple-card-statements";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { getInstitutionAccountBySlug } from "@/lib/ops/finance/db/institution-accounts";
import {
  queryAccountTransactions,
  type FinanceTransactionWithStatement,
} from "@/lib/ops/finance/db/transactions";

import type { AccountRegisterPayload } from "@/lib/ops/finance/load-account-register";
import { loadAccountRegister } from "@/lib/ops/finance/load-account-register";

export type AppleCardAccountData = {
  slug: "apple-card";
  name: string;
  currentStatement: AppleCardStatementRow | null;
  statements: AppleCardStatementRow[];
  balanceHistory: { label: string; endingBalance: number; statementEnd: string }[];
  transactions: FinanceTransactionWithStatement[];
  register: AccountRegisterPayload | null;
};

export async function loadAppleCardAccount(): Promise<AppleCardAccountData | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;
  await ensureFinanceSchema();

  const account = await getInstitutionAccountBySlug("apple-card");
  if (!account) return null;

  const statements = await listAppleCardStatements(account.id, 24);
  const currentStatement = statements[0] ?? (await getLatestAppleCardStatement(account.id));

  const balanceHistory = [...statements]
    .sort((a, b) => a.statementEnd.localeCompare(b.statementEnd))
    .map((s) => ({
      label: s.statementPeriod,
      endingBalance: s.endingBalance,
      statementEnd: s.statementEnd,
    }));

  const transactions = await queryAccountTransactions({
    institutionAccountId: account.id,
    ledgerSource: "apple_card",
  });

  const register = await loadAccountRegister("apple-card");

  return {
    slug: "apple-card",
    name: account.name,
    currentStatement,
    statements,
    balanceHistory,
    transactions,
    register,
  };
}
