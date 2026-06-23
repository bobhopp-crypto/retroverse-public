-- Finance Phase 8: statement integrity — link statements to transactions

ALTER TABLE finance_imports
  ADD COLUMN IF NOT EXISTS posted_transaction_count integer NOT NULL DEFAULT 0;

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS institution_account_id integer REFERENCES finance_institution_accounts (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS finance_transactions_raw_import_idx
  ON finance_transactions (raw_import_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS finance_transactions_institution_idx
  ON finance_transactions (institution_account_id)
  WHERE archived_at IS NULL;

-- Backfill institution_account_id on imports from source
UPDATE finance_imports fi
SET institution_account_id = ia.id
FROM finance_institution_accounts ia
WHERE fi.institution_account_id IS NULL
  AND (
    (fi.source = 'apple_card' AND ia.slug = 'apple-card')
    OR (fi.source = 'paypal' AND ia.slug = 'paypal')
  );

UPDATE finance_imports fi
SET institution_account_id = ia.id
FROM finance_institution_accounts ia
WHERE fi.institution_account_id IS NULL
  AND fi.source = 'nebat'
  AND ia.slug = 'nebat-checking'
  AND EXISTS (
    SELECT 1 FROM finance_nebat_statements ns
    WHERE ns.raw_import_id = fi.id AND ns.statement_type = 'checking'
  );

UPDATE finance_imports fi
SET institution_account_id = ia.id
FROM finance_institution_accounts ia
WHERE fi.institution_account_id IS NULL
  AND fi.source = 'nebat'
  AND ia.slug = 'mortgage'
  AND EXISTS (
    SELECT 1 FROM finance_mortgage_statements ms
    WHERE ms.raw_import_id = fi.id
  );

-- NEBAT checking imports without mortgage statement link
UPDATE finance_imports fi
SET institution_account_id = ia.id
FROM finance_institution_accounts ia
WHERE fi.institution_account_id IS NULL
  AND fi.source = 'nebat'
  AND ia.slug = 'nebat-checking'
  AND NOT EXISTS (
    SELECT 1 FROM finance_mortgage_statements ms
    WHERE ms.raw_import_id = fi.id
  );

-- Sync import balances from NEBAT statement table when missing
UPDATE finance_imports fi
SET
  institution_account_id = COALESCE(fi.institution_account_id, ia.id),
  beginning_balance = COALESCE(fi.beginning_balance, ns.beginning_balance),
  ending_balance = COALESCE(fi.ending_balance, ns.ending_balance),
  statement_start = COALESCE(fi.statement_start, ns.statement_start),
  statement_end = COALESCE(fi.statement_end, ns.statement_end)
FROM finance_nebat_statements ns,
     finance_institution_accounts ia
WHERE ns.raw_import_id = fi.id
  AND ns.statement_type = 'checking'
  AND ia.slug = 'nebat-checking';

-- Link posted transactions to institution account via import
UPDATE finance_transactions t
SET institution_account_id = fi.institution_account_id
FROM finance_imports fi
WHERE t.raw_import_id = fi.id
  AND t.archived_at IS NULL
  AND t.institution_account_id IS NULL
  AND fi.institution_account_id IS NOT NULL;

-- Persist posted transaction counts from ledger
UPDATE finance_imports fi
SET posted_transaction_count = counts.cnt
FROM (
  SELECT raw_import_id AS import_id, COUNT(*)::int AS cnt
  FROM finance_transactions
  WHERE archived_at IS NULL AND raw_import_id IS NOT NULL
  GROUP BY raw_import_id
) counts
WHERE fi.id = counts.import_id
  AND fi.posted_transaction_count IS DISTINCT FROM counts.cnt;

UPDATE finance_imports fi
SET transaction_count = GREATEST(fi.transaction_count, fi.posted_transaction_count)
WHERE fi.posted_transaction_count > 0
  AND fi.transaction_count < fi.posted_transaction_count;
