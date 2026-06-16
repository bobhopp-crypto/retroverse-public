# Finance Phase 1 — Implementation Report

**Date:** 2026-06-15  
**Route:** `/ops/finance`  
**Status:** Built locally — **not deployed** (review first)

---

## What shipped

| Deliverable | Path |
|-------------|------|
| Route | `app/ops/finance/page.tsx` |
| Styles | `app/ops/finance/finance-ops.css` |
| Loader | `lib/ops/finance/load-finance-dashboard.ts` |
| Types | `lib/ops/finance/types.ts` |
| UI | `components/ops/finance/FinanceDashboard.tsx` |
| Snapshot generator | `tools/generate-finance-snapshot.py` |
| Screenshot tool | `tools/finance/capture-finance-dashboard.ts` |
| Data snapshot | `reports/finance-snapshot.json` |
| Screenshot | `reports/finance/finance-dashboard-phase1.png` |

**Ops Home link:** Finance card added in Tools + topbar link on `/ops`.

---

## Architecture

```
2021-2026 Financial Workbook.xlsx  (read-only, external path)
        │
        ▼
tools/generate-finance-snapshot.py
        │
        ▼
reports/finance-snapshot.json  (committed snapshot)
        │
        ▼
lib/ops/finance/load-finance-dashboard.ts
  · loads snapshot
  · auto-refreshes if workbook mtime > snapshot mtime (python3 + openpyxl)
        │
        ▼
app/ops/finance → FinanceDashboard.tsx
```

**No workbook writes.** No transaction import UI. No edit flows.

---

## Dashboard sections (Phase 1)

| Section | Source | Notes |
|---------|--------|-------|
| **AI spend** (hero) | Apple Card AI categories + vendor text | $171/mo YTD, run rate, tool chips, status |
| **Retroverse spend** (hero) | Ops cats + Amazon equip accounts | $394/mo YTD pace, gear YTD, hosting |
| Money in | NEBAT deposits (excl. one-time) | ~$3,101/mo est |
| Required bills | Utilities + home loan + insurance | ~$1,093/mo |
| Apple Card | Positive purchases excl. payments | $17,343 YTD |
| Amazon detail | AMAZON sheet only | Not added to Apple total |
| Cash flow snapshot | 12-month NEBAT in vs card+withdrawals out | NEBAT balance |
| Subscriptions | Normalized recurring vendors | Top 5 + overflow count |
| Top categories | Apple Card ranked | Top 10 with bars |
| Review needed | AI overlap, streaming, Amazon volume, GPU hint | Plain-language flags |

**Status labels:** Healthy · Watch · Review · Problem

---

## Key numbers (current snapshot)

| Metric | Value | Status |
|--------|------:|--------|
| AI spend | $171/mo · $2,056/yr run rate | Review |
| Retroverse ops | $394/mo · $4,730/yr pace | Watch |
| Money in | $3,101/mo | Healthy |
| Required bills | $1,093/mo | Healthy |
| Apple Card YTD | $17,343 | Watch |
| NEBAT balance | $3,593 | — |

---

## Regenerate data

```bash
# Refresh snapshot from workbook (requires openpyxl)
python3 tools/generate-finance-snapshot.py

# Optional: custom workbook path
python3 tools/generate-finance-snapshot.py "/path/to/workbook.xlsx"

# Or set env for auto-refresh on page load
export FINANCE_WORKBOOK_PATH="/Users/bobhopp/FINANCIAL/2021-2026 Financial Workbook.xlsx"
```

---

## Run locally

```bash
RETROVERSE_OPS=1 npm run dev
```

Open `/ops/finance` (PIN gate: `/internal/ops-pin` if needed).

**Screenshot:**

```bash
RETROVERSE_OPS=1 npx tsx tools/finance/capture-finance-dashboard.ts
```

---

## Phase 2 (not built)

- Drill-down routes (`/ops/finance/subscriptions`, etc.)
- Period selector (month / YTD / 12 mo)
- Apple Card balance input
- Gitignored live cache vs committed snapshot split
- Vendor normalization cleanup in workbook (ChatGPT dual tags)

---

## Known limitations

1. **Income YTD** reflects NEBAT deposits tagged 2026 — may under-report if payroll posts differently.
2. **Cash flow** shows $0 income in recent months when NEBAT deposits aren't logged yet for those months.
3. **Amazon sheet** stops Jan 2026 — refresh workbook Amazon tab when updated.
4. **Auto-refresh** requires `python3` + `openpyxl` on the host; otherwise uses committed JSON.
5. **Subscription total** includes software subs; one-time purchases >$120 filtered out.

---

*Read-only Phase 1 complete. Review screenshot before deploy.*
