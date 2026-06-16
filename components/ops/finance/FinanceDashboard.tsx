import type { ReactNode } from "react";

import { FinanceTrendChart } from "@/components/ops/finance/FinanceTrendChart";
import { FinanceRetirementSimulator, FinanceTaxPlanning } from "@/components/ops/finance/FinanceRetirementSimulator";
import type { FinanceDashboardData, FinanceHealthLabel } from "@/lib/ops/finance/types";

type Props = {
  data: FinanceDashboardData;
};

function fmt(n: number, compact = false): string {
  if (compact && Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusClass(status: FinanceHealthLabel): string {
  const map: Record<FinanceHealthLabel, string> = {
    Healthy: "ops-finance__status--healthy",
    Watch: "ops-finance__status--watch",
    Review: "ops-finance__status--review",
    Problem: "ops-finance__status--problem",
  };
  return map[status];
}

function StatusBadge(props: { status: FinanceHealthLabel }) {
  return (
    <span className={`ops-finance__status ${statusClass(props.status)}`}>{props.status}</span>
  );
}

function Panel(props: { title: string; status?: FinanceHealthLabel; children: ReactNode; className?: string }) {
  return (
    <section className={`ops-finance__panel ${props.className ?? ""}`.trim()}>
      <div className="ops-finance__panel-head">
        <h2 className="ops-finance__panel-title">{props.title}</h2>
        {props.status ? <StatusBadge status={props.status} /> : null}
      </div>
      <div className="ops-finance__panel-body">{props.children}</div>
    </section>
  );
}

function CashFlowBars(props: { months: FinanceDashboardData["cashFlow"]["months"] }) {
  const max = Math.max(...props.months.flatMap((m) => [m.in, m.out]), 1);
  return (
    <div className="ops-finance__cashflow" aria-label="Monthly cash flow">
      {props.months.map((m) => (
        <div key={m.month} className="ops-finance__cashflow-col">
          <div className="ops-finance__cashflow-bars">
            <div
              className="ops-finance__cashflow-in"
              style={{ height: `${(m.in / max) * 100}%` }}
              title={`In ${fmt(m.in)}`}
            />
            <div
              className="ops-finance__cashflow-out"
              style={{ height: `${(m.out / max) * 100}%` }}
              title={`Out ${fmt(m.out)}`}
            />
          </div>
          <span className="ops-finance__cashflow-label">{m.month}</span>
        </div>
      ))}
    </div>
  );
}

export function FinanceDashboard({ data }: Props) {
  const aiDelta =
    data.ai.pctChangeVsPriorYear > 0
      ? `+${Math.round(data.ai.pctChangeVsPriorYear)}% vs last year`
      : `${Math.round(data.ai.pctChangeVsPriorYear)}% vs last year`;

  const savingsTotal = data.opportunity.potentialSavings.reduce((sum, s) => sum + s.estimateMonthly, 0);

  return (
    <div className="ops-finance" aria-label="Finance dashboard">
      <div className="ops-finance__hero-row">
        <Panel title="AI spend" status={data.ai.status} className="ops-finance__panel--hero ops-finance__panel--ai">
          <p className="ops-finance__hero-num">{fmt(data.ai.monthlyAvg)}<span className="ops-finance__hero-unit">/mo</span></p>
          <p className="ops-finance__hero-sub">
            {fmt(data.ai.trend.annualProjection)}/yr projected · {data.ai.pctOfAppleSpend}% of card spend
          </p>
          <p className="ops-finance__hero-delta">{aiDelta}</p>
          <div className="ops-finance__trend-meta">
            <span>12-mo avg <strong>{fmt(data.ai.trend.monthlyAvg12)}</strong></span>
          </div>
          <FinanceTrendChart months={data.ai.trend.months} tone="ai" label="AI spend last 12 months" />
          <div className="ops-finance__chips">
            {data.ai.tools.map((tool) => (
              <span key={tool} className="ops-finance__chip">
                {tool}
              </span>
            ))}
          </div>
        </Panel>

        <Panel
          title="Retroverse spend"
          status={data.retroverse.status}
          className="ops-finance__panel--hero ops-finance__panel--retro"
        >
          <p className="ops-finance__hero-num">{fmt(data.retroverse.opsMonthly)}<span className="ops-finance__hero-unit">/mo</span></p>
          <p className="ops-finance__hero-sub">
            {fmt(data.retroverse.trend.annualProjection)}/yr projected · {fmt(data.retroverse.opsYtd)} YTD ops
          </p>
          <p className="ops-finance__hero-delta">
            Gear {fmt(data.retroverse.gearYtd)} YTD · Hosting {fmt(data.retroverse.hostingMonthly)}/mo
          </p>
          <div className="ops-finance__trend-meta">
            <span>12-mo avg <strong>{fmt(data.retroverse.trend.monthlyAvg12)}</strong></span>
          </div>
          <FinanceTrendChart months={data.retroverse.trend.months} tone="retro" label="Retroverse spend last 12 months" />
          <ul className="ops-finance__lines">
            {data.retroverse.lines.slice(0, 3).map((line) => (
              <li key={line.label}>
                <span>{line.label}</span>
                <strong>{fmt(line.amount)}/mo</strong>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="ops-finance__grid">
        <Panel title="Money in" status={data.income.status}>
          <p className="ops-finance__big">{fmt(data.income.monthlyEstimate)}<span className="ops-finance__unit">/mo</span></p>
          <p className="ops-finance__dim">Retirement baseline ~$4,063/mo when deposits not imported</p>
          <p className="ops-finance__dim">{fmt(data.income.ytd)} YTD</p>
          <ul className="ops-finance__lines">
            {data.income.sources.map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <strong>{fmt(s.amount, true)}</strong>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Required bills" status={data.requiredBills.status}>
          <p className="ops-finance__big">{fmt(data.requiredBills.monthlyEstimate)}<span className="ops-finance__unit">/mo</span></p>
          <p className="ops-finance__dim">Baseline floor ~$1,212/mo (mortgage + utilities)</p>
          <ul className="ops-finance__lines">
            {data.requiredBills.lines.slice(0, 5).map((line) => (
              <li key={line.label}>
                <span>{line.label}</span>
                <strong>{fmt(line.amount)}/mo</strong>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Apple Card" status={data.appleCard.status}>
          <p className="ops-finance__big">{fmt(data.appleCard.ytd)}<span className="ops-finance__unit"> YTD</span></p>
          <p className="ops-finance__dim">{fmt(data.appleCard.monthlyAvg)}/mo avg · {fmt(data.appleCard.lifetime, true)} lifetime</p>
        </Panel>

        <Panel title="Amazon detail" status={data.amazon.status}>
          <p className="ops-finance__big">{fmt(data.amazon.monthlyAvg)}<span className="ops-finance__unit">/mo</span></p>
          <p className="ops-finance__dim">{data.amazon.note}</p>
          <p className="ops-finance__dim">{fmt(data.amazon.ytd)} YTD itemized</p>
        </Panel>
      </div>

      <div className="ops-finance__phase2-row">
        <Panel title="Retirement readiness" status={data.readiness.score >= 60 ? "Healthy" : "Watch"}>
          <p className="ops-finance__hero-num">{data.readiness.score}<span className="ops-finance__hero-unit">/100</span></p>
          <p className="ops-finance__hero-sub">{data.readiness.label}</p>
          <ul className="ops-finance__lines">
            <li><span>Current income</span><strong>{fmt(data.readiness.currentIncomeMonthly)}/mo</strong></li>
            <li><span>Retirement income (A)</span><strong>{fmt(data.readiness.retirementIncomeMonthly)}/mo</strong></li>
            <li><span>Current spending</span><strong>{fmt(data.readiness.currentSpendingMonthly)}/mo</strong></li>
            <li><span>Required spending</span><strong>{fmt(data.readiness.requiredSpendingMonthly)}/mo</strong></li>
            <li><span>Retirement surplus</span><strong>{fmt(data.readiness.retirementSurplusMonthly)}/mo</strong></li>
          </ul>
          <h3 className="ops-finance__opp-heading">Importance averages</h3>
          <ul className="ops-finance__lines">
            <li><span>Required</span><strong>{fmt(data.readiness.importanceMonthly.required)}/mo</strong></li>
            <li><span>Useful</span><strong>{fmt(data.readiness.importanceMonthly.useful)}/mo</strong></li>
            <li><span>Optional</span><strong>{fmt(data.readiness.importanceMonthly.optional)}/mo</strong></li>
            <li><span>Luxury</span><strong>{fmt(data.readiness.importanceMonthly.luxury)}/mo</strong></li>
          </ul>
          <p className="ops-finance__dim">
            Downsizing: {fmt(data.readiness.downsizingScenario.monthlySavings)}/mo ·{" "}
            {fmt(data.readiness.downsizingScenario.annualSavings)}/yr if optional+luxury dropped
          </p>
        </Panel>

        <Panel title="Amazon orders (PDF)" status="Watch">
          <p className="ops-finance__big">{fmt(data.amazonOrders.ytdSpend)}<span className="ops-finance__unit"> YTD</span></p>
          <p className="ops-finance__dim">{fmt(data.amazonOrders.monthlyAvg)}/mo avg · Retroverse {fmt(data.amazonOrders.retroverseSpend)} · 3D {fmt(data.amazonOrders.printing3dSpend)}</p>
          <ul className="ops-finance__lines">
            {data.amazonOrders.byCategory.slice(0, 5).map((row) => (
              <li key={`amazon-orders-cat-${row.category}`}>
                <span>{row.category}</span>
                <strong>{fmt(row.amount)}</strong>
              </li>
            ))}
          </ul>
          {data.amazonOrders.topItems.length ? (
            <>
              <h3 className="ops-finance__opp-heading">Top items</h3>
              <ul className="ops-finance__lines">
                {data.amazonOrders.topItems.slice(0, 4).map((item) => (
                  <li key={`amazon-item-${item.description.slice(0, 40)}`}>
                    <span>{item.description.slice(0, 48)}</span>
                    <strong>{fmt(item.amount)}</strong>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Panel>
      </div>

      <div className="ops-finance__phase2-row">
        <FinanceRetirementSimulator data={data.retirement} />
        <FinanceTaxPlanning {...data.tax} />
      </div>

      <div className="ops-finance__phase2-row">
        <Panel title="Subscription center" status={data.subscriptions.status} className="ops-finance__panel--subs">
          <div className="ops-finance__subs-summary">
            <div>
              <span className="ops-finance__dim">Active</span>
              <strong className="ops-finance__subs-num">{data.subscriptions.active.length}</strong>
            </div>
            <div>
              <span className="ops-finance__dim">Monthly</span>
              <strong className="ops-finance__subs-num">{fmt(data.subscriptions.monthlyTotal)}</strong>
            </div>
            <div>
              <span className="ops-finance__dim">Annual</span>
              <strong className="ops-finance__subs-num">{fmt(data.subscriptions.annualTotal)}</strong>
            </div>
          </div>
          <div className="ops-finance__subs-table-wrap">
            <table className="ops-finance__subs-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Monthly</th>
                  <th>Annual</th>
                  <th>Last charge</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.active.map((sub) => (
                  <tr key={`sub-${sub.vendor}-${sub.lastCharge}`}>
                    <td>
                      <span className="ops-finance__sub-vendor">{sub.vendor}</span>
                      {sub.note ? <span className="ops-finance__sub-note">{sub.note}</span> : null}
                    </td>
                    <td>{fmt(sub.monthly)}</td>
                    <td>{fmt(sub.annual)}</td>
                    <td>{fmtDate(sub.lastCharge)}</td>
                    <td>
                      <StatusBadge status={sub.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Opportunity" className="ops-finance__panel--opportunity">
          <p className="ops-finance__opp-lead">
            Potential savings up to <strong>{fmt(savingsTotal)}/mo</strong> if review items are acted on
          </p>

          <h3 className="ops-finance__opp-heading">Largest categories (12 mo)</h3>
          <ul className="ops-finance__opp-list">
            {data.opportunity.largest.map((row) => (
              <li key={row.category}>
                <span>{row.category}</span>
                <strong>{fmt(row.amount)} · {row.pct}%</strong>
              </li>
            ))}
          </ul>

          <h3 className="ops-finance__opp-heading">Fastest growing (12 mo vs prior)</h3>
          <ul className="ops-finance__opp-list">
            {data.opportunity.fastestGrowing.map((row) => (
              <li key={row.category}>
                <span>{row.category}</span>
                <strong className={row.changePct && row.changePct > 25 ? "ops-finance__opp-up" : ""}>
                  {row.changePct && row.changePct > 0 ? "+" : ""}
                  {Math.round(row.changePct ?? 0)}%
                </strong>
              </li>
            ))}
          </ul>

          <h3 className="ops-finance__opp-heading">Potential savings</h3>
          <ul className="ops-finance__review">
            {data.opportunity.potentialSavings.map((item) => (
              <li key={item.id} className={`ops-finance__review-item ${statusClass(item.status)}`}>
                <div className="ops-finance__review-head">
                  <strong>{item.label} · {fmt(item.estimateMonthly)}/mo</strong>
                  <StatusBadge status={item.status} />
                </div>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="ops-finance__grid ops-finance__grid--wide">
        <Panel title="Cash flow snapshot" status={data.cashFlow.status}>
          <div className="ops-finance__cashflow-meta">
            <div>
              <span className="ops-finance__dim">Monthly net</span>
              <strong className="ops-finance__cash-num">{fmt(data.cashFlow.monthlyNet)}</strong>
            </div>
            <div>
              <span className="ops-finance__dim">NEBAT balance</span>
              <strong className="ops-finance__cash-num">{fmt(data.cashFlow.nebatBalance)}</strong>
            </div>
          </div>
          <CashFlowBars months={data.cashFlow.months} />
          <p className="ops-finance__legend">
            <span className="ops-finance__legend-in">In</span>
            <span className="ops-finance__legend-out">Out</span>
            Last 12 months
          </p>
        </Panel>

        <Panel title={`Top categories (${data.periodLabel})`}>
          <ul className="ops-finance__catlist">
            {data.topCategories.slice(0, 6).map((cat) => (
              <li key={cat.category}>
                <div className="ops-finance__cat-head">
                  <span>{cat.category}</span>
                  <strong>{fmt(cat.amount, true)}</strong>
                </div>
                <div className="ops-finance__cat-bar">
                  <div className="ops-finance__cat-fill" style={{ width: `${cat.pct}%` }} />
                </div>
                <span className="ops-finance__cat-pct">{cat.pct}%</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Review needed" status={data.reviewNeeded.some((r) => r.status === "Problem") ? "Problem" : "Review"}>
          <ul className="ops-finance__review">
            {data.reviewNeeded.map((item) => (
              <li key={item.id} className={`ops-finance__review-item ${statusClass(item.status)}`}>
                <div className="ops-finance__review-head">
                  <strong>{item.label}</strong>
                  <StatusBadge status={item.status} />
                </div>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
