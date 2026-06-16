-- Finance Phase 4: workbook Chart of Accounts → finance_accounts

CREATE TABLE IF NOT EXISTS finance_accounts (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  merged_into_id integer REFERENCES finance_accounts (id) ON DELETE SET NULL,
  workbook_txn_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS finance_accounts_name_uidx
  ON finance_accounts (lower(name))
  WHERE merged_into_id IS NULL;

CREATE INDEX IF NOT EXISTS finance_accounts_active_idx
  ON finance_accounts (active)
  WHERE merged_into_id IS NULL;

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS account_id integer REFERENCES finance_accounts (id) ON DELETE SET NULL;

ALTER TABLE finance_rules
  ADD COLUMN IF NOT EXISTS account_id integer REFERENCES finance_accounts (id) ON DELETE SET NULL;

ALTER TABLE finance_rules
  ALTER COLUMN category_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS finance_transactions_account_idx
  ON finance_transactions (account_id);

CREATE INDEX IF NOT EXISTS finance_rules_account_idx
  ON finance_rules (account_id);

-- Backfill account_id from workbook subcategory tags when present
UPDATE finance_transactions t
SET account_id = a.id,
    updated_at = now()
FROM finance_accounts a
WHERE t.account_id IS NULL
  AND t.subcategory IS NOT NULL
  AND t.subcategory = a.name;

-- Backfill from legacy category labels where names align
UPDATE finance_transactions t
SET account_id = a.id,
    updated_at = now()
FROM finance_categories c,
     finance_accounts a
WHERE t.account_id IS NULL
  AND t.category_id = c.id
  AND lower(c.label) = lower(a.name);

-- Map common legacy slugs to workbook account names
UPDATE finance_transactions t
SET account_id = a.id,
    updated_at = now()
FROM finance_categories c,
     finance_accounts a
WHERE t.account_id IS NULL
  AND t.category_id = c.id
  AND (
    (c.slug = 'grocery' AND a.name = 'Grocery')
    OR (c.slug = 'restaurants' AND a.name = 'Restaurants')
    OR (c.slug = 'home' AND a.name = 'Home')
    OR (c.slug = 'utilities' AND a.name = 'Utilities')
    OR (c.slug = 'amazon' AND a.name = 'Amazon')
    OR (c.slug = 'personal' AND a.name = 'Personal')
    OR (c.slug = 'medical' AND a.name = 'Medical')
    OR (c.slug = 'gift' AND a.name = 'Shopping')
    OR (c.slug = 'ai-chatgpt' AND a.name = 'AI - ChatGPT')
    OR (c.slug = 'ai-cursor' AND a.name = 'AI - Cursor')
    OR (c.slug = 'retro-3d-printing' AND a.name = '3D Printing')
    OR (c.slug = 'retroverse' AND a.name = 'Inventory')
    OR (c.slug = 'other' AND a.name = 'Other')
  );
