# Finance Phase 5 — Ledger, Merchant View, NEBAT Import

**Date:** 2026-06-15  
**Goal:** Personal QuickBooks replacement — spreadsheet ledger, merchant-level review, NEBAT PDF import

---

## Summary

| Area | Status |
|------|--------|
| Spreadsheet ledger | `/ops/finance/ledger` |
| Merchant review | `/ops/finance/merchants` + detail |
| Review queue refactor | Merchant-grouped (not per-row buttons) |
| NEBAT PDF import | `/ops/finance/import/nebat` |
| Workbook accounts everywhere | `finance_accounts` dropdowns |
| Transfer exclusion | `flow_kind = transfer` excluded from spend |
| Dashboard income label | Actual imported / Baseline / Blended |

---

## Routes

| Route | Purpose |
|-------|---------|
| `/ops/finance/ledger` | Transaction register (sort, filter, inline edit, bulk) |
| `/ops/finance/merchants` | Merchant summary table |
| `/ops/finance/merchants/[merchantKey]` | Merchant detail + apply rules |
| `/ops/finance/import/nebat` | NEBAT checking + mortgage PDF upload |
| `/ops/finance/review` | Merchant-grouped review (link to Merchant Review) |

**API:**
- `GET/PATCH /api/ops/finance/ledger`
- `GET/POST /api/ops/finance/merchants`
- `POST /api/ops/finance/import-nebat`

---

## Schema (`docs/migrations/finance-phase5.sql`)

**New columns on `finance_transactions`:**
- `tax_treatment`
- `notes`
- `rule_id`

**New tables:**
- `finance_merchant_profiles` — mixed flag, suggested account
- `finance_nebat_statements` — checking statement metadata
- `finance_mortgage_statements` — loan payment breakdown

**New accounts (NEBAT classification):**
- Social Security, SSM Health, Transfer - Apple Card Payment, Mortgage, Transfer - PayPal, PayPal, Tax Refund, Deposit - Needs Review

**Flow kinds:** `expense` | `income` | `transfer`  
Transfers excluded from dashboard spend totals (`buildFilterSql` uses `flow_kind = expense`).

---

## Ledger

Columns: Date, Merchant, Description, Source, Account, Amount, Flow, Importance, Tax Treatment, Rule, Notes

Features:
- Sort: date, merchant, amount, account
- Filter: year, source, account, merchant, search
- Inline edit: account, importance, tax, notes
- Bulk select + bulk account + bulk rule
- Shows income, expense, and transfer rows

---

## Merchant Review

**List** (`/ops/finance/merchants`):
- One row per merchant (not 50 repeated blocks)
- Transaction count, total spend, first/last seen, rule, suggested account
- Assign account + rule from row

**Detail** (`/ops/finance/merchants/[merchantKey]`):
- Summary, account dropdown, importance, tax treatment
- Mixed merchant toggle
- Apply: existing only | future only | existing + future + rule
- Transaction table for merchant

**Review queue** refactor:
- Groups by merchant by default
- One account dropdown + Apply / + Rule per merchant
- Sample transactions shown (not full button grid)
- Mixed merchants (Amazon, Kwik Trip, PayPal): transaction-level account picker

---

## NEBAT PDF Parser

**File:** `lib/ops/finance/parsers/nebat-pdf.ts`

### Checking statements
Extracts: statement dates, account masked, balances, debits/credits with descriptions.

**Test:** `data/finance-imports/20/GetDocument-5.pdf`

| Date | Flow | Amount | Account | Description |
|------|------|-------:|---------|-------------|
| 2026-01-30 | income | $824.61 | SSM Health | AGNESIAN HEALTHC PAYROLL |
| 2026-02-02 | expense | $581.06 | Mortgage | AUTOMATIC LOAN PAY |
| 2026-02-11 | income | $1,689.00 | Social Security | SSA TREAS 310 XXSOC SEC |
| 2026-01-21 | transfer | $2,500.00 | Transfer - Apple Card Payment | APPLECARD GSBANK PAYMENT |

### Mortgage statements
**Test:** `data/finance-imports/25/GetDocument.pdf`

| Field | Value |
|-------|------:|
| Statement date | 2026-05-21 |
| Amount due | $724.31 |
| Principal | $121.41 |
| Interest | $131.55 |
| Escrow | $471.35 |
| Outstanding principal | $52,621.90 |
| Interest rate | 3.0% |
| Maturity | 2050-11-01 |

### Dedupe test
- First import: **9 inserted**
- Re-import same PDF: **9 skipped** (dedupe by statement period + date + amount + description)

---

## Classification rules (NEBAT)

| Pattern | Account | Flow | Tax |
|---------|---------|------|-----|
| SSA TREAS 310 XXSOC SEC | Social Security | income | Personal Income |
| AGNESIAN HEALTHC PAYROLL | SSM Health | income | W-2 Income |
| APPLECARD GSBANK PAYMENT | Transfer - Apple Card Payment | transfer | — |
| AUTOMATIC LOAN PAY | Mortgage | expense | Personal |
| PAYPAL INST XFER | Transfer - PayPal | transfer | — |
| IRS / WI DEPT REVENUE | Tax Refund | income | Personal Income |
| Deposit Mobile | Deposit - Needs Review | income | review required |

---

## Dashboard

- Money In source labeled: **Actual imported** | **Baseline estimate** | **Blended**
- Transfers do not inflate spending
- Apple Card payments from NEBAT import as `transfer`, not expense

---

## Files

| Area | Path |
|------|------|
| Migration | `docs/migrations/finance-phase5.sql` |
| NEBAT parser | `lib/ops/finance/parsers/nebat-pdf.ts` |
| NEBAT import | `lib/ops/finance/import-nebat-service.ts` |
| Merchants DB | `lib/ops/finance/db/merchants.ts` |
| Ledger query | `lib/ops/finance/db/transactions.ts` (`queryLedger`) |
| Test | `tools/finance/test-nebat-pdf.ts` |

---

## Checkpoints

```bash
# Parser only
npx tsx tools/finance/test-nebat-pdf.ts data/finance-imports/20/GetDocument-5.pdf

# Full import (Postgres)
RETROVERSE_OPS=1 npx tsx -e "..."  # see test run in report
```

Open:
- `/ops/finance/ledger`
- `/ops/finance/merchants?pending=1`
- `/ops/finance/import/nebat`

---

## Known limitations

- Ledger screenshots not captured in this session (run dev server + Playwright if needed)
- Mortgage transaction activity line parsing is basic (statement header fields are reliable)
- Merchant suggested account uses MODE() of categorized rows — no ML
- `finance_categories` table still exists but unused in UI
