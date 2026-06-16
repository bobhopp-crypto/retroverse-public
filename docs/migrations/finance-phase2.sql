-- Finance Phase 2: retirement-first extensions (idempotent)

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS flow_kind text NOT NULL DEFAULT 'expense';

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS importance text;

CREATE INDEX IF NOT EXISTS finance_transactions_flow_kind_idx
  ON finance_transactions (flow_kind);

-- Income + business categories
INSERT INTO finance_categories (slug, label, group_name, parent_slug) VALUES
  ('income', 'Income', 'Income', NULL),
  ('income-social-security', 'Social Security', 'Income', 'income'),
  ('income-ssm-health', 'SSM Health', 'Income', 'income'),
  ('income-funeral-home', 'Funeral Home', 'Income', 'income'),
  ('income-dj', 'DJ / Other', 'Income', 'income'),
  ('business', 'Business', 'Household', NULL),
  ('shopping', 'Shopping', 'Shopping', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Default importance on categories (stored on category for rule inheritance)
ALTER TABLE finance_categories
  ADD COLUMN IF NOT EXISTS default_importance text;

UPDATE finance_categories SET default_importance = 'required'
  WHERE slug IN ('home', 'utilities', 'medical') AND default_importance IS NULL;

UPDATE finance_categories SET default_importance = 'useful'
  WHERE slug IN ('ai', 'ai-chatgpt', 'ai-cursor', 'ai-claude', 'ai-gemini', 'ai-grok',
    'ai-creative-fabrica', 'ai-kittl', 'ai-abacus', 'ai-genspark', 'grocery', 'retroverse')
  AND default_importance IS NULL;

UPDATE finance_categories SET default_importance = 'optional'
  WHERE slug IN ('restaurants', 'personal', 'entertainment', 'retro-hosting', 'retro-domains',
    'retro-software', 'retro-ai-art', 'retro-3d-printing', 'retro-printing')
  AND default_importance IS NULL;

UPDATE finance_categories SET default_importance = 'luxury'
  WHERE slug IN ('amazon', 'shopping', 'gift', 'retro-equipment')
  AND default_importance IS NULL;

UPDATE finance_categories SET default_importance = 'useful'
  WHERE default_importance IS NULL;
