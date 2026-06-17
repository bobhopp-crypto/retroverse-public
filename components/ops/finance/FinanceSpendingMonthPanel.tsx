"use client";

import { useCallback, useEffect, useState } from "react";

import type { SpendingDrillDownData } from "@/lib/ops/finance/load-spending-drill-down";
import type { SpendingSeriesRefresh } from "@/lib/ops/finance/load-spending-drill-down";
import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";
import {
  SPENDING_EDIT_CATEGORIES,
  type SpendingEditCategoryId,
} from "@/lib/ops/finance/spending-category-config";
import type { SpendingHomeCategoryId } from "@/lib/ops/finance/spending-home-categories";

type Props = {
  chartCategoryId: SpendingHomeCategoryId;
  chartCategoryLabel: string;
  month: string;
  initial: SpendingDrillDownData | null;
  loading: boolean;
  merchantFilter: string | null;
  onMerchantFilter: (merchant: string | null) => void;
  onClose: () => void;
  onUpdated: (series: SpendingSeriesRefresh, drillDown: SpendingDrillDownData | null) => void;
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FinanceSpendingMonthPanel({
  chartCategoryId,
  chartCategoryLabel,
  month,
  initial,
  loading,
  merchantFilter,
  onMerchantFilter,
  onClose,
  onUpdated,
}: Props) {
  const [data, setData] = useState<SpendingDrillDownData | null>(initial);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const display = data ?? initial;

  useEffect(() => {
    setData(initial);
  }, [initial]);

  const recategorize = useCallback(
    async (transactionId: number, categoryId: SpendingEditCategoryId) => {
      setSavingId(transactionId);
      setError(null);
      try {
        const res = await fetch("/api/ops/finance/spending/drill-down", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId,
            categoryId,
            chartCategoryId,
            month,
            merchant: merchantFilter,
          }),
        });
        const json = (await readOpsJsonResponse(res)) as {
          drillDown: SpendingDrillDownData | null;
          series: SpendingSeriesRefresh;
        };
        const drillDown = json.drillDown;
        const series = json.series;
        setData(drillDown);
        onUpdated(series, drillDown);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSavingId(null);
      }
    },
    [chartCategoryId, month, merchantFilter, onUpdated],
  );

  return (
    <section className="ops-finance-spend__month-panel" aria-label="Month spending detail">
      <div className="ops-finance-spend__month-head">
        <div>
          <h3>
            {chartCategoryLabel} — {display?.monthDisplay ?? month}
          </h3>
          {merchantFilter ? (
            <p className="ops-finance-spend__month-filter">
              Filtered: <strong>{merchantFilter}</strong>{" "}
              <button type="button" onClick={() => onMerchantFilter(null)}>
                Clear
              </button>
            </p>
          ) : null}
        </div>
        <button type="button" className="ops-finance-spend__month-close" onClick={onClose}>
          Close
        </button>
      </div>

      {loading && !display ? (
        <p className="ops-finance-gt__note">Loading transactions…</p>
      ) : display ? (
        <>
          <div className="ops-finance-spend__month-stats">
            <div>
              <span>Total Spending</span>
              <strong>{fmt(display.totalSpending)}</strong>
            </div>
            <div>
              <span>Transactions</span>
              <strong>{display.transactionCount}</strong>
            </div>
            <div>
              <span>Category</span>
              <strong>{display.categoryLabel}</strong>
            </div>
          </div>

          <div className="ops-finance-spend__merchant-rollup">
            <h4>Top Merchants</h4>
            {display.topMerchants.length ? (
              <ul className="ops-finance-spend__merchant-list">
                {display.topMerchants.map((row) => (
                  <li key={row.merchant}>
                    <button
                      type="button"
                      className={
                        merchantFilter === row.merchant
                          ? "ops-finance-spend__merchant-btn--active"
                          : undefined
                      }
                      onClick={() =>
                        onMerchantFilter(merchantFilter === row.merchant ? null : row.merchant)
                      }
                    >
                      <span>{row.merchant}</span>
                      <span>{fmt(row.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ops-finance-spend__drill-empty">No merchants this month.</p>
            )}
          </div>

          <div className="ops-finance-spend__txn-table-wrap">
            <table className="ops-finance-spend__txn-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {display.transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>{fmtDate(txn.transactionDate)}</td>
                    <td>{txn.merchant}</td>
                    <td>{txn.description}</td>
                    <td>{fmt(txn.amount)}</td>
                    <td>
                      <select
                        className="ops-finance-spend__cat-select"
                        value={txn.categoryId}
                        disabled={savingId === txn.id}
                        onChange={(e) =>
                          void recategorize(txn.id, e.target.value as SpendingEditCategoryId)
                        }
                      >
                        {SPENDING_EDIT_CATEGORIES.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!display.transactions.length ? (
              <p className="ops-finance-spend__drill-empty">No transactions this month.</p>
            ) : null}
          </div>
        </>
      ) : (
        <p className="ops-finance-gt__note">Could not load month detail.</p>
      )}
      {error ? <p className="ops-finance-import__error">{error}</p> : null}
    </section>
  );
}
