"use client";

import Link from "next/link";

import { FinanceAccountRegisterSummary } from "@/components/ops/finance/FinanceAccountRegisterSummary";
import { FinanceAppleCardRegister } from "@/components/ops/finance/FinanceAppleCardRegister";
import type { AppleCardAccountData } from "@/lib/ops/finance/load-apple-card-account";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type Props = {
  data: AppleCardAccountData;
};

export function FinanceAppleCardAccount({ data }: Props) {
  const stmt = data.currentStatement;
  const register = data.register;

  return (
    <div className="ops-finance-account ops-finance-apple">
      <header className="ops-finance-account__header ops-finance-account__header--compact">
        <h1 className="ops-finance-gt__heading">{data.name}</h1>
        <div className="ops-finance-account__key-metrics">
          <div className="ops-finance-account__key-metric">
            <span>Statement Balance</span>
            <strong className="ops-finance-account__balance--debt">{fmt(stmt?.endingBalance)}</strong>
          </div>
          <div className="ops-finance-account__key-metric">
            <span>Minimum Due</span>
            <strong>{fmt(stmt?.minimumDue)}</strong>
          </div>
          <div className="ops-finance-account__key-metric">
            <span>Due Date</span>
            <strong>{fmtDate(stmt?.dueDate)}</strong>
          </div>
        </div>
        <div className="ops-finance-account__setup-actions">
          {stmt?.storagePath ? (
            <a className="ops-finance-account__btn" href={stmt.storagePath} target="_blank" rel="noreferrer">
              View Statement
            </a>
          ) : null}
          <Link className="ops-finance-account__btn ops-finance-account__btn--primary" href="/ops/finance/import?account=apple-card">
            Import Statement
          </Link>
        </div>
      </header>

      <section className="ops-finance-account__section ops-finance-account__section--compact">
        <h2>Statement History</h2>
        {data.statements.length ? (
          <div className="ops-finance-gt__table-wrap">
            <table className="ops-finance-gt__table ops-finance-account__stmt-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Beginning</th>
                  <th>Ending</th>
                  <th>Payments</th>
                  <th>Purchases</th>
                </tr>
              </thead>
              <tbody>
                {data.statements.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/ops/finance/statements/${s.id}`}>{s.statementPeriod}</Link>
                    </td>
                    <td>{fmt(s.previousBalance)}</td>
                    <td>{fmt(s.endingBalance)}</td>
                    <td>{fmt(s.paymentTotal)}</td>
                    <td>{fmt(s.purchaseTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ops-finance-gt__note">No statements on file yet.</p>
        )}
      </section>

      {register ? (
        <section className="ops-finance-account__section ops-finance-account__section--register">
          <h2>Register</h2>
          <FinanceAccountRegisterSummary summary={register.summary} />
          <FinanceAppleCardRegister
            rows={register.appleCardRows ?? []}
            openingBalance={register.summary.statementBalance}
            openingLabel={`${register.summary.anchorLabel} statement balance`}
          />
        </section>
      ) : null}
    </div>
  );
}
