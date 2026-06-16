-- Finance Phase 3: import pipeline, canonical model, Amazon orders

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Normalize review_status to pending | approved
UPDATE finance_transactions SET review_status = 'pending'
  WHERE review_status = 'review';

UPDATE finance_transactions SET review_status = 'approved'
  WHERE review_status IN ('auto', 'manual');

ALTER TABLE finance_rules
  ADD COLUMN IF NOT EXISTS importance text;

UPDATE finance_rules SET importance = 'useful' WHERE importance IS NULL;

ALTER TABLE finance_imports
  ADD COLUMN IF NOT EXISTS transactions_inserted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transactions_skipped integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transactions_updated integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transactions_pending integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

INSERT INTO finance_categories (slug, label, group_name, parent_slug, default_importance) VALUES
  ('entertainment', 'Entertainment', 'Household', NULL, 'optional'),
  ('income', 'Income', 'Income', NULL, 'required')
ON CONFLICT (slug) DO NOTHING;

-- Seed rules with importance
INSERT INTO finance_rules (merchant_pattern, description_pattern, category_id, subcategory, confidence, importance)
SELECT 'openai', '', id, 'ChatGPT', 0.950, 'useful' FROM finance_categories WHERE slug = 'ai-chatgpt'
ON CONFLICT (merchant_pattern, description_pattern) DO UPDATE SET importance = 'useful';

INSERT INTO finance_rules (merchant_pattern, description_pattern, category_id, subcategory, confidence, importance)
SELECT 'netflix', '', id, 'Netflix', 0.920, 'optional' FROM finance_categories WHERE slug = 'entertainment'
ON CONFLICT (merchant_pattern, description_pattern) DO UPDATE SET importance = 'optional';

INSERT INTO finance_rules (merchant_pattern, description_pattern, category_id, subcategory, confidence, importance)
SELECT 'amazon marketplace', '', id, 'Amazon', 0.800, 'luxury' FROM finance_categories WHERE slug = 'shopping'
ON CONFLICT (merchant_pattern, description_pattern) DO UPDATE SET importance = 'luxury';

CREATE TABLE IF NOT EXISTS finance_amazon_orders (
  id bigserial PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  order_date date NOT NULL,
  order_total numeric(12, 2) NOT NULL,
  delivery_status text,
  raw_import_id bigint REFERENCES finance_imports (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_amazon_order_items (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES finance_amazon_orders (id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(12, 2),
  category_slug text NOT NULL DEFAULT 'shopping',
  importance text NOT NULL DEFAULT 'luxury',
  delivery_status text,
  dedupe_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_amazon_orders_date_idx
  ON finance_amazon_orders (order_date DESC);

CREATE INDEX IF NOT EXISTS finance_amazon_items_category_idx
  ON finance_amazon_order_items (category_slug);
