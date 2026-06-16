# Finance Phase 4 — Chart of Accounts

**Date:** 2026-06-15  
**Source of truth:** `/Users/bobhopp/FINANCIAL/2021-2026 Financial Workbook.xlsx` → APPLE sheet column E (Category)

---

## Summary

Phase 4 replaces the invented `finance_categories` slug tree with the **real workbook Chart of Accounts**.

| Item | Result |
|------|--------|
| Unique workbook accounts extracted | **119** |
| `finance_accounts` rows seeded | **119** |
| Review queue categorization | Uses live accounts |
| Merchant rules | Map to `finance_accounts.id` |
| New UI | `/ops/finance/accounts` |

---

## 1. Extraction

**Tool:** `tools/finance/extract-workbook-accounts.py`

Reads APPLE sheet column E, counts usage per category name, outputs JSON with:

- `name` — exact workbook string (e.g. `Power and Light`, `SUB - Netflix`, `AI - Cursor`)
- `slug` — URL-safe derivative
- `workbookTxnCount` — rows tagged in workbook
- `active` — `false` for `Payment`, `Credit`, `Debit`

**Seed:** `tools/finance/seed-finance-accounts.ts` (also auto-runs on first `ensureFinanceSchema()` when table is empty)

---

## 2. Schema

**Migration:** `docs/migrations/finance-phase4.sql`

```sql
finance_accounts (
  id, name, slug, active, merged_into_id,
  workbook_txn_count, created_at, updated_at
)

finance_transactions.account_id → finance_accounts
finance_rules.account_id → finance_accounts
```

Backfill: existing transactions matched via `subcategory` (workbook category tag) and legacy category slug mapping.

---

## 3. Accounts UI

**Route:** `/ops/finance/accounts`

| Column | Source |
|--------|--------|
| Account name | `finance_accounts.name` |
| Transaction count | Live `finance_transactions` |
| Total spend | Sum of expense rows |
| Workbook rows | `workbook_txn_count` |
| Status | Active / Inactive |

**Actions:**

- **Add account** — manual new account (must be unique name)
- **Rename** — updates name + transaction `subcategory`
- **Merge** — moves transactions + rules to target, disables source
- **Disable** — hides from review quick-picks (inactive)

---

## 4. Review Queue

**Before:** Hardcoded buckets (Retroverse, Household, Shopping, Utilities, AI…)

**After:** Workbook accounts from `finance_accounts`

- **Top accounts** — 14 most-used active accounts (by live txn count / workbook count)
- **All accounts** — searchable list of all 119 active accounts
- **+R** — approve + create merchant rule → `finance_accounts`

Categorize API now requires `accountId` (not `categorySlug`).

---

## 5. Merchant Rules

Rules now store `account_id`. Starter rules seeded:

| Merchant pattern | Account |
|------------------|---------|
| openai, chatgpt | AI - ChatGPT |
| cursor | AI - Cursor |
| grok | AI - Grok |
| netflix | SUB - Netflix |
| spectrum | Internet |
| adobe | Software - Adobe |
| icloud | Software - iCloud |
| amazon | Amazon |
| menards | Home |
| culver | Restaurants |

Example from screenshot: **Spectrum → Internet** (+R on review row clears all Spectrum pending rows).

---

## 6. Top Workbook Accounts (by usage)

| Count | Account |
|------:|---------|
| 634 | Amazon |
| 468 | Personal |
| 417 | Grocery |
| 397 | Restaurants |
| 168 | Gas |
| 149 | Home |
| 73 | Power and Light |
| 69 | Internet |
| 67 | Telephone |
| 65 | Software - iCloud |
| 63 | Software - Adobe |
| 60 | SUB - TV |
| 52 | SUB - YouTube |

Full list: 119 accounts including all `AI - *`, `Software - *`, `SUB - *`, `Web - *` variants exactly as tagged in the workbook.

---

## 7. Import Pipeline Changes

- Apple Card CSV / workbook export → `accountName` from Category column
- Amazon parsers → workbook names (`Amazon`, `Inventory`, `Medical`, `3D Printing`, `Shopping`)
- Dashboard spend breakdown → groups by `finance_accounts.name`

`finance_categories` table remains for legacy compatibility but is **no longer the categorization target**.

---

## 8. Files

| Area | Path |
|------|------|
| Migration | `docs/migrations/finance-phase4.sql` |
| Extract | `tools/finance/extract-workbook-accounts.py` |
| Seed | `tools/finance/seed-finance-accounts.ts` |
| DB | `lib/ops/finance/db/accounts.ts` |
| API | `app/api/ops/finance/accounts/` |
| UI | `app/ops/finance/accounts/page.tsx` |
| Review | `components/ops/finance/FinanceReviewClient.tsx` |

---

## 9. Checkpoint

```bash
# Seed / refresh accounts from workbook
RETROVERSE_OPS=1 npx tsx tools/finance/seed-finance-accounts.ts

# Open
/ops/finance/accounts
/ops/finance/review
```

On review: click **Internet +R** on Spectrum → all Spectrum rows approve to workbook account **Internet**.

---

## 10. Known Follow-ups

- Dashboard filter chips still use legacy bucket names (AI, Retroverse, Utilities) — SQL maps to workbook account names
- `finance_categories` can be dropped in a future cleanup migration once all reports use accounts
- Merge UI shows top 12 targets — use search/filter on accounts page for obscure merges
