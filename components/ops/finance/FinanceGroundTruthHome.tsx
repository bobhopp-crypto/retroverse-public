import Link from "next/link";

import type { FinanceGroundTruthData, GroundTruthAccount } from "@/lib/ops/finance/ground-truth-types";
import { institutionAccountHref } from "@/lib/ops/finance/institution-accounts-config";
import type { InstitutionAccountSlug } from "@/lib/ops/finance/institution-accounts-config";

type Props = {
  data: FinanceGroundTruthData;
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "Not on file";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(status: GroundTruthAccount["reconcileStatus"]): string {
  switch (status) {
    case "reconciled":
      return "Reconciled";
    case "needs_review":
      return "Needs Review";
    case "needs_import":
      return "Needs Import";
    default:
      return "Not Set";
  }
}

function cashTotal(accounts: GroundTruthAccount[]): number | null {
  const withBalance = accounts.filter((a) => a.kind === "asset" && a.balance != null);
  if (!withBalance.length) return null;
  return withBalance.reduce((sum, a) => sum + (a.balance ?? 0), 0);
}

function debtTotal(accounts: GroundTruthAccount[]): number | null {
  const withBalance = accounts.filter((a) => a.kind === "liability" && a.balance != null);
  if (!withBalance.length) return null;
  return withBalance.reduce((sum, a) => sum + (a.balance ?? 0), 0);
}

export function FinanceGroundTruthHome({ data }: Props) {
  const cash = cashTotal(data.accounts);
  const debt = debtTotal(data.accounts);

  return (
    <div className="ops-finance-gt" aria-label="Finance dashboard">
      {data.importsNeedingAttention > 0 ? (
        <section className="ops-finance-gt__alert" aria-live="polite">
          <p>
            <strong>{data.importsNeedingAttention}</strong> import
            {data.importsNeedingAttention === 1 ? "" : "s"} need attention.{" "}
            <Link href="/ops/finance/import">Open Import</Link>
          </p>
        </section>
      ) : null}

      <section className="ops-finance-gt__section" aria-labelledby="finance-accounts-heading">
        <div className="ops-finance-gt__section-head">
          <h2 id="finance-accounts-heading" className="ops-finance-gt__heading">
            Account Balances
          </h2>
          <Link className="ops-finance-gt__action" href="/ops/finance/import">
            Import Statements
          </Link>
        </div>
        <div className="ops-finance-gt__summary-row">
          <p className="ops-finance-gt__summary">
            Cash on hand: <strong>{fmt(cash)}</strong>
          </p>
          <p className="ops-finance-gt__summary">
            Total owed: <strong>{fmt(debt)}</strong>
          </p>
        </div>
        <div className="ops-finance-gt__accounts">
          {data.accounts.map((acct) => (
            <Link
              key={acct.slug}
              href={institutionAccountHref(acct.slug as InstitutionAccountSlug)}
              className="ops-finance-gt__account-card ops-finance-gt__account-card--link"
            >
              <h3 className="ops-finance-gt__account-name">{acct.name.toUpperCase()}</h3>
              <p
                className={`ops-finance-gt__account-balance ${acct.kind === "liability" ? "ops-finance-gt__account-balance--debt" : ""}`}
              >
                {fmt(acct.balance)}
              </p>
              <p className="ops-finance-gt__account-meta">Updated {fmtDate(acct.asOfDate)}</p>
              <p className="ops-finance-gt__account-status">{statusLabel(acct.reconcileStatus)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="ops-finance-gt__section ops-finance-gt__networth" aria-labelledby="finance-networth-heading">
        <h2 id="finance-networth-heading" className="ops-finance-gt__heading">
          Net Worth
        </h2>
        {data.netWorth.complete && data.netWorth.total != null ? (
          <p className="ops-finance-gt__networth-num" aria-label={`Net worth ${fmt(data.netWorth.total)}`}>
            {fmt(data.netWorth.total)}
          </p>
        ) : (
          <>
            <p className="ops-finance-gt__networth-incomplete">INCOMPLETE</p>
            {data.netWorth.missingAccounts.length ? (
              <div className="ops-finance-gt__missing">
                <p className="ops-finance-gt__missing-title">Missing:</p>
                <ul>
                  {data.netWorth.missingAccounts.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="ops-finance-gt__section" aria-labelledby="finance-reconcile-heading">
        <h2 id="finance-reconcile-heading" className="ops-finance-gt__heading">
          Statement Status
        </h2>
        <div className="ops-finance-gt__table-wrap">
          <table className="ops-finance-gt__table">
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((acct) => (
                <tr key={`recon-${acct.slug}`}>
                  <td>
                    <Link href={institutionAccountHref(acct.slug as InstitutionAccountSlug)}>
                      {acct.name}
                    </Link>
                  </td>
                  <td>{statusLabel(acct.reconcileStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ops-finance-gt__section" aria-labelledby="finance-recurring-heading">
        <h2 id="finance-recurring-heading" className="ops-finance-gt__heading">
          Recurring Charges
        </h2>
        {data.subscriptions.length ? (
          <div className="ops-finance-gt__table-wrap">
            <table className="ops-finance-gt__table">
              <thead>
                <tr>
                  <th scope="col">Service</th>
                  <th scope="col">Monthly</th>
                  <th scope="col">Last Charge</th>
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.map((sub) => (
                  <tr key={`sub-${sub.vendor}`}>
                    <td>{sub.vendor}</td>
                    <td>{fmt(sub.monthly)}</td>
                    <td>{fmtDate(sub.lastCharge)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ops-finance-gt__note">No recurring charges found in the 2026 ledger.</p>
        )}
      </section>
    </div>
  );
}
