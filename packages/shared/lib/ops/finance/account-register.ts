import type { FinanceTransactionWithStatement } from "@/lib/ops/finance/db/transactions";

export type RegisterAnchor = {
  label: string;
  statementEnd: string;
  statementBalance: number;
  reconciled: boolean;
};

export type AccountRegisterSummary = {
  statementBalance: number;
  calculatedBalance: number;
  differenceSinceStatement: number;
  anchorLabel: string;
  anchorDate: string;
};

export type NebatRegisterRow = {
  date: string;
  description: string;
  deposit: number | null;
  withdrawal: number | null;
  runningBalance: number;
};

export type AppleCardRegisterRow = {
  date: string;
  merchant: string;
  charge: number | null;
  payment: number | null;
  runningBalance: number;
};

export type BalanceHistoryPoint = {
  label: string;
  endingBalance: number;
  statementEnd: string;
};

export type BalanceChangeSummary = {
  oldestLabel: string;
  newestLabel: string;
  oldestBalance: number;
  newestBalance: number;
  changeAmount: number;
  periodCount: number;
};

export function buildRegisterSummary(
  anchor: RegisterAnchor,
  calculatedBalance: number,
): AccountRegisterSummary {
  const statementBalance = anchor.statementBalance;
  return {
    statementBalance,
    calculatedBalance,
    differenceSinceStatement: Number((calculatedBalance - statementBalance).toFixed(2)),
    anchorLabel: anchor.label,
    anchorDate: anchor.statementEnd,
  };
}

export function buildNebatRegister(
  anchor: RegisterAnchor,
  transactions: FinanceTransactionWithStatement[],
): { rows: NebatRegisterRow[]; calculatedBalance: number } {
  const sorted = [...transactions]
    .filter((t) => t.transactionDate > anchor.statementEnd)
    .sort((a, b) => {
      const d = a.transactionDate.localeCompare(b.transactionDate);
      return d !== 0 ? d : a.id - b.id;
    });

  let balance = anchor.statementBalance;
  const rows: NebatRegisterRow[] = sorted.map((txn) => {
    const isDeposit = txn.flowKind === "income";
    const deposit = isDeposit ? txn.amount : null;
    const withdrawal = !isDeposit ? txn.amount : null;
    if (isDeposit) balance += txn.amount;
    else balance -= txn.amount;
    balance = Number(balance.toFixed(2));
    return {
      date: txn.transactionDate,
      description: txn.description || txn.merchant,
      deposit,
      withdrawal,
      runningBalance: balance,
    };
  });

  return { rows, calculatedBalance: balance };
}

export function buildAppleCardRegister(
  anchor: RegisterAnchor,
  transactions: FinanceTransactionWithStatement[],
): { rows: AppleCardRegisterRow[]; calculatedBalance: number } {
  const sorted = [...transactions]
    .filter((t) => t.transactionDate > anchor.statementEnd)
    .sort((a, b) => {
      const d = a.transactionDate.localeCompare(b.transactionDate);
      return d !== 0 ? d : a.id - b.id;
    });

  let balance = anchor.statementBalance;
  const rows: AppleCardRegisterRow[] = sorted.map((txn) => {
    const isPayment = txn.flowKind === "income";
    const payment = isPayment ? txn.amount : null;
    const charge = !isPayment ? txn.amount : null;
    if (isPayment) balance -= txn.amount;
    else balance += txn.amount;
    balance = Number(balance.toFixed(2));
    return {
      date: txn.transactionDate,
      merchant: txn.merchant || txn.description,
      charge,
      payment,
      runningBalance: balance,
    };
  });

  return { rows, calculatedBalance: balance };
}

export function buildBalanceChangeSummary(
  points: BalanceHistoryPoint[],
): BalanceChangeSummary | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.statementEnd.localeCompare(b.statementEnd));
  const oldest = sorted[0]!;
  const newest = sorted[sorted.length - 1]!;
  return {
    oldestLabel: oldest.label,
    newestLabel: newest.label,
    oldestBalance: oldest.endingBalance,
    newestBalance: newest.endingBalance,
    changeAmount: Number((newest.endingBalance - oldest.endingBalance).toFixed(2)),
    periodCount: sorted.length,
  };
}
