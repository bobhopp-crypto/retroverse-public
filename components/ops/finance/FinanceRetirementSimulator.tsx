"use client";

import { useMemo, useState } from "react";

import type { RetirementSimulatorData } from "@/lib/ops/finance/types";
import { simulate401kContribution } from "@/lib/ops/finance/retirement-simulator";

type Props = {
  data: RetirementSimulatorData;
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function FinanceRetirementSimulator({ data }: Props) {
  return (
    <section className="ops-finance__panel ops-finance__panel--retirement" aria-label="Retirement simulator">
      <div className="ops-finance__panel-head">
        <h2 className="ops-finance__panel-title">Retirement simulator</h2>
        <span className="ops-finance__status ops-finance__status--watch">Planning</span>
      </div>
      <div className="ops-finance__panel-body">
        <div className="ops-finance__retire-summary">
          <div>
            <span className="ops-finance__dim">Current income</span>
            <strong>{fmt(data.currentIncomeMonthly)}/mo</strong>
            <span className="ops-finance__retire-src">
              {data.incomeSource === "transactions"
                ? "Actual imported"
                : data.incomeSource === "baseline"
                  ? "Baseline estimate"
                  : "Blended"}
            </span>
          </div>
          <div>
            <span className="ops-finance__dim">Required bills</span>
            <strong>{fmt(data.requiredBillsMonthly)}/mo</strong>
            <span className="ops-finance__retire-src">{data.billsSource}</span>
          </div>
          <div>
            <span className="ops-finance__dim">Discretionary</span>
            <strong>{fmt(data.discretionaryMonthly)}/mo</strong>
          </div>
          <div>
            <span className="ops-finance__dim">AI + Retroverse</span>
            <strong>{fmt(data.aiMonthly + data.retroverseMonthly)}/mo</strong>
          </div>
          <div className="ops-finance__retire-surplus">
            <span className="ops-finance__dim">Monthly surplus</span>
            <strong className={data.monthlySurplus >= 0 ? "ops-finance__pos" : "ops-finance__neg"}>
              {fmt(data.monthlySurplus)}/mo
            </strong>
            <span className="ops-finance__dim">{fmt(data.annualSurplus)}/yr</span>
          </div>
        </div>

        {data.notes.length > 0 ? (
          <ul className="ops-finance__retire-notes">
            {data.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}

        <div className="ops-finance__scenario-grid">
          {data.scenarios.map((scenario) => (
            <article key={scenario.id} className="ops-finance__scenario-card">
              <h3>
                Scenario {scenario.id}: {scenario.label}
              </h3>
              <p className="ops-finance__dim">{scenario.description}</p>
              <dl className="ops-finance__scenario-stats">
                <div>
                  <dt>Income</dt>
                  <dd>{fmt(scenario.incomeMonthly)}/mo</dd>
                </div>
                <div>
                  <dt>Expenses</dt>
                  <dd>{fmt(scenario.expensesMonthly)}/mo</dd>
                </div>
                <div>
                  <dt>Monthly surplus</dt>
                  <dd className={scenario.surplusMonthly >= 0 ? "ops-finance__pos" : "ops-finance__neg"}>
                    {fmt(scenario.surplusMonthly)}
                  </dd>
                </div>
                <div>
                  <dt>Annual surplus</dt>
                  <dd>{fmt(scenario.surplusAnnual)}</dd>
                </div>
              </dl>
              <ul className="ops-finance__lines">
                {scenario.incomeLines.map((line) => (
                  <li key={`${scenario.id}-${line.label}`}>
                    <span>{line.label}</span>
                    <strong>{fmt(line.amount)}/mo</strong>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {data.downsizing.total > 0 ? (
          <p className="ops-finance__retire-downsize">
            Downsizing potential: <strong>{fmt(data.downsizing.total)}/mo</strong> from optional + luxury spend
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function FinanceTaxPlanning(props: {
  estimatedAnnualIncome: number;
  estimatedTaxLiability: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
  note: string;
}) {
  const [contribution, setContribution] = useState(6000);
  const sim = useMemo(
    () =>
      simulate401kContribution({
        annualIncome: props.estimatedAnnualIncome,
        contributionAnnual: contribution,
      }),
    [props.estimatedAnnualIncome, contribution],
  );

  return (
    <section className="ops-finance__panel ops-finance__panel--tax" aria-label="Tax planning">
      <div className="ops-finance__panel-head">
        <h2 className="ops-finance__panel-title">Tax planning</h2>
        <span className="ops-finance__status ops-finance__status--watch">Estimate</span>
      </div>
      <div className="ops-finance__panel-body">
        <div className="ops-finance__tax-grid">
          <div>
            <span className="ops-finance__dim">Est. annual income</span>
            <strong className="ops-finance__big">{fmt(props.estimatedAnnualIncome)}</strong>
          </div>
          <div>
            <span className="ops-finance__dim">Est. tax liability</span>
            <strong className="ops-finance__big">{fmt(props.estimatedTaxLiability)}</strong>
          </div>
          <div>
            <span className="ops-finance__dim">Effective rate</span>
            <strong className="ops-finance__big">{props.effectiveTaxRate}%</strong>
          </div>
        </div>
        <p className="ops-finance__dim">{props.note}</p>

        <h3 className="ops-finance__opp-heading">401(k) contribution simulator</h3>
        <label className="ops-finance__tax-slider">
          <span>Annual contribution: {fmt(contribution)}</span>
          <input
            type="range"
            min={0}
            max={23500}
            step={500}
            value={contribution}
            onChange={(e) => setContribution(Number(e.target.value))}
          />
        </label>
        <ul className="ops-finance__lines">
          <li>
            <span>Est. tax reduction</span>
            <strong>{fmt(sim.taxReduction)}</strong>
          </li>
          <li>
            <span>Net take-home impact</span>
            <strong>{fmt(sim.netTakeHomeImpact)}</strong>
          </li>
          <li>
            <span>Effective cost of contribution</span>
            <strong>{fmt(sim.effectiveCost)}</strong>
          </li>
        </ul>
      </div>
    </section>
  );
}
