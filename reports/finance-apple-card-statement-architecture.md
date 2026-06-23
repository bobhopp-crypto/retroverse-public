# Apple Card Statement Architecture

**Date:** 2026-06-16  
**Goal:** Convert Apple Card from transaction-first to statement-first while keeping account-first navigation.

## Canonical model (Jan 2026)

| Field | Value |
|---|---|
| Period | Jan 1–31, 2026 |
| Previous balance | $1,776.45 |
| Ending balance | $1,005.14 |
| Total balance | $2,824.59 |
| Minimum due | $284.91 |
| Due date | Feb 28, 2026 |
| Payments | $3,250.00 |
| Purchases | $2,218.78 |
| Interest | $0.00 |
| Daily Cash | $31.53 |
| Installments remaining | $2,079.36 |

---

## A. Current schema assessment (before Phase 10)

| Layer | Apple Card support |
|---|---|
| `finance_imports` | Transaction imports only; `ending_balance` never populated |
| `finance_transactions` | 259 active rows; payments skipped by CSV parser |
| `finance_institution_accounts` | `manual_balance` columns exist but unused |
| Statement table | **None** — unlike `finance_nebat_statements` / `finance_mortgage_statements` |

**Gap:** No home for statement-level credit card fields. UI fell back to ledger counts and empty balances.

---

## B. Required migration (Phase 10 — implemented)

**File:** `docs/migrations/finance-phase10-apple-card-statements.sql`

**Table:** `finance_apple_card_statements`

| Column | Purpose |
|---|---|
| `statement_period` | Display label ("January 2026") |
| `statement_start` / `statement_end` | Period bounds |
| `previous_balance` | Previous monthly balance |
| `ending_balance` | Statement ending balance |
| `total_balance` | Total balance incl. installments |
| `minimum_due` / `due_date` | Payment obligation |
| `payment_total` / `purchase_total` | Period activity |
| `interest_total` / `daily_cash_total` | Statement summary |
| `monthly_installment_remaining` | Installment balance |
| `raw_import_id` | Optional link to import batch |
| `storage_path` | Statement PDF path |
| `dedupe_key` | `apple-card\|YYYY-MM-DD` |

**Backfill in migration:**
- Jan 2026 — full canonical row
- Dec 2025 — ending $1,776.45 (from Jan previous balance chain)
- Sync `finance_imports` #1 with Jan statement balances
- Set `setup_status = 'statement'` on apple-card account

---

## C. Backfill opportunities

| Source | Usable for statements? |
|---|---|
| Jan 2026 user data | **Yes** — seeded |
| Dec 2025 | Partial — ending only from chain |
| Nov 2025 | **No data** — needs import |
| Existing CSV imports | Transactions only; **no statement metadata** |
| Jan 2026 ledger | 37 purchases / $2,489.12 vs statement $2,218.78 — CSV ≠ statement totals (payments excluded, timing) |

**Recommendation:** Future Apple Card PDF imports should call `upsertAppleCardStatement()` before posting transactions.

---

## D. Routes affected

| Route | Change |
|---|---|
| `/ops/finance/accounts/apple-card` | **Statement-first** layout via `FinanceAppleCardAccount` |
| `/ops/finance/statements/[id]` | **New** — statement detail |
| `/ops/finance/accounts/nebat-checking` | Unchanged (`FinanceAccountDetail`) |
| `/ops/finance` | Apple Card balance from `finance_apple_card_statements` |

---

## E. Components affected

| Component | Role |
|---|---|
| `FinanceAppleCardAccount` | Summary card, history, chart, collapsed txns |
| `FinanceStatementDetail` | Single statement view |
| `FinanceStatementBalanceChart` | Ending-balance trend SVG |
| `FinanceAccountDetail` | Other institution accounts (unchanged) |
| `load-apple-card-account.ts` | Apple-specific loader |
| `load-statement-detail.ts` | Statement detail loader |
| `parsers/apple-card-statement.ts` | Metadata parser abstraction |
| `db/apple-card-statements.ts` | CRUD + upsert |

---

## F. Parser architecture

```
Apple Card import
  ├─ parseAppleCardStatementFromText()  → statement metadata
  └─ parseAppleCardCsv()                → transactions (existing)
```

Statement metadata and transactions are **separate concerns**. CSV import today only handles transactions.

`APPLE_CARD_JAN_2026` constant provides canonical seed without PDF.

---

## G. Estimated effort (remaining)

| Task | Effort |
|---|---|
| Wire PDF import → `upsertAppleCardStatement` | 2–3 hrs |
| Nov 2025 + older statement backfill | 1 hr/statement (manual or PDF) |
| Link transactions to `statement_id` | 2 hrs (optional FK) |
| Payment rows in ledger (currently skipped) | 1–2 hrs |
| Statement PDF storage on import | 1 hr |

**Phase 10 core (this delivery):** ~4–6 hrs — schema, backfill, account page, detail route, chart.

---

## H. Verification checklist

- [ ] Run `ensureFinanceSchema()` or restart dev server (applies phase 10)
- [ ] `/ops/finance/accounts/apple-card` shows $1,005.14 statement balance
- [ ] Statement history lists Jan + Dec 2026
- [ ] Balance history chart shows Dec → Jan trend
- [ ] `/ops/finance/statements/1` (or Jan row id) opens detail
- [ ] Finance Home shows Apple Card $1,005.14
- [ ] Transactions collapsed by default

---

## Architecture principle

```
Account → Statement → Transactions
```

Not `Account → Transactions → Statement`.

NEBAT/mortgage already follow this pattern via native statement tables. Apple Card now has parity.
