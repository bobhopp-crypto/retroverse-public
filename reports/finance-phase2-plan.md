# Finance Phase 2 — Retirement-First Plan

**Date:** 2026-06-15  
**Route:** `/ops/finance`  
**Status:** Local implementation complete · not deployed · not committed

---

## Executive Summary

Finance Home is repositioned from a spending report to a **retirement planning system**. Phase 2 fixes incorrect Money In / Required Bills numbers, adds a Retirement Simulator, Tax/401(k) placeholders, transaction importance scoring, and documents the import architecture.

---

## 1. Audit — Why Numbers Were Wrong

### Money In (~$4,063/mo expected → showed $0 on Postgres)

| Root cause | Detail |
|---|---|
| **Sign mismatch** | Income query used `amount < 0`; all parsers store **positive** amounts |
| **NEBAT deposits skipped** | `parseNebatCsv` read Deposits column but never imported it |
| **No income category** | Income was not modeled as categories in `finance_categories` |
| **Postgres vs snapshot split** | Any imported spend triggers Postgres path; workbook income (~$3,101/mo snapshot) disappeared |

**Fix applied:**
- Added `flow_kind` column (`expense` \| `income`) on `finance_transactions`
- NEBAT parser now imports deposits as `flow_kind = 'income'` with income category slugs
- Income queries use `flow_kind = 'income'` instead of negative amounts
- **Retirement baseline** (`lib/ops/finance/retirement-profile.ts`) used when imported income is missing or undercounts:

| Stream | Monthly |
|---|---|
| Social Security | $1,715 |
| SSM Health ($822.19 biweekly) | $1,781.19 |
| Funeral Home | $400 |
| DJ / Other | $167 |
| **Total** | **$4,063.19** |

### Required Bills (~$1,212/mo expected → undercounted)

| Root cause | Detail |
|---|---|
| **Category dependency** | Bills only counted if tagged `utilities` or `home` in Postgres |
| **Seed gap** | Workbook subcategories (Power and Light, Gas, Home Loan) not always mapped |
| **Review queue** | Uncategorized utility charges excluded from bills widget |

**Fix applied:**
- Baseline floor in `REQUIRED_BILL_LINES`:

| Bill | Monthly |
|---|---|
| Mortgage | $724.31 |
| Power / Gas | $240 |
| Water | $60 |
| Internet | $50 |
| Cell | $138 |
| **Total** | **$1,212.31** |

- Dashboard uses `max(baseline, categorized transactions)` when DB undercounts
- Notes surface when baseline vs transactions diverge

---

## 2. Data Model Changes

### Migration: `docs/migrations/finance-phase2.sql`

```sql
ALTER TABLE finance_transactions ADD flow_kind text DEFAULT 'expense';
ALTER TABLE finance_transactions ADD importance text;
ALTER TABLE finance_categories ADD default_importance text;
```

**New categories:** `income`, `income-social-security`, `income-ssm-health`, `income-funeral-home`, `income-dj`, `business`, `shopping`

**Importance defaults on categories:**
- `required` — home, utilities, medical
- `useful` — AI, grocery, retroverse core
- `optional` — restaurants, personal, hosting
- `luxury` — amazon, shopping, gift, equipment

### New modules

| File | Purpose |
|---|---|
| `lib/ops/finance/retirement-profile.ts` | Canonical income + bill baselines |
| `lib/ops/finance/retirement-simulator.ts` | Surplus + scenario math + tax estimates |
| `lib/ops/finance/finance-importance.ts` | Required/Useful/Optional/Luxury framework |
| `lib/ops/finance/finance-import-architecture.ts` | Import pipeline design (no OCR) |

---

## 3. Retirement Simulator

**UI:** `FinanceRetirementSimulator` on `/ops/finance`

Shows:
- Current income, required bills, discretionary, AI + Retroverse
- Monthly / annual surplus
- Three scenarios:

| Scenario | Income streams |
|---|---|
| **A — Retire today** | SS + SSM ($3,496/mo) |
| **B — Keep funeral home** | A + funeral ($3,896/mo) |
| **C — DJ occasionally** | A + DJ ($3,663/mo) |

