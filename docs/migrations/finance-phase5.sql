-- Finance Phase 5: ledger fields, transfers, NEBAT/mortgage statements, merchant profiles

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS tax_treatment text;

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS rule_id bigint REFERENCES finance_rules (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS finance_transactions_tax_idx
  ON finance_transactions (tax_treatment);

CREATE TABLE IF NOT EXISTS finance_merchant_profiles (
  merchant_key text PRIMARY KEY,
  display_name text NOT NULL,
  mixed boolean NOT NULL DEFAULT false,
  suggested_account_id integer REFERENCES finance_accounts (id) ON DELETE SET NULL,
  suggested_importance text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_nebat_statements (
  id bigserial PRIMARY KEY,
  statement_start date,
  statement_end date,
  account_masked text,
  beginning_balance numeric(12, 2),
  ending_balance numeric(12, 2),
  total_additions numeric(12, 2),
  total_subtractions numeric(12, 2),
  statement_type text NOT NULL DEFAULT 'checking',
  raw_import_id bigint REFERENCES finance_imports (id) ON DELETE SET NULL,
  dedupe_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_mortgage_statements (
  id bigserial PRIMARY KEY,
  statement_date date NOT NULL,
  payment_due_date date,
  amount_due numeric(12, 2),
  scheduled_payment numeric(12, 2),
  principal numeric(12, 2),
  interest numeric(12, 2),
  escrow numeric(12, 2),
  outstanding_principal numeric(12, 2),
  interest_rate numeric(8, 6),
  maturity_date date,
  activity_payment_amount numeric(12, 2),
  activity_payment_date date,
  raw_import_id bigint REFERENCES finance_imports (id) ON DELETE SET NULL,
  dedupe_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- NEBAT / transfer accounts (not in Apple workbook column E)
INSERT INTO finance_accounts (name, slug, active, workbook_txn_count) VALUES
  ('Social Security', 'social-security', true, 0),
  ('SSM Health', 'ssm-health', true, 0),
  ('Transfer - Apple Card Payment', 'transfer-apple-card-payment', true, 0),
  ('Mortgage', 'mortgage', true, 0),
  ('Transfer - PayPal', 'transfer-paypal', true, 0),
  ('PayPal', 'paypal', true, 0),
  ('Tax Refund', 'tax-refund', true, 0),
  ('Deposit - Needs Review', 'deposit-needs-review', true, 0)
ON CONFLICT (slug) DO NOTHING;
