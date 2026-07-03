"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FinanceAccountRegisterSummary } from "@/components/ops/finance/FinanceAccountRegisterSummary";
import { FinanceNebatRegister } from "@/components/ops/finance/FinanceNebatRegister";
import type { FinanceAccountDetailData } from "@/lib/ops/finance/load-finance-account-detail";
import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";

type Props = {
  data: FinanceAccountDetailData;
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function FinanceAccountDetail({ data }: Props) {
  const router = useRouter();
  const [showManualForm, setShowManualForm] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [asOfInput, setAsOfInput] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveManualBalance() {
    const amount = Number(balanceInput);
    if (!Number.isFinite(amount)) {
      setError("Enter a valid balance.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/finance/institution-accounts/${data.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualBalance: amount,
          manualBalanceAsOf: asOfInput,
          setupStatus: "manual",
        }),
      });
      await readOpsJsonResponse(res);
      setShowManualForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function skipSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/finance/institution-accounts/${data.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupStatus: "skipped" }),
      });
      await readOpsJsonResponse(res);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops-finance-account">
      {data.needsSetup ? (
        <section className="ops-finance-account__setup">
          <h2>Set up {data.name}</h2>
          <p>Add a balance or import a statement to get started.</p>
          <div className="ops-finance-account__setup-actions">
            <button
              type="button"
              className="ops-finance-account__btn ops-finance-account__btn--primary"
              onClick={() => setShowManualForm((v) => !v)}
            >
              Enter Balance
            </button>
            <Link
              className="ops-finance-account__btn"
              href={`/ops/finance/import?account=${data.slug}`}
            >
              Import Statement
            </Link>
            <button
              type="button"
              className="ops-finance-account__btn"
              disabled={busy}
              onClick={() => void skipSetup()}
            >
              Skip for Now
            </button>
          </div>
          {showManualForm ? (
            <div className="ops-finance-account__manual-form">
              <label>
                Balance
                <input
                  type="number"
                  step="0.01"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                />
              </label>
              <label>
                As of
                <input type="date" value={asOfInput} onChange={(e) => setAsOfInput(e.target.value)} />
              </label>
              <button
                type="button"
                className="ops-finance-account__btn ops-finance-account__btn--primary"
                disabled={busy}
                onClick={() => void saveManualBalance()}
              >
                Save
              </button>
            </div>
          ) : null}
          {error ? <p className="ops-finance-import__error">{error}</p> : null}
        </section>
      ) : null}

      <header className="ops-finance-account__header ops-finance-account__header--compact">
        <h1 className="ops-finance-gt__heading">{data.name}</h1>
        <div className="ops-finance-account__key-metrics">
          <div className="ops-finance-account__key-metric">
            <span>Statement Balance</span>
            <strong className={data.kind === "liability" ? "ops-finance-account__balance--debt" : ""}>
              {fmt(data.statementBalance)}
            </strong>
          </div>
          <div className="ops-finance-account__key-metric">
            <span>As of</span>
            <strong>{fmtDate(data.asOfDate)}</strong>
          </div>
        </div>
        <div className="ops-finance-account__setup-actions">
          <Link className="ops-finance-account__btn" href={`/ops/finance/import?account=${data.slug}`}>
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
                  <th scope="col">Period</th>
                  <th scope="col">Opening</th>
                  <th scope="col">Ending</th>
                </tr>
              </thead>
              <tbody>
                {data.statements.map((stmt) => (
                  <tr key={`stmt-${stmt.importId ?? stmt.nebatStatementId}-${stmt.label}`}>
                    <td>{stmt.label}</td>
                    <td>{fmt(stmt.beginningBalance)}</td>
                    <td>{fmt(stmt.endingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ops-finance-gt__note">No statements on file yet.</p>
        )}
      </section>

      {data.register ? (
        <section className="ops-finance-account__section ops-finance-account__section--register">
          <h2>Register</h2>
          <FinanceAccountRegisterSummary summary={data.register.summary} />
          <FinanceNebatRegister
            rows={data.register.nebatRows ?? []}
            openingBalance={data.register.summary.statementBalance}
            openingLabel={`${data.register.summary.anchorLabel} statement balance`}
          />
        </section>
      ) : null}

      {data.slug === "mortgage" ? (
        <section className="ops-finance-account__section ops-finance-account__section--compact">
          <h2>Payment History</h2>
          <p className="ops-finance-gt__note">Mortgage payments appear in statement history above.</p>
        </section>
      ) : null}
    </div>
  );
}
