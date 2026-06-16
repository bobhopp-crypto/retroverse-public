# Finance Phase 2 — Trends & Subscriptions

**Date:** 2026-06-15  
**Route:** `/ops/finance`  
**Status:** Built locally — read-only, not deployed

---

## What shipped

### 1. AI spend trend
- 12-month bar chart in AI hero panel
- 12-month average
- Annual projection from trailing 12 months
- Tool chips + status badge retained

### 2. Retroverse spend trend
- 12-month bar chart in Retroverse hero panel
- 12-month average
- Annual projection (ops + Amazon equip accounts)

### 3. Subscription center
- Full active subscription table
- Columns: Service · Monthly · Annual · Last charge · Status
- Summary header: active count, monthly total, annual total
- Scrollable table (desktop-first)

### 4. Opportunity panel
- **Largest categories** — top 6 by last 12 months
- **Fastest growing** — % change vs prior 12 months
- **Potential savings** — actionable estimates (AI overlap, trial churn, streaming, Amazon discipline)

### 5. Still read-only
- No transaction editing
- No budgeting workflows
- No accounting features

---

## Files changed

| File | Change |
|------|--------|
| `tools/generate-finance-snapshot.py` | Trends, active subs, opportunity data |
| `reports/finance-snapshot.json` | Regenerated |
| `lib/ops/finance/types.ts` | Phase 2 types |
| `components/ops/finance/FinanceTrendChart.tsx` | New |
| `components/ops/finance/FinanceDashboard.tsx` | Phase 2 layout |
| `app/ops/finance/finance-ops.css` | Trend, subs table, opportunity styles |
| `tools/finance/capture-finance-dashboard.ts` | Phase 2 screenshot |

---

## Regenerate

```bash
python3 tools/generate-finance-snapshot.py
RETROVERSE_OPS=1 npm run dev
```

Screenshot:

```bash
RETROVERSE_OPS=1 npx tsx tools/finance/capture-finance-dashboard.ts
```

Output: `reports/finance/finance-dashboard-phase2.png`

---

## Sample insights (current snapshot)

| Area | Value |
|------|------:|
| AI 12-mo avg | ~$89/mo |
| AI annual projection | ~$1,068/yr (trailing 12 mo) |
| Retroverse 12-mo avg | ~$180/mo |
| Active subscriptions | 40+ |
| Potential savings flagged | Grok/ChatGPT overlap, AI trials, streaming |

*YTD run rates in hero panels remain higher than 12-mo trailing avg — reflects 2026 AI acceleration.*

---

## Phase 3 (not built)

- Drill-down per subscription vendor
- Period toggle (month / YTD / 12 mo)
- Export snapshot PDF
- Apple Card balance field
