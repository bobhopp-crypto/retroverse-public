-- One-time data correction: Phase 4 backfilled account_id from subcategory
-- but left review_status = 'pending'. Approve rows that already have an account.
--
-- Run: psql retroverse -f docs/migrations/finance-review-count-cleanup.sql
-- Or:  npx tsx tools/finance/correct-stale-review-status.ts

UPDATE finance_transactions
SET review_status = 'approved',
    updated_at = now()
WHERE account_id IS NOT NULL
  AND review_status = 'pending';
