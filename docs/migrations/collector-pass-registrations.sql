-- RETIRED TABLE — do not use for new registrations.
-- Canonical V1 store: retroverse_passes + retroverse_visitors + retroverse_pass_activity
-- See: docs/migrations/retire-collector-pass-registrations.sql
--
-- Historical DDL (table retained until drop is approved):
CREATE TABLE IF NOT EXISTS collector_pass_registrations (
  id bigserial PRIMARY KEY,
  pass_number text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS collector_pass_registrations_pass_number_uidx
  ON collector_pass_registrations (pass_number);
