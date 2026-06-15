-- Sunday Nights collector pass registrations (run once against retroverse Postgres)
CREATE TABLE IF NOT EXISTS sunday_nights_pass_registrations (
  id bigserial PRIMARY KEY,
  pass_number text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sunday_nights_pass_registrations_pass_number_uidx
  ON sunday_nights_pass_registrations (pass_number);
