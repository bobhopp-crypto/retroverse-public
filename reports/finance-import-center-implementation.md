# Finance Import Center — Implementation Report

**Date:** 2026-06-16  
**Routes:** `/ops/finance/import` · `/ops/finance/review` · `/ops/finance` (PG-backed)  
**Status:** Built locally — workbook not modified

---

## Goal

Retroverse Finance becomes the source of truth. Drop exports → parse → categorize once → rules auto-apply.

---

## Database

Migration: `docs/migrations/finance.sql`

| Table | Purpose |
|-------|---------|
| `finance_categories` | AI, Retroverse, Household, Other (+ subcategories) |
| `finance_imports` | Raw import metadata + stored file path |
| `finance_transactions` | Canonical transaction ledger |
| `finance_rules` | Merchant → category rules with confidence |

Registered in `tools/ensure-sunday-nights-state.mjs` for production auto-apply.

---

## Import sources

| Source | CSV parse | PDF / image / XLSX |
|--------|-----------|-------------------|
| Apple Card | ✅ | Stored only (use CSV export) |
| Amazon | ✅ | Stored only |
| PayPal | ✅ | Stored only |
| NEBAT | ✅ | Stored only |

Original files saved under `data/finance-imports/{id}/` — never overwritten.

---

## Workflow

1. **Drop files** — `/ops/finance/import`
2. **Parse** — `POST /api/ops/finance/import`
3. **Auto-categorize** — rules + workbook category hints
4. **Review** — `/ops/finance/review` for unknowns
5. **Learn** — `POST /api/ops/finance/categorize` creates/updates rules

---

## Seed from workbook (one-time)

Read-only import from existing Excel — **workbook untouched**:

```bash
npx tsx tools/finance/seed-from-workbook.ts
```

**Result:** 3,042 transactions inserted · 2,111 auto-categorized · 6 duplicates skipped

---

## Dashboard

`/ops/finance` now prefers **Postgres** when transactions exist.

- Period selector: Lifetime · 2021–2026 · Last 30/90/12 months
- Falls back to `reports/finance-snapshot.json` if PG empty
- Links: Import · Review (count badge)

---

## Key files

| Area | Path |
|------|------|
| Migration | `docs/migrations/finance.sql` |
| Parsers | `lib/ops/finance/parsers/index.ts` |
| Import service | `lib/ops/finance/import-service.ts` |
| Rule engine | `lib/ops/finance/db/rules.ts` |
| Aggregate dashboard | `lib/ops/finance/aggregate-dashboard.ts` |
| Import UI | `components/ops/finance/FinanceImportClient.tsx` |
| Review UI | `components/ops/finance/FinanceReviewClient.tsx` |
| Seed tool | `tools/finance/seed-from-workbook.ts` |

---

## Setup

```bash
# Local Postgres — apply migration once
psql $DATABASE_URL -f docs/migrations/finance.sql

# Seed from workbook (optional, already run)
npx tsx tools/finance/seed-from-workbook.ts

RETROVERSE_OPS=1 npm run dev
```

- Import: `/ops/finance/import`
- Review: `/ops/finance/review`
- Dashboard: `/ops/finance`

---

## Not built (Phase 3)

- PDF text extraction (Apple Card / NEBAT PDFs)
- Screenshot OCR
- XLSX auto-parse (store + prompt CSV export)
- Income from NEBAT deposits on dashboard
- Subscription center from PG rules (still snapshot-style when empty)

---

## Success criteria

| # | Status |
|---|--------|
| Drop a statement | ✅ |
| Import transactions | ✅ |
| Categorize unknowns once | ✅ |
| Review queue shrinks | ✅ (rules + bulk apply) |
| Dashboard updates | ✅ (PG + period) |
| Workbook unchanged | ✅ |