Expenses held constant from current filtered spending profile.

Downsizing potential calculated from optional + luxury spend.

---

## 4. Import Architecture (design only)

```
Drop file → Import Queue → Parser → Transaction Store → Review Queue → Rules Engine
```

| Component | Table / route |
|---|---|
| Import Queue | `finance_imports` + `/ops/finance/import` |
| Transaction Store | `finance_transactions` |
| Review Queue | `review_status = 'review'` + `/ops/finance/review` |
| Rules | `finance_rules` + categorize API |

**Future OCR:** NEBAT PDFs stored today; CSV parsing live; PDF OCR deferred.

Sources: Apple Card CSV, Amazon CSV, NEBAT CSV/PDF, PayPal CSV.

---

## 5. Review Workflow

**Route:** `/ops/finance/review`

Quick-assign buttons updated:
- Retroverse · Household · Shopping · Gift · Business · Utilities · AI · Other

On categorize → rule upserted → future imports auto-match.

Importance auto-set from category default on assign.

---

## 6. Transaction Importance Framework

| Level | Purpose | Downsizing score |
|---|---|---|
| Required | Mortgage, utilities, medical | 0% |
| Useful | AI tools, groceries, core ops | 25% |
| Optional | Dining, hobbies, extra subs | 65% |
| Luxury | Impulse Amazon, gear splurges | 90% |

Stored on `finance_transactions.importance` or inherited from `finance_categories.default_importance`.

Downsizing potential = 50% of optional + 75% of luxury monthly spend.

---

## 7. Tax + 401(k) Planning

**UI:** `FinanceTaxPlanning` placeholder section

- Estimated annual income (from retirement income)
- Federal tax liability (single filer, standard deduction, 2024-style brackets)
- Effective + marginal rate
- 401(k) slider: contribution → tax reduction → net take-home impact

---

## 8. Files Changed

| Area | Files |
|---|---|
| Migration | `docs/migrations/finance-phase2.sql` |
| Core | `retirement-profile.ts`, `retirement-simulator.ts`, `finance-importance.ts`, `finance-import-architecture.ts` |
| DB | `ensure-schema.ts`, `transactions.ts`, `parsers/index.ts`, `finance-filters.ts`, `finance-model.ts` |
| Dashboard | `aggregate-dashboard.ts`, `load-finance-dashboard.ts`, `types.ts` |
| UI | `FinanceDashboard.tsx`, `FinanceRetirementSimulator.tsx`, `FinanceReviewClient.tsx`, `finance-ops.css` |

---

## 9. Next Steps (not in this phase)

1. Re-import NEBAT CSV with deposits to populate `flow_kind = 'income'` rows
2. Map mortgage subcategory rules (Home Loan → `home` + `required`)
3. Snapshot fallback: re-aggregate when filters applied
4. NEBAT PDF OCR pipeline
5. Editable retirement profile in UI (vs code config)
6. 401(k) limits by age, state tax, spouse scenarios

---

## 10. Verification

```bash
# Apply phase 2 migration (auto on first dashboard load if PG connected)
RETROVERSE_OPS=1 npm run dev

# Screenshot
RETROVERSE_OPS=1 npx tsx tools/finance/capture-finance-dashboard.ts
```

**Checkpoint:** `/ops/finance` should show:
- Money In ~$4,063/mo (baseline until deposits imported)
- Required Bills ~$1,212/mo
- Retirement Simulator with 3 scenarios
- Tax planning + 401(k) slider

**Screenshot:** `reports/finance/finance-dashboard-phase2-retirement.png` (capture after dev server running)

---

## Findings Summary

| Question | Answer (after fix) |
|---|---|
| AI spend in 2025? | Filters: 2025 + AI category |
| Retroverse cost 2024? | Filters: 2024 + Retroverse |
| Amazon last year? | Preset: Last Year + Amazon Only |
| Restaurants 2023? | 2023 + Restaurants |
| Subscriptions now? | Last 90 Days → Subscription center |
| Spend excluding Retroverse? | All categories except Retroverse |
| Can I retire today? | Scenario A surplus in Retirement Simulator |
