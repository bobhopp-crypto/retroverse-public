"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FinanceSpendingChart } from "@/components/ops/finance/FinanceSpendingChart";
import { FinanceSpendingMonthPanel } from "@/components/ops/finance/FinanceSpendingMonthPanel";
import type {
  FinanceSpendingHomeData,
  SpendingCategorySeries,
} from "@/lib/ops/finance/load-finance-spending-home";
import type {
  SpendingDrillDownData,
  SpendingSeriesRefresh,
} from "@/lib/ops/finance/load-spending-drill-down";
import type { GroundTruthAccount } from "@/lib/ops/finance/ground-truth-types";
import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";
import {
  MORE_SPENDING_CATEGORIES,
  PRIMARY_SPENDING_CATEGORIES,
  type SpendingHomeCategoryId,
} from "@/lib/ops/finance/spending-home-categories";
import { institutionAccountHref } from "@/lib/ops/finance/institution-accounts-config";
import type { InstitutionAccountSlug } from "@/lib/ops/finance/institution-accounts-config";

type Props = {
  data: FinanceSpendingHomeData;
};

function fmt(n: number | null): string {
  if (n == null) return "Not set up";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function statementLabel(asOf: string | null): string {
  if (!asOf) return "—";
  return new Date(`${asOf.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function accountStatus(acct: GroundTruthAccount): { label: string; ok: boolean } {
  if (acct.balance == null) return { label: "⚠", ok: false };
  if (acct.reconcileStatus === "needs_review" || acct.reconcileStatus === "needs_import") {
    return { label: "⚠", ok: false };
  }
  return { label: "✓", ok: true };
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

export function FinanceSpendingHome({ data }: Props) {
  const [selectedId, setSelectedId] = useState<SpendingHomeCategoryId>(data.defaultCategoryId);
  const [liveCategories, setLiveCategories] = useState(data.categories);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<SpendingDrillDownData | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [merchantFilter, setMerchantFilter] = useState<string | null>(null);

  useEffect(() => {
    setLiveCategories(data.categories);
  }, [data.categories]);

  const seriesById = useMemo(
    () => new Map(liveCategories.map((c) => [c.id, c])),
    [liveCategories],
  );

  const active = seriesById.get(selectedId) ?? liveCategories[0]!;
  const cash = cashTotal(data.accounts);
  const debt = debtTotal(data.accounts);
  const netWorth = cash != null && debt != null ? cash - debt : null;
  const moreSelected = MORE_SPENDING_CATEGORIES.some((c) => c.id === selectedId);
  const moreLabel =
    MORE_SPENDING_CATEGORIES.find((c) => c.id === selectedId)?.label ?? "More categories…";

  const fetchDrillDown = useCallback(
    async (month: string, categoryId: SpendingHomeCategoryId, merchant: string | null) => {
      setDrillLoading(true);
      try {
        const params = new URLSearchParams({ categoryId, month });
        if (merchant) params.set("merchant", merchant);
        const res = await fetch(`/api/ops/finance/spending/drill-down?${params.toString()}`);
        const json = (await readOpsJsonResponse(res)) as {
          drillDown: SpendingDrillDownData;
        };
        setDrillDown(json.drillDown);
      } catch {
        setDrillDown(null);
      } finally {
        setDrillLoading(false);
      }
    },
    [],
  );

  const handleBarClick = useCallback(
    (month: string) => {
      setSelectedMonth(month);
      setMerchantFilter(null);
      void fetchDrillDown(month, selectedId, null);
    },
    [fetchDrillDown, selectedId],
  );

  const handleCategoryChange = useCallback(
    (id: SpendingHomeCategoryId) => {
      setSelectedId(id);
      if (selectedMonth) {
        setMerchantFilter(null);
        void fetchDrillDown(selectedMonth, id, null);
      }
    },
    [fetchDrillDown, selectedMonth],
  );

  const handleMerchantFilter = useCallback(
    (merchant: string | null) => {
      setMerchantFilter(merchant);
      if (selectedMonth) {
        void fetchDrillDown(selectedMonth, selectedId, merchant);
      }
    },
    [fetchDrillDown, selectedId, selectedMonth],
  );

  const applySeriesRefresh = useCallback(
    (series: SpendingSeriesRefresh) => {
      setLiveCategories((prev) =>
        prev.map((cat) =>
          cat.id === selectedId
            ? {
                ...cat,
                months: series.months,
                monthlySpend: series.monthlySpend,
                ytdSpend: series.ytdSpend,
                averageMonthly: series.averageMonthly,
              }
            : cat,
        ),
      );
    },
    [selectedId],
  );

  const handleDrillUpdated = useCallback(
    (series: SpendingSeriesRefresh, next: SpendingDrillDownData | null) => {
      applySeriesRefresh(series);
      setDrillDown(next);
    },
    [applySeriesRefresh],
  );

  return (
    <div className="ops-finance-spend" aria-label="Finance overview">
      <section className="ops-finance-spend__snapshot" aria-label="Money snapshot">
        <div className="ops-finance-spend__snapshot-item">
          <span>Cash on hand</span>
          <strong>{fmt(cash)}</strong>
        </div>
        <div className="ops-finance-spend__snapshot-item">
          <span>Total owed</span>
          <strong>{fmt(debt)}</strong>
        </div>
        <div className="ops-finance-spend__snapshot-item ops-finance-spend__snapshot-item--net">
          <span>Net worth</span>
          <strong>{netWorth != null ? fmt(netWorth) : "—"}</strong>
        </div>
      </section>

      <section className="ops-finance-spend__hero" aria-labelledby="finance-spending-heading">
        <div className="ops-finance-spend__metrics">
          <div className="ops-finance-spend__metric">
            <span>Current Month Spend</span>
            <strong>{fmt(active.monthlySpend)}</strong>
          </div>
          <div className="ops-finance-spend__metric">
            <span>YTD Spend</span>
            <strong>{fmt(active.ytdSpend)}</strong>
          </div>
          <div className="ops-finance-spend__metric">
            <span>Average Monthly Spend</span>
            <strong>{fmt(active.averageMonthly)}</strong>
          </div>
        </div>

        <div className="ops-finance-spend__filters" role="toolbar" aria-label="Spending categories">
          {PRIMARY_SPENDING_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`ops-finance-spend__filter ${selectedId === cat.id ? "ops-finance-spend__filter--active" : ""}`}
              aria-pressed={selectedId === cat.id}
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.label}
            </button>
          ))}
          <label className="ops-finance-spend__more-select">
            <span className="visually-hidden">More categories</span>
            <select
              className={`ops-finance-spend__filter ops-finance-spend__filter--more ${moreSelected ? "ops-finance-spend__filter--active" : ""}`}
              value={moreSelected ? selectedId : ""}
              onChange={(e) => {
                const id = e.target.value as SpendingHomeCategoryId;
                if (id) handleCategoryChange(id);
              }}
            >
              <option value="">{moreSelected ? moreLabel : "More…"}</option>
              {MORE_SPENDING_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <FinanceSpendingChart
          months={active.months}
          categoryLabel={active.label}
          periodLabel={data.periodLabel}
          selectedMonth={selectedMonth}
          onBarClick={handleBarClick}
        />

        {selectedMonth ? (
          <FinanceSpendingMonthPanel
            chartCategoryId={selectedId}
            chartCategoryLabel={active.label}
            month={selectedMonth}
            initial={drillDown}
            loading={drillLoading}
            merchantFilter={merchantFilter}
            onMerchantFilter={handleMerchantFilter}
            onClose={() => {
              setSelectedMonth(null);
              setDrillDown(null);
              setMerchantFilter(null);
            }}
            onUpdated={handleDrillUpdated}
          />
        ) : null}
      </section>

      <section className="ops-finance-spend__accounts" aria-labelledby="finance-accounts-heading">
        <h2 id="finance-accounts-heading" className="ops-finance-spend__accounts-title">
          Accounts
        </h2>
        <div className="ops-finance-spend__account-table-wrap">
          <table className="ops-finance-spend__account-table">
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">Balance</th>
                <th scope="col">Last Statement</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((acct) => {
                const status = accountStatus(acct);
                return (
                  <tr key={acct.slug}>
                    <td>
                      <Link href={institutionAccountHref(acct.slug as InstitutionAccountSlug)}>
                        {acct.name}
                      </Link>
                    </td>
                    <td
                      className={
                        acct.kind === "liability" ? "ops-finance-spend__balance--debt" : undefined
                      }
                    >
                      {fmt(acct.balance)}
                    </td>
                    <td>{acct.balance != null ? statementLabel(acct.asOfDate) : "—"}</td>
                    <td className={status.ok ? "ops-finance-spend__status--ok" : "ops-finance-spend__status--warn"}>
                      {status.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
