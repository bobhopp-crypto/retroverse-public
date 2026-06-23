import { FinanceBalanceChangeSummary } from "@/components/ops/finance/FinanceBalanceChangeSummary";
import { FinanceStatementBalanceChart } from "@/components/ops/finance/FinanceStatementBalanceChart";
import type { BalanceChangeSummary, BalanceHistoryPoint } from "@/lib/ops/finance/account-register";

const CHART_MIN_PERIODS = 6;

type Props = {
  points: BalanceHistoryPoint[];
  balanceChange: BalanceChangeSummary | null;
};

export function FinanceBalanceHistoryPanel({ points, balanceChange }: Props) {
  if (points.length < 2) return null;

  if (points.length >= CHART_MIN_PERIODS) {
    return (
      <section className="ops-finance-account__section">
        <h2>Statement Balance History</h2>
        <p className="ops-finance-gt__note">Statement ending balances over time.</p>
        <FinanceStatementBalanceChart points={points} />
      </section>
    );
  }

  if (!balanceChange) return null;

  return (
    <section className="ops-finance-account__section">
      <h2>Statement Balance History</h2>
      <FinanceBalanceChangeSummary summary={balanceChange} />
    </section>
  );
}
