-- Finance Phase 9: Jan 2026 NEBAT repair — restore active statement-period rows

-- Un-archive Dec 2025-dated rows that belong to Jan 2026 statement (import 33)
UPDATE finance_transactions t
SET archived_at = NULL
FROM finance_imports fi
WHERE t.raw_import_id = fi.id
  AND fi.id = 33
  AND fi.statement_end >= '2026-01-01'::date
  AND t.archived_at IS NOT NULL;

UPDATE finance_imports fi
SET posted_transaction_count = counts.cnt,
    transaction_count = counts.cnt
FROM (
  SELECT COUNT(*)::int AS cnt
  FROM finance_transactions
  WHERE raw_import_id = 33 AND archived_at IS NULL
) counts
WHERE fi.id = 33;
