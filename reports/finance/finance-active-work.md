# Finance Active Work Report

Generated after review-count correction and merchant workload cleanup.

## True Active Workload

| Metric | Count |
|--------|------:|
| Transactions awaiting review (badge) | **1** |
| Merchants needing action | **1** |
| Merchant | Checking (NEBAT, 2025-01-10, $240) |

Prior state: Review badge **526** → **3** → **1** after subcategory backfill + stale-status cleanup.

## Merchant Workload Metrics

| Metric | Count |
|--------|------:|
| Total merchants (lifetime) | 369 |
| **Needs action** | **1** |
| Active in 2026 | 76 |
| With rules | 123 |
| Without rules | 246 |
| Historical (last txn before 2026) | 293 |
| Stale unassigned expenses | 0 |

**Needs action definition:** merchant has at least one expense transaction where `account_id IS NULL` and `review_status = 'pending'`.

Query: `queryMerchantWorkloadMetrics()` / `countMerchantsNeedingAction()` in `lib/ops/finance/db/merchants.ts`.

## Amazon 27 — Stale Data Analysis

| Field | Value |
|-------|-------|
| Count | 27 expense transactions |
| Merchant key | `amazon` (consolidated row) |
| Date range | 2020-01-07 → 2023-02-05 |
| Source | `amazon` (import id 1, workbook seed) |
| `review_status` | `approved` (all 27) |
| `account_id` | NULL (all 27, before cleanup) |
| `subcategory` | `inventory` (lowercase) |

### Why approved but unassigned

1. Workbook/Amazon seed imported rows with `subcategory = "inventory"` and legacy `review_status` of `auto`/`manual`.
2. Phase 3 migration normalized those to `approved`.
3. Phase 4 backfill matched `subcategory = a.name` **case-sensitively** — `"inventory"` ≠ `"Inventory"` — so `account_id` was never set.
4. Amazon rule exists (`merchant_pattern: amazon` → Inventory account) but only applies on new categorization, not retroactively.

### Cleanup performed

Case-insensitive subcategory → account backfill (`docs/migrations/finance-active-work-cleanup.sql`):

- **29 rows** updated (`inventory` → Inventory, plus `OFFICE` → Office, `Music ` → Music)
- Amazon stale count: **27 → 0**
- `staleUnassignedExpenses` merchant metric: **27 → 0**

## Data Corrections Performed

### 1. Stale review status (prior sprint)

```sql
UPDATE finance_transactions
SET review_status = 'approved', updated_at = now()
WHERE account_id IS NOT NULL AND review_status = 'pending';
```

523 rows (historical workbook rows with accounts but stuck pending).

### 2. Subcategory case backfill (this sprint)

```sql
UPDATE finance_transactions t
SET account_id = a.id, subcategory = a.name, updated_at = now()
FROM finance_accounts a
WHERE t.account_id IS NULL AND t.subcategory IS NOT NULL
  AND lower(trim(t.subcategory)) = lower(trim(a.name))
  AND a.merged_into_id IS NULL;
```

29 rows.

### 3. Post-backfill stale pending

2 rows (Intuit, Rockville Audio) — gained `account_id` from backfill but remained `pending`; approved in second pass.

## Merchant Review Filter Change

**Smallest useful change (implemented):** default to Needs Action filter.

| Before | After |
|--------|-------|
| `/ops/finance/merchants` shows 300 lifetime merchants | Shows **1** merchant needing action |
| `?pending=1` required | Default; `?pending=0` shows lifetime table |

No page rename, no layout change.

## Recommendation

| Priority | Filter | Merchants | Use |
|----------|--------|----------:|-----|
| **Default** | Needs action (`pending≠0`) | 1 | Daily inbox |
| Optional | `?pending=0` | 369 | Lifetime reference |
| Future | Active 2026 | 76 | Post-import vendor sweep |
| Avoid as default | Rule missing | 246 | Maintenance backlog |

## Files Modified

- `lib/ops/finance/db/merchants.ts` — `queryMerchantWorkloadMetrics()`, `countMerchantsNeedingAction()`
- `app/ops/finance/merchants/page.tsx` — default `pendingOnly` when `pending !== "0"`
- `docs/migrations/finance-active-work-cleanup.sql` — subcategory backfill SQL
- `tools/finance/correct-stale-review-status.ts` — `--subcategory-backfill` flag + workload metrics

## Risks / Edge Cases

1. **Subcategory typos** (`Music ` with trailing space) — fixed by trim + case-insensitive match; typos that don't match any account remain unassigned.
2. **Intuit/Rockville** — auto-assigned via subcategory backfill; may not match user's intended workbook account (Office/Music vs Tax Return/Lighting Eq).
3. **Checking** — only remaining action item; NEBAT transfer with no account mapping.
4. **Lifetime table** — still capped at 300 rows; 69 merchants hidden unless `?pending=0`.
