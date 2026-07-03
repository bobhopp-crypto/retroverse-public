"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { FinanceAccount } from "@/lib/ops/finance/finance-account";
import type { MerchantSummary } from "@/lib/ops/finance/db/merchants";
import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";
import { FINANCE_IMPORTANCE_LEVELS } from "@/lib/ops/finance/finance-importance";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type Props = {
  merchants: MerchantSummary[];
  accounts: FinanceAccount[];
  pendingOnly?: boolean;
  activeBookkeepingOnly?: boolean;
};

export function FinanceMerchantsClient({
  merchants: initial,
  accounts,
  pendingOnly,
  activeBookkeepingOnly = true,
}: Props) {
  const router = useRouter();
  const [merchants, setMerchants] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [assignKey, setAssignKey] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [importance, setImportance] = useState("optional");

  const activeAccounts = accounts.filter((a) => a.active);

  async function assignMerchant(merchant: MerchantSummary, learnRule: boolean) {
    if (!accountId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ops/finance/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantKey: merchant.merchantKey,
          merchant: merchant.merchant,
          accountId: Number(accountId),
          importance,
          learnRule,
          applyScope: "both",
        }),
      });
      await readOpsJsonResponse(res);
      setMerchants((prev) => prev.filter((m) => m.merchantKey !== merchant.merchantKey));
      setAssignKey(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops-finance-merchants">
      <p className="ops-finance-review__lead">
        {merchants.length} merchants{pendingOnly ? " needing review" : ""}
        {activeBookkeepingOnly ? " · active 2026+" : " · all years"}
        {activeBookkeepingOnly ? (
          <>
            {" · "}
            <Link className="ops-link" href="/ops/finance/reports/merchants?history=1">
              Show historical
            </Link>
          </>
        ) : (
          <>
            {" · "}
            <Link className="ops-link" href="/ops/finance/reports/merchants">
              Active year only
            </Link>
          </>
        )}
      </p>
      <table className="ops-finance-import__table">
        <thead>
          <tr>
            <th>Merchant</th>
            <th>Count</th>
            <th>Total spend</th>
            <th>First</th>
            <th>Last</th>
            <th>Rule</th>
            <th>Suggested</th>
            <th>Review</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {merchants.map((m) => (
            <tr key={m.merchantKey}>
              <td>
                <Link className="ops-link" href={`/ops/finance/reports/merchants/${encodeURIComponent(m.merchantKey)}`}>
                  {m.merchant}
                </Link>
                {m.mixed ? <span className="ops-finance__dim"> mixed</span> : null}
              </td>
              <td>{m.txnCount}</td>
              <td>{fmt(m.totalSpend)}</td>
              <td>{m.firstSeen}</td>
              <td>{m.lastSeen}</td>
              <td>{m.currentRule ?? "—"}</td>
              <td>{m.suggestedAccount ?? "—"}</td>
              <td>{m.needsReview ? "Yes" : "—"}</td>
              <td>
                {assignKey === m.merchantKey ? (
                  <span className="ops-finance-review__bulk">
                    <select
                      className="ops-finance-import__browse"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                    >
                      <option value="">Account…</option>
                      {activeAccounts.map((a) => (
                        <option key={`m-${m.merchantKey}-${a.id}`} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="ops-finance-import__browse"
                      value={importance}
                      onChange={(e) => setImportance(e.target.value)}
                    >
                      {FINANCE_IMPORTANCE_LEVELS.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ops-finance-review__btn"
                      disabled={busy}
                      onClick={() => void assignMerchant(m, false)}
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      className="ops-finance-review__btn ops-finance-review__btn--rule"
                      disabled={busy}
                      onClick={() => void assignMerchant(m, true)}
                    >
                      + Rule
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="ops-finance-review__btn ops-finance-review__btn--small"
                    onClick={() => setAssignKey(m.merchantKey)}
                  >
                    Assign
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
