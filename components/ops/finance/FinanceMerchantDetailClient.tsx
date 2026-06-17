"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { FinanceAccount } from "@/lib/ops/finance/finance-account";
import type { MerchantDetail } from "@/lib/ops/finance/db/merchants";
import type { FinanceTransaction } from "@/lib/ops/finance/db/transactions";
import { FINANCE_IMPORTANCE_LEVELS } from "@/lib/ops/finance/finance-importance";
import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";

const TAX_OPTIONS = ["Personal", "Personal Income", "W-2 Income", "Business", "Transfer"];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type Props = {
  merchant: MerchantDetail;
  transactions: FinanceTransaction[];
  accounts: FinanceAccount[];
};

export function FinanceMerchantDetailClient({ merchant, transactions, accounts }: Props) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(String(merchant.accountId ?? ""));
  const [importance, setImportance] = useState(merchant.suggestedImportance ?? "optional");
  const [taxTreatment, setTaxTreatment] = useState("Personal");
  const [mixed, setMixed] = useState(merchant.mixed);
  const [busy, setBusy] = useState(false);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.active), [accounts]);

  async function apply(scope: "existing" | "future" | "both", learnRule: boolean) {
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
          mixed,
          applyScope: scope,
          learnRule,
        }),
      });
      await readOpsJsonResponse(res);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops-finance-merchant-detail">
      <section className="ops-finance-import__results">
        <h2 className="ops-finance__panel-title">{merchant.merchant}</h2>
        <ul>
          <li>{merchant.txnCount} transactions · {fmt(merchant.totalSpend)}</li>
          <li>
            {merchant.firstSeen} → {merchant.lastSeen}
          </li>
          <li>Current rule: {merchant.currentRule ?? "none"}</li>
        </ul>
      </section>

      <div className="ops-finance-review__bulk">
        <select className="ops-finance-import__browse" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Account…</option>
          {activeAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select className="ops-finance-import__browse" value={importance} onChange={(e) => setImportance(e.target.value)}>
          {FINANCE_IMPORTANCE_LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <select className="ops-finance-import__browse" value={taxTreatment} onChange={(e) => setTaxTreatment(e.target.value)}>
          {TAX_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label>
          <input type="checkbox" checked={mixed} onChange={(e) => setMixed(e.target.checked)} /> Mixed merchant
        </label>
      </div>

      <div className="ops-finance-review__bulk">
        <button type="button" className="ops-finance-review__btn" disabled={busy} onClick={() => void apply("existing", false)}>
          Apply to existing
        </button>
        <button type="button" className="ops-finance-review__btn" disabled={busy} onClick={() => void apply("future", true)}>
          Apply to future only
        </button>
        <button type="button" className="ops-finance-review__btn ops-finance-review__btn--rule" disabled={busy} onClick={() => void apply("both", true)}>
          Existing + future + rule
        </button>
      </div>

      <table className="ops-finance-import__table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Account</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.transactionDate}</td>
              <td>{t.description}</td>
              <td>{t.accountName ?? "—"}</td>
              <td>{fmt(t.amount)}</td>
              <td>{t.reviewStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        <Link className="ops-link" href="/ops/finance/reports/merchants">
          ← All merchants
        </Link>
      </p>
    </div>
  );
}
