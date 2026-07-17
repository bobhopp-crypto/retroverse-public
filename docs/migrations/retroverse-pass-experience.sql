-- Retroverse Pass Experience v1 (run once against retroverse Postgres)
-- Serialized passes (RVSN#####), visitors, and activity log.

CREATE TABLE IF NOT EXISTS retroverse_visitors (
  id bigserial PRIMARY KEY,
  first_name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE retroverse_visitors ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE retroverse_visitors ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE retroverse_visitors ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE retroverse_visitors ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE retroverse_visitors ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS retroverse_visitors_email_idx
  ON retroverse_visitors (lower(email));

CREATE TABLE IF NOT EXISTS retroverse_passes (
  serial text PRIMARY KEY,
  claimed boolean NOT NULL DEFAULT false,
  visitor_id bigint REFERENCES retroverse_visitors(id),
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retroverse_pass_activity (
  id bigserial PRIMARY KEY,
  visitor_id bigint,
  pass_serial text,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS retroverse_pass_activity_pass_serial_idx
  ON retroverse_pass_activity (pass_serial);

CREATE INDEX IF NOT EXISTS retroverse_pass_activity_visitor_id_idx
  ON retroverse_pass_activity (visitor_id);
