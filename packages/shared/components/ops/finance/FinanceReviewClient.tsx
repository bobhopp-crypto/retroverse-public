"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { FinanceAccount } from "@/lib/ops/finance/finance-account";
import type { FinanceTransaction } from "@/lib/ops/finance/db/transactions";
import { FINANCE_IMPORTANCE_LEVELS } from "@/lib/ops/finance/finance-importance";
import { normalizeMerchant } from "@/lib/ops/finance/finance-model";
import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";

const SOURCE_LABELS: Record<string, string> = {
  apple_card: "Apple Card",
  amazon: "Amazon",
  paypal: "PayPal",
  nebat: "NEBAT",
};

const MIXED_MERCHANTS = ["amazon", "kwik trip", "paypal"];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type MerchantGroup = {
  merchant: string;
  merchantKey: string;
  txns: FinanceTransaction[];
  mixed: boolean;
  total: number;
};

type Props = {
  queue: FinanceTransaction[];
  accounts: FinanceAccount[];
};

export function FinanceReviewClient({ queue: initialQueue, accounts }: Props) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [importance, setImportance] = useState("useful");
  const [busy, setBusy] = useState(false);
  const [expandedMixed, setExpandedMixed] = useState<Set<string>>(new Set());
  const [accountByMerchant, setAccountByMerchant] = useState<Record<string, string>>({});

  const activeAccounts = useMemo(() => accounts.filter((a) => a.active), [accounts]);

  const groups = useMemo(() => {
    const map = new Map<string, MerchantGroup>();
    for (const txn of queue) {
      const key = normalizeMerchant(txn.merchant || "Unknown");
      const existing = map.get(key);
      if (existing) {
        existing.txns.push(txn);
        existing.total += txn.amount;
      } else {
        const mixed =
          MIXED_MERCHANTS.some((m) => key.includes(m)) ||
          txn.merchant.toLowerCase().includes("amazon") ||
          txn.merchant.toLowerCase().includes("kwik");
        map.set(key, {
          merchant: txn.merchant || "Unknown",
          merchantKey: key,
          txns: [txn],
          mixed,
          total: txn.amount,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [queue]);

  async function assignMerchant(group: MerchantGroup, learnRule: boolean) {
    const accountId = Number(accountByMerchant[group.merchantKey]);
    if (!accountId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ops/finance/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantKey: group.merchantKey,
          merchant: group.merchant,
          accountId,
          importance,
          mixed: group.mixed,
          learnRule,
          applyScope: "both",
        }),
      });
      await readOpsJsonResponse(res);
      setQueue((prev) => prev.filter((t) => !group.txns.some((g) => g.id === t.id)));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function assignTxn(txnId: number, accountId: number, learnRule: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/ops/finance/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds: [txnId], accountId, importance, learnRule }),
      });
      await readOpsJsonResponse(res);
      setQueue((prev) => prev.filter((t) => t.id !== txnId));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops-finance-review">
      <p className="ops-finance-review__lead">
        {queue.length} pending across {groups.length} merchants ·{" "}
        <Link className="ops-link" href="/ops/finance/merchants?pending=1">
          Merchant Review
        </Link>
      </p>

      <div className="ops-finance-review__importance">
        <span className="ops-finance__dim">Importance</span>
        {FINANCE_IMPORTANCE_LEVELS.map((level) => (
          <button
            key={level.id}
            type="button"
            className={`ops-finance-review__btn ${importance === level.id ? "ops-finance-review__btn--on" : ""}`}
            onClick={() => setImportance(level.id)}
          >
            {level.label}
          </button>
        ))}
      </div>

      <ul className="ops-finance-review__groups">
        {groups.map((group) => (
          <li key={group.merchantKey} className="ops-finance-review__group">
            <div className="ops-finance-review__group-head">
              <strong>{group.merchant}</strong>
              <span>
                {group.txns.length} items · {fmt(group.total)}
                {group.mixed ? " · mixed" : ""}
              </span>
            </div>

            {!group.mixed ? (
              <div className="ops-finance-review__bulk">
                <select
                  className="ops-finance-import__browse"
                  value={accountByMerchant[group.merchantKey] ?? ""}
                  onChange={(e) =>
                    setAccountByMerchant((prev) => ({ ...prev, [group.merchantKey]: e.target.value }))
                  }
                >
                  <option value="">Assign account…</option>
                  {activeAccounts.map((a) => (
                    <option key={`${group.merchantKey}-${a.id}`} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ops-finance-review__btn"
                  disabled={busy}
                  onClick={() => void assignMerchant(group, false)}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className="ops-finance-review__btn ops-finance-review__btn--rule"
                  disabled={busy}
                  onClick={() => void assignMerchant(group, true)}
                >
                  + Rule
                </button>
                <Link className="ops-link" href={`/ops/finance/merchants/${encodeURIComponent(group.merchantKey)}`}>
                  Detail
                </Link>
              </div>
            ) : null}

            <ul className="ops-finance-review__items">
              {group.txns.slice(0, group.mixed && !expandedMixed.has(group.merchantKey) ? 3 : 8).map((txn) => (
                <li key={`txn-${txn.id}`}>
                  <div className="ops-finance-review__item">
                    <span className="ops-finance-review__date">{txn.transactionDate}</span>
                    <span className="ops-finance-review__source">{SOURCE_LABELS[txn.source] ?? txn.source}</span>
                    <span className="ops-finance-review__desc">{txn.description}</span>
                    <strong>{fmt(txn.amount)}</strong>
                  </div>
                  {group.mixed ? (
                    <div className="ops-finance-review__bulk">
                      <select
                        className="ops-finance-import__browse"
                        defaultValue=""
                        disabled={busy}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          if (id) void assignTxn(txn.id, id, false);
                        }}
                      >
                        <option value="">Account…</option>
                        {activeAccounts.map((a) => (
                          <option key={`mix-${txn.id}-${a.id}`} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            {group.mixed && group.txns.length > 3 ? (
              <button
                type="button"
                className="ops-finance-review__btn ops-finance-review__btn--small"
                onClick={() =>
                  setExpandedMixed((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.merchantKey)) next.delete(group.merchantKey);
                    else next.add(group.merchantKey);
                    return next;
                  })
                }
              >
                {expandedMixed.has(group.merchantKey) ? "Show fewer" : `Show all ${group.txns.length}`}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
