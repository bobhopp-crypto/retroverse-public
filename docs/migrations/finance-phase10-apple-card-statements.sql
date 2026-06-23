-- Finance Phase 10: Apple Card statement-first model

CREATE TABLE IF NOT EXISTS finance_apple_card_statements (
  id bigserial PRIMARY KEY,
  institution_account_id integer NOT NULL REFERENCES finance_institution_accounts (id) ON DELETE CASCADE,
  statement_period text NOT NULL,
  statement_start date NOT NULL,
  statement_end date NOT NULL,
  previous_balance numeric(12, 2) NOT NULL,
  ending_balance numeric(12, 2) NOT NULL,
  total_balance numeric(12, 2),
  minimum_due numeric(12, 2),
  due_date date,
  payment_total numeric(12, 2),
  purchase_total numeric(12, 2),
  interest_total numeric(12, 2) NOT NULL DEFAULT 0,
  daily_cash_total numeric(12, 2),
  monthly_installment_remaining numeric(12, 2),
  workflow_status text NOT NULL DEFAULT 'imported',
  storage_path text,
  raw_import_id bigint REFERENCES finance_imports (id) ON DELETE SET NULL,
  dedupe_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_apple_card_statements_account_idx
  ON finance_apple_card_statements (institution_account_id, statement_end DESC);

CREATE INDEX IF NOT EXISTS finance_apple_card_statements_period_idx
  ON finance_apple_card_statements (statement_end DESC);

-- Canonical Jan 2026 statement (user-provided)
INSERT INTO finance_apple_card_statements (
  institution_account_id, statement_period, statement_start, statement_end,
  previous_balance, ending_balance, total_balance, minimum_due, due_date,
  payment_total, purchase_total, interest_total, daily_cash_total,
  monthly_installment_remaining, workflow_status, dedupe_key
)
SELECT ia.id,
       'January 2026',
       '2026-01-01'::date,
       '2026-01-31'::date,
       1776.45,
       1005.14,
       2824.59,
       284.91,
       '2026-02-28'::date,
       3250.00,
       2218.78,
       0,
       31.53,
       2079.36,
       'imported',
       'apple-card|2026-01-31'
FROM finance_institution_accounts ia
WHERE ia.slug = 'apple-card'
ON CONFLICT (dedupe_key) DO UPDATE SET
  previous_balance = EXCLUDED.previous_balance,
  ending_balance = EXCLUDED.ending_balance,
  total_balance = EXCLUDED.total_balance,
  minimum_due = EXCLUDED.minimum_due,
  due_date = EXCLUDED.due_date,
  payment_total = EXCLUDED.payment_total,
  purchase_total = EXCLUDED.purchase_total,
  interest_total = EXCLUDED.interest_total,
  daily_cash_total = EXCLUDED.daily_cash_total,
  monthly_installment_remaining = EXCLUDED.monthly_installment_remaining,
  updated_at = now();

-- Dec 2025 placeholder from Jan previous_balance chain
INSERT INTO finance_apple_card_statements (
  institution_account_id, statement_period, statement_start, statement_end,
  previous_balance, ending_balance, workflow_status, dedupe_key
)
SELECT ia.id,
       'December 2025',
       '2025-12-01'::date,
       '2025-12-31'::date,
       1776.45,
       1776.45,
       'imported',
       'apple-card|2025-12-31'
FROM finance_institution_accounts ia
WHERE ia.slug = 'apple-card'
ON CONFLICT (dedupe_key) DO NOTHING;

-- Sync finance_imports balance fields from latest Apple Card statement
UPDATE finance_imports fi
SET
  institution_account_id = COALESCE(fi.institution_account_id, ia.id),
  beginning_balance = acs.previous_balance,
  ending_balance = acs.ending_balance,
  statement_start = acs.statement_start,
  statement_end = acs.statement_end,
  balance_difference = 0
FROM finance_apple_card_statements acs,
     finance_institution_accounts ia
WHERE ia.slug = 'apple-card'
  AND acs.institution_account_id = ia.id
  AND acs.dedupe_key = 'apple-card|2026-01-31'
  AND fi.source = 'apple_card'
  AND fi.id = (
    SELECT id FROM finance_imports
    WHERE source = 'apple_card' AND institution_account_id = ia.id
    ORDER BY id LIMIT 1
  );

UPDATE finance_institution_accounts ia
SET setup_status = 'statement'
WHERE ia.slug = 'apple-card'
  AND EXISTS (
    SELECT 1 FROM finance_apple_card_statements acs
    WHERE acs.institution_account_id = ia.id
  );
