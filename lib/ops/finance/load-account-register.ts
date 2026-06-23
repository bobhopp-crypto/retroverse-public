import {
  buildAppleCardRegister,
  buildBalanceChangeSummary,
  buildNebatRegister,
  buildRegisterSummary,
  type AccountRegisterSummary,
  type AppleCardRegisterRow,
  type BalanceChangeSummary,
  type BalanceHistoryPoint,
  type NebatRegisterRow,
  type RegisterAnchor,
} from "@/lib/ops/finance/account-register";
import { getInstitutionAccountBySlug } from "@/lib/ops/finance/db/institution-accounts";
import { queryAccountTransactions } from "@/lib/ops/finance/db/transactions";
import { listInstitutionAccountStatements } from "@/lib/ops/finance/db/account-statements";
import { listAppleCardStatements } from "@/lib/ops/finance/db/apple-card-statements";

export type AccountRegisterPayload = {
  anchor: RegisterAnchor;
  summary: AccountRegisterSummary;
  nebatRows: NebatRegisterRow[] | null;
  appleCardRows: AppleCardRegisterRow[] | null;
  balanceHistory: BalanceHistoryPoint[];
  balanceChange: BalanceChangeSummary | null;
};

function pickReconciledAnchor(
  statements: Array<{
    label: string;
    statementEnd: string;
    endingBalance: number | null;
    reconciled: boolean;
    workflowStatus: string;
  }>,
): RegisterAnchor | null {
  const withBalance = statements.filter((s) => s.endingBalance != null);
  if (withBalance.length === 0) return null;

  const reconciled = withBalance.filter(
    (s) =>
      s.reconciled ||
      s.workflowStatus === "reconciled" ||
      s.workflowStatus === "posted" ||
      s.workflowStatus === "imported",
  );
  const pool = reconciled.length > 0 ? reconciled : withBalance;
  const latest = [...pool].sort((a, b) => b.statementEnd.localeCompare(a.statementEnd))[0]!;
  return {
    label: latest.label,
    statementEnd: latest.statementEnd,
    statementBalance: latest.endingBalance!,
    reconciled: latest.reconciled,
  };
}

function balanceHistoryFromStatements(
  statements: Array<{
    label: string;
    statementEnd: string;
    endingBalance: number | null;
  }>,
): BalanceHistoryPoint[] {
  return [...statements]
    .filter((s) => s.endingBalance != null)
    .sort((a, b) => a.statementEnd.localeCompare(b.statementEnd))
    .map((s) => ({
      label: s.label,
      endingBalance: s.endingBalance!,
      statementEnd: s.statementEnd,
    }));
}

export async function loadAccountRegister(
  slug: "nebat-checking" | "apple-card",
): Promise<AccountRegisterPayload | null> {
  const account = await getInstitutionAccountBySlug(slug);
  if (!account) return null;

  if (slug === "nebat-checking") {
    const statements = await listInstitutionAccountStatements(account.id, slug);
    const anchor = pickReconciledAnchor(
      statements
        .filter((s) => s.statementEnd != null)
        .map((s) => ({
          label: s.label,
          statementEnd: s.statementEnd!,
          endingBalance: s.endingBalance,
          reconciled: s.reconciled,
          workflowStatus: s.status,
        })),
    );
    if (!anchor) return null;

    const txns = await queryAccountTransactions({
      institutionAccountId: account.id,
      ledgerSource: account.ledgerSource,
      dateAfter: anchor.statementEnd,
      orderAsc: true,
      limit: 500,
    });
    const { rows, calculatedBalance } = buildNebatRegister(anchor, txns);
    const balanceHistory = balanceHistoryFromStatements(
      statements
        .filter((s) => s.statementEnd != null)
        .map((s) => ({
          label: s.label,
          statementEnd: s.statementEnd!,
          endingBalance: s.endingBalance,
        })),
    );

    return {
      anchor,
      summary: buildRegisterSummary(anchor, calculatedBalance),
      nebatRows: rows,
      appleCardRows: null,
      balanceHistory,
      balanceChange: buildBalanceChangeSummary(balanceHistory),
    };
  }

  const appleStatements = await listAppleCardStatements(account.id);
  const anchor = pickReconciledAnchor(
    appleStatements.map((s) => ({
      label: s.statementPeriod,
      statementEnd: s.statementEnd,
      endingBalance: s.endingBalance,
      reconciled: s.workflowStatus === "reconciled" || s.workflowStatus === "posted",
      workflowStatus: s.workflowStatus,
    })),
  );
  if (!anchor) return null;

  const txns = await queryAccountTransactions({
    institutionAccountId: account.id,
    ledgerSource: account.ledgerSource,
    dateAfter: anchor.statementEnd,
    orderAsc: true,
    limit: 500,
  });
  const { rows, calculatedBalance } = buildAppleCardRegister(anchor, txns);
  const balanceHistory = balanceHistoryFromStatements(
    appleStatements.map((s) => ({
      label: s.statementPeriod,
      statementEnd: s.statementEnd,
      endingBalance: s.endingBalance,
    })),
  );

  return {
    anchor,
    summary: buildRegisterSummary(anchor, calculatedBalance),
    nebatRows: null,
    appleCardRows: rows,
    balanceHistory,
    balanceChange: buildBalanceChangeSummary(balanceHistory),
  };
}
