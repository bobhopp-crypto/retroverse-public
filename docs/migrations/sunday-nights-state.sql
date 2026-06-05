-- Sunday Nights production state (run once against retroverse Postgres)
CREATE TABLE IF NOT EXISTS sunday_nights_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Keys:
--   live       → { version, currentTrackId, live, updatedAt }
--   eventMode  → { enabled, updatedAt }
