# Finance Phase A — Statement Integrity Findings

**Date:** 2026-06-16  
**Scope:** Statement ↔ transaction linkage only (no Home, Amazon, Reports, analytics, subscriptions)

## What changed

### Database (`finance-phase8-statement-integrity.sql`)
- `finance_imports.posted_transaction_count` — persisted after post (staging no longer needed for count)
- `finance_transactions.institution_account_id` — links each transaction to a real account
- Backfill: institution IDs on imports + transactions, posted counts from ledger

### Statement queries (`listInstitutionAccountStatements`)
- Transaction count = **ledger rows** `WHERE raw_import_id = import` (source of truth when posted)
- Falls back to staging count / `posted_transaction_count` when not yet in ledger
- NEBAT native statements count via `raw_import_id` or statement date range
- Junk imports without period/balances filtered out

### Post path (`postImportToLedger`)
- Sets `institution_account_id` on new transactions
- Persists `posted_transaction_count` from live ledger count before clearing staging

### Account UI (minimal, Phase A only)
- Statements show Opening, Ending, Transaction count, Difference
- Transactions show **Statement** column (period from linked import)
- Link to validation report

## Validation results (live DB)

Run: `npx tsx tools/finance/validate-statements.ts`  
UI: `/ops/finance/statement-validation`  
JSON: `reports/finance-statement-validation.json`

| Metric | Value |
|---|---|
| Statements on file | 9 |
| OK | 6 |
| With issues | 3 |

### Fixed: "0 transactions" on May 2026 NEBAT
| Statement | Txns | Ledger | Beginning | Ending | Calculated | Status |
|---|---|---|---|---|---|---|
| May 2026 | **9** | **9** | $2,264.85 | $1,070.14 | $1,070.14 | OK |

Feb–Apr 2026 also reconcile: txn count matches ledger; calculated ending matches statement ending.

### Remaining issues (Phase B scope)

1. **January 2026 NEBAT** — 6 txns linked, but calculated ending ($5,184.21) ≠ statement ending ($3,693.12). Likely wrong txn set on `import_id` or opening balance mismatch. Needs statement-scoped register (Phase B).

2. **December 2025 NEBAT** — 9 txns on import record, 0 in active ledger (pre-2026 rows archived). Expected until we add archived-statement view or historical read path.

3. **Mortgage May 2026** — Principal balance on statement table; no payment transactions in ledger with `raw_import_id`. Mortgage is balance-sheet only today, not a transaction register.

4. **Apple Card** — 259 ledger txns on one import with no `statement_end` period label ("Unknown period"). Needs Apple statement metadata on import.

## Screenshots to capture

1. `/ops/finance/accounts/nebat-checking` — May 2026 row should show **9** transactions (not 0)
2. `/ops/finance/accounts/nebat-checking` — expand Transactions → **Statement** column shows period per row
3. `/ops/finance/statement-validation` — full validation grid

## Not started (Phase B)

- Running balance register
- Debit/credit columns
- Statement detail click-through
- Transfer linking
