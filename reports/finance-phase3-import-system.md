# Finance Phase 3 — Import System

**Date:** 2026-06-16  
**Status:** Local implementation · not deployed · not committed

---

## Goal

Eliminate spreadsheet maintenance. Retroverse becomes the primary finance system via import → rules → review → ledger → retirement analysis.

---

## Architecture

```
/ops/finance/import          CSV Import Center
/ops/finance/import-amazon   Amazon PDF Import
/ops/finance/review          Review Queue
/ops/finance/ledger          Transaction Ledger
/ops/finance                 Dashboard + Retirement Readiness

Drop file → finance_imports → Parser → Rule Engine → finance_transactions
Unknown → review_status=pending → /ops/finance/review → Approve (+ optional rule)
```

### Canonical transaction model (`finance_transactions`)

| Field | Type | Notes |
|---|---|---|
| transaction_id | `id` bigserial | PK |
| source | text | apple_card, amazon, nebat, paypal |
| transaction_date | date | |
| merchant | text | |
| description | text | |
| amount | numeric | Always positive |
| flow_kind | text | `income` \| `expense` |
| category | `category_id` → slug | via `finance_categories` |
| importance | text | required, useful, optional, luxury |
| review_status | text | `pending` \| `approved` |
| created_at / updated_at | timestamptz | |
| dedupe_key | text unique | Duplicate protection |

### Rules (`finance_rules`)

| Pattern | Category | Importance |
|---|---|---|
| openai | AI (ChatGPT) | useful |
| netflix | Entertainment | optional |
| amazon marketplace | Shopping | luxury |

Rules auto-apply on import. `hit_count` increments on match.

### Amazon PDF tables

| Table | Purpose |
|---|---|
| `finance_amazon_orders` | Dedupe by `order_number` |
| `finance_amazon_order_items` | Line items + auto-category |

---

## Routes Built

| Route | Purpose |
|---|---|
| `/ops/finance/import` | CSV import center + history stats |
| `/ops/finance/import-amazon` | Amazon order PDF upload |
| `/ops/finance/review` | Pending transaction categorization |
| `/ops/finance/ledger` | Last 300 transactions |

### Import Center stats

- Last import date
- Transactions added (lifetime sum)
- Transactions updated
- Transactions awaiting review

### Review workflow

Per transaction:
- Category buttons: Retroverse · Household · Shopping · Gift · Business · Utilities · AI · Income · Other
- Importance selector: Required · Useful · Optional · Luxury
- **Approve** — categorize without rule
- **Approve + Rule** — categorize + upsert merchant rule

---

## Retirement integration

### Importance spending (from real transactions)

Dashboard shows monthly averages:
- Required · Useful · Optional · Luxury

### Downsizing scenario

Keep Required + Useful · drop Optional + Luxury → monthly/annual savings

### Retirement Readiness score (0–100)

| Component | Points |
|---|---|
| Retirement income covers required bills | 30 |
| Positive surplus (required + useful) | 25 |
| Required spend < 45% of total | 20 |
| Low optional/luxury share | 15 |
| Review queue < 50 pending | 10 |

### Amazon orders card

- YTD spend from PDF imports
- Spend by category
- Retroverse + 3D printing totals
- Top purchased items

---

## Amazon PDF import

**Route:** `/ops/finance/import-amazon`

**Parser:** `lib/ops/finance/parsers/amazon-pdf.ts` (pdf-parse text extraction)

**Auto-categorization keywords:**

| Category | Examples |
|---|---|
| Retroverse | cardstock, photo paper, epson ink, USB drives, bingo |
| 3D Printing | bearings, magnets, starbond, calipers |
| Health | tums, omeprazole, nizoral |
| Home | curtains, chair mat, smart plugs |
| Shopping | everything else (luxury) |

**Idempotent:** `order_number` unique on orders · `dedupe_key` unique on items

---

## Sample fixtures

`tools/finance/fixtures/`

| File | Source |
|---|---|
| `apple-card-sample.csv` | Apple Card |
| `amazon-sample.csv` | Amazon CSV |
| `paypal-sample.csv` | PayPal |
| `nebat-sample.csv` | NEBAT (deposits + withdrawals) |
| `amazon-order-sample.txt` | Amazon PDF text fixture |

---

## Test workflow

```bash
RETROVERSE_OPS=1 npx tsx tools/finance/test-import-pipeline.ts
```

**Verified (local run):**

| Check | Result |
|---|---|
| OPENAI rule match | ✅ |
| NETFLIX rule match | ✅ |
| Amazon PDF text parse | ✅ 2 orders, 3 items |
| First CSV import | ✅ 9 inserted |
| Second import (duplicate) | ✅ 9 skipped, 0 duplicates |
| Review queue | 935 pending (existing + 1 from nebat fixture) |

---

## Migration

`docs/migrations/finance-phase3.sql`

- `flow_kind`, `importance`, `updated_at` on transactions
- `review_status` normalized to pending/approved
- Import stats columns on `finance_imports`
- `importance` on `finance_rules`
- `finance_amazon_orders` + `finance_amazon_order_items`
- Entertainment category + seeded rules

Auto-applied via `ensureFinanceSchema()`.

---

## Screenshots

Capture (dev server required):

```bash
RETROVERSE_OPS=1 npm run dev
RETROVERSE_OPS=1 npx tsx tools/finance/capture-finance-phase3.ts
```

Outputs:
- `reports/finance/finance-dashboard-phase3.png`
- `reports/finance/finance-import-center-phase3.png`
- `reports/finance/finance-review-queue-phase3.png`
- `reports/finance/finance-ledger-phase3.png`
- `reports/finance/finance-amazon-import-phase3.png`

---

## Key files

| Area | Path |
|---|---|
| Migration | `docs/migrations/finance-phase3.sql` |
| Import service | `lib/ops/finance/import-service.ts` |
| Amazon PDF | `lib/ops/finance/import-amazon-service.ts` |
| Parsers | `lib/ops/finance/parsers/` |
| Rules | `lib/ops/finance/db/rules.ts` |
| Transactions | `lib/ops/finance/db/transactions.ts` |
| Readiness | `lib/ops/finance/retirement-readiness.ts` |
| Test | `tools/finance/test-import-pipeline.ts` |

---

## Not in scope (future)

- OCR for Apple/NEBAT PDF screenshots
- XLSX auto-parse
- Re-parse stored imports UI
- Amazon PDF → `finance_transactions` merge (orders live in separate tables today)

---

## Next steps

1. Drop real NEBAT CSV → income deposits populate `flow_kind=income`
2. Upload Amazon order PDFs at `/ops/finance/import-amazon`
3. Clear review queue — each approve + rule reduces future work
4. Retire spreadsheet once all sources import cleanly
