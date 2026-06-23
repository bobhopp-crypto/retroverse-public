import type { SpendingMonthPoint } from "@/lib/ops/finance/load-finance-spending-home";

type Props = {
  months: SpendingMonthPoint[];
  categoryLabel: string;
  periodLabel: string;
  selectedMonth: string | null;
  onBarClick: (month: string, amount: number) => void;
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function FinanceSpendingChart({
  months,
  categoryLabel,
  periodLabel,
  selectedMonth,
  onBarClick,
}: Props) {
  const max = Math.max(...months.map((m) => m.amount), 1);
  const total = months.reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="ops-finance-spend__chart" aria-label={`${categoryLabel} spending — ${periodLabel}`}>
      <div className="ops-finance-spend__chart-head">
        <div>
          <p className="ops-finance-spend__chart-kicker">
            {categoryLabel === "Total" ? "Total Spending" : `${categoryLabel} Spending`}
          </p>
          <h2 className="ops-finance-spend__chart-title">{periodLabel}</h2>
          <p className="ops-finance-spend__chart-hint">Click a month bar to see transactions</p>
        </div>
      </div>

      {months.length ? (
        <div
          className="ops-finance-spend__bars"
          style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
        >
          {months.map((m) => (
            <button
              key={m.month}
              type="button"
              className={`ops-finance-spend__bar-col ${selectedMonth === m.month ? "ops-finance-spend__bar-col--active" : ""}`}
              title={`${m.month}: ${fmt(m.amount)} — click for detail`}
              onClick={() => onBarClick(m.month, m.amount)}
            >
              <span className="ops-finance-spend__bar-amount">{fmt(m.amount)}</span>
              <div className="ops-finance-spend__bar-track">
                <div
                  className="ops-finance-spend__bar-fill"
                  style={{ height: `${(m.amount / max) * 100}%` }}
                />
              </div>
              <span className="ops-finance-spend__bar-label">{m.month}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="ops-finance-gt__note">No spending in this period for {categoryLabel}.</p>
      )}

      <p className="ops-finance-spend__chart-foot">
        {months.length} month{months.length === 1 ? "" : "s"} · {fmt(total)} total
      </p>
    </div>
  );
}
