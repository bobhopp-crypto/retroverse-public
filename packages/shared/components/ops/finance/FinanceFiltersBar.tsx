"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import {
  FINANCE_CATEGORY_OPTIONS,
  FINANCE_FILTER_PRESETS,
  FINANCE_SOURCE_OPTIONS,
  filtersToSearchParams,
  parseFinanceFilters,
  type FinanceCategoryFilter,
  type FinanceFilters,
  type FinanceSourceFilter,
} from "@/lib/ops/finance/finance-filters";
import { FINANCE_PERIODS, type FinancePeriod } from "@/lib/ops/finance/finance-model";

const TIME_OPTIONS: { id: FinancePeriod | "custom"; label: string }[] = [
  ...FINANCE_PERIODS,
  { id: "custom", label: "Custom Date Range" },
];

export function FinanceFiltersBar() {
  const router = useRouter();
  const params = useSearchParams();
  const filters = useMemo(
    () => parseFinanceFilters(Object.fromEntries(params.entries())),
    [params],
  );

  const [customFrom, setCustomFrom] = useState(filters.from ?? "");
  const [customTo, setCustomTo] = useState(filters.to ?? "");

  const pushFilters = useCallback(
    (next: FinanceFilters) => {
      const qs = filtersToSearchParams(next).toString();
      router.push(qs ? `/ops/finance?${qs}` : "/ops/finance");
    },
    [router],
  );

  const onPeriodChange = (period: FinancePeriod | "custom") => {
    if (period === "custom") {
      pushFilters({ ...filters, period: "custom", from: customFrom || null, to: customTo || null });
      return;
    }
    pushFilters({ ...filters, period, from: null, to: null });
  };

  const toggleSource = (source: FinanceSourceFilter) => {
    const next = filters.sources.includes(source)
      ? filters.sources.filter((s) => s !== source)
      : [...filters.sources, source];
    pushFilters({ ...filters, sources: next });
  };

  const toggleCategory = (category: FinanceCategoryFilter) => {
    const next = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    pushFilters({ ...filters, categories: next });
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return;
    pushFilters({ ...filters, period: "custom", from: customFrom, to: customTo });
  };

  const periodValue = filters.period === "custom" ? "custom" : filters.period;

  return (
    <div className="ops-finance__filters" aria-label="Finance filters">
      <div className="ops-finance__filters-row">
        <div className="ops-finance__filter-group">
          <label className="ops-finance__filter-label" htmlFor="finance-time">
            Time
          </label>
          <select
            id="finance-time"
            className="ops-finance__filter-select"
            value={periodValue}
            onChange={(e) => onPeriodChange(e.target.value as FinancePeriod | "custom")}
          >
            {TIME_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {periodValue === "custom" ? (
          <div className="ops-finance__filter-group ops-finance__filter-group--custom">
            <label className="ops-finance__filter-label" htmlFor="finance-from">
              From
            </label>
            <input
              id="finance-from"
              type="date"
              className="ops-finance__filter-input"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <label className="ops-finance__filter-label" htmlFor="finance-to">
              To
            </label>
            <input
              id="finance-to"
              type="date"
              className="ops-finance__filter-input"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
            <button type="button" className="ops-finance__filter-apply" onClick={applyCustomRange}>
              Apply
            </button>
          </div>
        ) : null}
      </div>

      <div className="ops-finance__filters-row">
        <div className="ops-finance__filter-group ops-finance__filter-group--chips">
          <span className="ops-finance__filter-label">Source</span>
          <div className="ops-finance__chip-row">
            {FINANCE_SOURCE_OPTIONS.map((opt) => {
              const active = filters.sources.length === 0 || filters.sources.includes(opt.id);
              const selected = filters.sources.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`ops-finance__filter-chip ${selected ? "ops-finance__filter-chip--on" : active && filters.sources.length === 0 ? "ops-finance__filter-chip--all" : ""}`}
                  onClick={() => toggleSource(opt.id)}
                  aria-pressed={selected}
                >
                  {opt.label}
                </button>
              );
            })}
            {filters.sources.length > 0 ? (
              <button
                type="button"
                className="ops-finance__filter-chip ops-finance__filter-chip--clear"
                onClick={() => pushFilters({ ...filters, sources: [] })}
              >
                All Sources
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ops-finance__filters-row">
        <div className="ops-finance__filter-group ops-finance__filter-group--chips">
          <span className="ops-finance__filter-label">Category</span>
          <div className="ops-finance__chip-row">
            {FINANCE_CATEGORY_OPTIONS.map((opt) => {
              const selected = filters.categories.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`ops-finance__filter-chip ${selected ? "ops-finance__filter-chip--on" : ""}`}
                  onClick={() => toggleCategory(opt.id)}
                  aria-pressed={selected}
                >
                  {opt.label}
                </button>
              );
            })}
            {filters.categories.length > 0 ? (
              <button
                type="button"
                className="ops-finance__filter-chip ops-finance__filter-chip--clear"
                onClick={() => pushFilters({ ...filters, categories: [] })}
              >
                All Categories
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ops-finance__presets">
        <span className="ops-finance__filter-label">Quick presets</span>
        <div className="ops-finance__chip-row">
          {FINANCE_FILTER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="ops-finance__preset-btn"
              onClick={() => pushFilters(preset.apply(filters))}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
