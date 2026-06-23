-- Finance Phase 6: trust reset — archive boundary + import staging workflow

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS finance_transactions_active_idx
  ON finance_transactions (transaction_date DESC)
  WHERE archived_at IS NULL;

ALTER TABLE finance_imports
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS institution_account_id integer,
  ADD COLUMN IF NOT EXISTS beginning_balance numeric(12, 2),
  ADD COLUMN IF NOT EXISTS ending_balance numeric(12, 2),
  ADD COLUMN IF NOT EXISTS computed_activity numeric(12, 2),
  ADD COLUMN IF NOT EXISTS balance_difference numeric(12, 2),
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS statement_start date,
  ADD COLUMN IF NOT EXISTS statement_end date;

CREATE TABLE IF NOT EXISTS finance_institution_accounts (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL,
  ledger_source text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO finance_institution_accounts (slug, name, kind, ledger_source) VALUES
  ('nebat-checking', 'NEBAT Checking', 'checking', 'nebat'),
  ('apple-card', 'Apple Card', 'credit_card', 'apple_card'),
  ('paypal', 'PayPal', 'payment', 'paypal'),
  ('mortgage', 'Mortgage', 'mortgage', 'nebat'),
  ('401k', '401(k)', 'retirement', NULL),
  ('savings', 'Savings', 'savings', NULL)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS finance_import_staging (
  id bigserial PRIMARY KEY,
  import_id bigint NOT NULL REFERENCES finance_imports (id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  merchant text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount numeric(12, 2) NOT NULL,
  source text NOT NULL,
  flow_kind text NOT NULL DEFAULT 'expense',
  account_id integer REFERENCES finance_accounts (id) ON DELETE SET NULL,
  subcategory text,
  importance text,
  tax_treatment text,
  review_status text NOT NULL DEFAULT 'pending',
  dedupe_key text NOT NULL,
  proposed_account text,
  duplicate_warning text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS finance_import_staging_import_idx
  ON finance_import_staging (import_id);

-- Archive pre-2026 ledger rows and legacy Amazon payment duplicates (idempotent).
-- Rows on 2026+ statement imports (e.g. Jan 2026 NEBAT spanning Dec 2025 activity) stay active.
UPDATE finance_transactions t
SET archived_at = COALESCE(archived_at, now())
WHERE t.archived_at IS NULL
  AND (
    t.source = 'amazon'
    OR (
      t.transaction_date < '2026-01-01'::date
      AND NOT EXISTS (
        SELECT 1 FROM finance_imports fi
        WHERE fi.id = t.raw_import_id
          AND fi.statement_end >= '2026-01-01'::date
      )
    )
  );
