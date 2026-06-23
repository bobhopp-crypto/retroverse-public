# Finance Drill-Down & Category Correction Pass

**Date:** 2026-06-16

## Routes added

| Route | Purpose |
|-------|---------|
| `GET/POST /api/ops/finance/spending/drill-down` | Month/category drill-down + inline recategorize |
| `/ops/finance/reports/category-audit` | Category audit + misclassification flags |

## Components added

| Component | Role |
|-----------|------|
| `FinanceSpendingMonthPanel` | Month detail panel below chart |
| `FinanceCategoryAuditClient` | Category audit page UI |

## Lib modules added

| Module | Role |
|--------|------|
| `spending-month.ts` | Parse chart month labels (`May 26` → date range) |
| `spending-category-edit.ts` | Category dropdown options + assign API |
| `load-spending-drill-down.ts` | Drill-down data + series refresh |
| `load-category-audit.ts` | Audit sections + misclassification heuristics |

## Modified

- `FinanceSpendingChart` — clickable bars
- `FinanceSpendingHome` — live series state, month panel
- `finance-ops.css` — month panel, merchant rollup, audit styles
- `reports/page.tsx` — Category Audit link

## Screenshots

`reports/finance/ux-pass/` (re-capture: `RETROVERSE_OPS=1 npx tsx tools/finance/capture-finance-ux-pass.ts`)

- `home-utilities-may-drill-desktop.png` — Utilities bar click → month panel
- `category-audit-desktop.png` — audit route

## Example category edit workflow

1. Open `/ops/finance`
2. Click **Utilities** category button
3. Click **Apr 26** bar ($949)
4. Panel shows: total, count, top merchants, transaction table
5. Click **City Fdl Water Utility** in merchant list → filters table
6. Change row **Category** dropdown from Utilities → Home (or Insurance)
7. Chart bar and YTD totals update immediately (no page reload)

## Utilities spending — transactions driving totals

**YTD 2026:** $3,345.32

| Month | Total | Transactions |
|-------|------:|--------------|
| Jan 26 | $930.85 | Alliant Energy $285.83, $283.00 · Spectrum $75 · Verizon $287.02 |
| Feb 26 | $219.99 | (see chart drill-down) |
| Mar 26 | $765.44 | Alliant $240 + $283 · Verizon $139.99 · TracFone $22.45 · Spectrum $80 |
| Apr 26 | $949.11 | Alliant $240 · Verizon $139.99 · Spectrum $80 · **City Fdl Water Utility $489.12** |
| May 26 | $479.93 | Alliant $240 · Verizon $139.93 · Spectrum $100 |

**Likely review:** April **City Fdl Water Utility $489.12** — large single line; may belong under Home or a dedicated water account rather than Utilities.

**Misclassification flags** surface on `/ops/finance/reports/category-audit` (utilities > $500/month, Amazon filed as Gas, Home Depot filed as Insurance).
