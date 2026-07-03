import type { BalanceChangeSummary } from "@/lib/ops/finance/account-register";

type Props = {
  summary: BalanceChangeSummary;
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function FinanceBalanceChangeSummary({ summary }: Props) {
  const { changeAmount, oldestBalance, newestBalance, oldestLabel, newestLabel, periodCount } =
    summary;
  const direction = changeAmount > 0 ? "increased" : changeAmount < 0 ? "decreased" : "unchanged";

  return (
    <div className="ops-finance-register__change-card">
      <h3>Balance Change Summary</h3>
      <p className="ops-finance-register__change-lead">
        Across {periodCount} statement{periodCount === 1 ? "" : "s"}, ending balance {direction}{" "}
        {changeAmount !== 0 ? (
          <>
            by <strong>{fmt(Math.abs(changeAmount))}</strong>
          </>
        ) : null}
        .
      </p>
      <div className="ops-finance-register__change-grid">
        <div>
          <span>Oldest ({oldestLabel})</span>
          <strong>{fmt(oldestBalance)}</strong>
        </div>
        <div>
          <span>Newest ({newestLabel})</span>
          <strong>{fmt(newestBalance)}</strong>
        </div>
        <div>
          <span>Net Change</span>
          <strong className={changeAmount > 0 ? "ops-finance-register__diff--up" : changeAmount < 0 ? "ops-finance-register__diff--down" : ""}>
            {changeAmount === 0 ? fmt(0) : `${changeAmount > 0 ? "+" : ""}${fmt(changeAmount)}`}
          </strong>
        </div>
      </div>
    </div>
  );
}
