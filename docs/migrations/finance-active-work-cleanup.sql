-- Backfill account_id where subcategory matches workbook account (case-insensitive).
-- Fixes Amazon inventory rows approved before Phase 4 exact-match backfill.
--
-- Run: npx tsx tools/finance/correct-stale-review-status.ts --subcategory-backfill

UPDATE finance_transactions t
SET account_id = a.id,
    subcategory = a.name,
    updated_at = now()
FROM finance_accounts a
WHERE t.account_id IS NULL
  AND t.subcategory IS NOT NULL
  AND lower(trim(t.subcategory)) = lower(trim(a.name))
  AND a.merged_into_id IS NULL;
