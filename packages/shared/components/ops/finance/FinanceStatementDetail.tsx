"use client";

import Link from "next/link";

import type { StatementDetailData } from "@/lib/ops/finance/load-statement-detail";

type Props = {
  data: StatementDetailData;
};

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

export function FinanceStatementDetail({ data }: Props) {
  const s = data.statement;

  return (
    <div className="ops-finance-account ops-finance-apple">
      <p className="ops-finance-gt__note">
        <Link href={`/ops/finance/accounts/${data.accountSlug}`}>← {data.accountName}</Link>
      </p>

      <header className="ops-finance-apple__summary">
        <h1 className="ops-finance-gt__heading">{s.statementPeriod}</h1>
        <p className="ops-finance-apple__kicker">
          {fmtDate(s.statementStart)} – {fmtDate(s.statementEnd)}
        </p>

        <div className="ops-finance-apple__summary-metrics">
          <div>
            <span>Previous Balance</span>
            <strong>{fmt(s.previousBalance)}</strong>
          </div>
          <div>
            <span>Ending Balance</span>
            <strong>{fmt(s.endingBalance)}</strong>
          </div>
          <div>
            <span>Payments</span>
            <strong>{fmt(s.paymentTotal)}</strong>
          </div>
          <div>
            <span>Charges</span>
            <strong>{fmt(s.purchaseTotal)}</strong>
          </div>
          <div>
            <span>Interest</span>
            <strong>{fmt(s.interestTotal)}</strong>
          </div>
          <div>
            <span>Daily Cash</span>
            <strong>{fmt(s.dailyCashTotal)}</strong>
          </div>
          <div>
            <span>Minimum Due</span>
            <strong>{fmt(s.minimumDue)}</strong>
          </div>
          <div>
            <span>Due Date</span>
            <strong>{fmtDate(s.dueDate)}</strong>
          </div>
        </div>
      </header>

      <section className="ops-finance-account__section">
        <h2>Transactions in Period</h2>
        <p className="ops-finance-gt__note">
          {s.transactionCount} ledger row{s.transactionCount === 1 ? "" : "s"} in statement window
          {data.transactions.length !== s.transactionCount
            ? ` · showing ${data.transactions.length} linked`
            : ""}
        </p>
        {data.transactions.length ? (
          <div className="ops-finance-gt__table-wrap">
            <table className="ops-finance-gt__table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>{txn.transactionDate}</td>
                    <td>{txn.merchant}</td>
                    <td>{txn.description}</td>
                    <td>{fmt(txn.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ops-finance-gt__note">No transactions in this statement period.</p>
        )}
      </section>
    </div>
  );
}
