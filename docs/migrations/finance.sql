-- Retroverse Finance (run once against retroverse Postgres)
-- Import center + transactions + categorization rules

CREATE TABLE IF NOT EXISTS finance_categories (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  group_name text NOT NULL,
  parent_slug text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_imports (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  storage_path text,
  status text NOT NULL DEFAULT 'pending',
  transaction_count integer NOT NULL DEFAULT 0,
  error_message text,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_rules (
  id bigserial PRIMARY KEY,
  merchant_pattern text NOT NULL,
  description_pattern text NOT NULL DEFAULT '',
  category_id integer NOT NULL REFERENCES finance_categories (id) ON DELETE CASCADE,
  subcategory text,
  confidence numeric(4, 3) NOT NULL DEFAULT 0.850,
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS finance_rules_merchant_desc_uidx
  ON finance_rules (merchant_pattern, description_pattern);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  transaction_date date NOT NULL,
  merchant text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount numeric(12, 2) NOT NULL,
  category_id integer REFERENCES finance_categories (id) ON DELETE SET NULL,
  subcategory text,
  review_status text NOT NULL DEFAULT 'review',
  raw_import_id bigint REFERENCES finance_imports (id) ON DELETE SET NULL,
  dedupe_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_transactions_date_idx
  ON finance_transactions (transaction_date DESC);

CREATE INDEX IF NOT EXISTS finance_transactions_review_idx
  ON finance_transactions (review_status)
  WHERE review_status = 'review';

CREATE INDEX IF NOT EXISTS finance_transactions_category_idx
  ON finance_transactions (category_id);

CREATE INDEX IF NOT EXISTS finance_transactions_source_idx
  ON finance_transactions (source);

-- Seed categories (idempotent)
INSERT INTO finance_categories (slug, label, group_name, parent_slug) VALUES
  ('ai', 'AI', 'AI', NULL),
  ('ai-chatgpt', 'ChatGPT', 'AI', 'ai'),
  ('ai-cursor', 'Cursor', 'AI', 'ai'),
  ('ai-claude', 'Claude', 'AI', 'ai'),
  ('ai-gemini', 'Gemini', 'AI', 'ai'),
  ('ai-grok', 'Grok', 'AI', 'ai'),
  ('ai-creative-fabrica', 'Creative Fabrica', 'AI', 'ai'),
  ('ai-kittl', 'Kittl', 'AI', 'ai'),
  ('ai-abacus', 'Abacus', 'AI', 'ai'),
  ('ai-genspark', 'GenSpark', 'AI', 'ai'),
  ('retroverse', 'Retroverse', 'Retroverse', NULL),
  ('retro-hosting', 'Hosting', 'Retroverse', 'retroverse'),
  ('retro-domains', 'Domains', 'Retroverse', 'retroverse'),
  ('retro-ai-art', 'AI Art', 'Retroverse', 'retroverse'),
  ('retro-3d-printing', '3D Printing', 'Retroverse', 'retroverse'),
  ('retro-equipment', 'Equipment', 'Retroverse', 'retroverse'),
  ('retro-software', 'Software', 'Retroverse', 'retroverse'),
  ('retro-printing', 'Printing', 'Retroverse', 'retroverse'),
  ('home', 'Home', 'Household', NULL),
  ('restaurants', 'Restaurants', 'Household', NULL),
  ('grocery', 'Grocery', 'Household', NULL),
  ('utilities', 'Utilities', 'Household', NULL),
  ('personal', 'Personal', 'Household', NULL),
  ('gift', 'Gift', 'Household', NULL),
  ('medical', 'Medical', 'Household', NULL),
  ('amazon', 'Amazon', 'Shopping', NULL),
  ('other', 'Other', 'Other', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Seed starter rules (idempotent via merchant pattern)
INSERT INTO finance_rules (merchant_pattern, category_id, subcategory, confidence)
SELECT 'openai', id, 'ChatGPT', 0.950 FROM finance_categories WHERE slug = 'ai-chatgpt'
ON CONFLICT (merchant_pattern, description_pattern) DO NOTHING;

INSERT INTO finance_rules (merchant_pattern, category_id, subcategory, confidence)
SELECT 'chatgpt', id, 'ChatGPT', 0.950 FROM finance_categories WHERE slug = 'ai-chatgpt'
ON CONFLICT (merchant_pattern, description_pattern) DO NOTHING;

INSERT INTO finance_rules (merchant_pattern, category_id, subcategory, confidence)
SELECT 'cursor', id, 'Cursor', 0.950 FROM finance_categories WHERE slug = 'ai-cursor'
ON CONFLICT (merchant_pattern, description_pattern) DO NOTHING;

INSERT INTO finance_rules (merchant_pattern, category_id, subcategory, confidence)
SELECT 'menards', id, NULL, 0.900 FROM finance_categories WHERE slug = 'home'
ON CONFLICT (merchant_pattern, description_pattern) DO NOTHING;

INSERT INTO finance_rules (merchant_pattern, category_id, subcategory, confidence)
SELECT 'culver', id, NULL, 0.900 FROM finance_categories WHERE slug = 'restaurants'
ON CONFLICT (merchant_pattern, description_pattern) DO NOTHING;
