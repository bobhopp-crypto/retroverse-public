-- Finance Phase 7: account setup (manual balances)

ALTER TABLE finance_institution_accounts
  ADD COLUMN IF NOT EXISTS manual_balance numeric(12, 2),
  ADD COLUMN IF NOT EXISTS manual_balance_as_of date,
  ADD COLUMN IF NOT EXISTS setup_status text NOT NULL DEFAULT 'pending';
