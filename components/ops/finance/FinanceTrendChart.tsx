import type { FinanceTrendMonth } from "@/lib/ops/finance/types";

type Props = {
  months: FinanceTrendMonth[];
  tone?: "ai" | "retro";
  label: string;
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function FinanceTrendChart({ months, tone = "ai", label }: Props) {
  const max = Math.max(...months.map((m) => m.amount), 1);

  return (
    <div className={`ops-finance__trend ops-finance__trend--${tone}`} aria-label={label}>
      <div className="ops-finance__trend-bars">
        {months.map((m) => (
          <div key={m.month} className="ops-finance__trend-col" title={`${m.month}: ${fmt(m.amount)}`}>
            <div className="ops-finance__trend-bar-wrap">
              <div
                className="ops-finance__trend-bar"
                style={{ height: `${(m.amount / max) * 100}%` }}
              />
            </div>
            <span className="ops-finance__trend-label">{m.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
