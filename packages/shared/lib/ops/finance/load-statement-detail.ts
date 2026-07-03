import { inspectPing } from "@/lib/inspect/pg";

import { getAppleCardStatementById } from "@/lib/ops/finance/db/apple-card-statements";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { getInstitutionAccountBySlug } from "@/lib/ops/finance/db/institution-accounts";
import {
  queryAccountTransactions,
  type FinanceTransactionWithStatement,
} from "@/lib/ops/finance/db/transactions";

export type StatementDetailData = {
  statement: NonNullable<Awaited<ReturnType<typeof getAppleCardStatementById>>>;
  accountName: string;
  accountSlug: string;
  transactions: FinanceTransactionWithStatement[];
};

export async function loadStatementDetail(id: number): Promise<StatementDetailData | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;
  await ensureFinanceSchema();

  const statement = await getAppleCardStatementById(id);
  if (!statement) return null;

  const account = await getInstitutionAccountBySlug("apple-card");
  if (!account || account.id !== statement.institutionAccountId) return null;

  const transactions = await queryAccountTransactions({
    institutionAccountId: account.id,
    ledgerSource: "apple_card",
    dateFrom: statement.statementStart,
    dateTo: statement.statementEnd,
  });

  return {
    statement,
    accountName: account.name,
    accountSlug: "apple-card",
    transactions,
  };
}
