-- Contacts MVP: additive and safe to run repeatedly.
CREATE TABLE IF NOT EXISTS retroverse_contacts (
  id bigserial PRIMARY KEY,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  times_seen integer NOT NULL DEFAULT 0,
  first_seen timestamptz,
  last_seen timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE retroverse_passes ADD COLUMN IF NOT EXISTS contact_id bigint REFERENCES retroverse_contacts(id);
CREATE INDEX IF NOT EXISTS retroverse_contacts_email_idx ON retroverse_contacts (lower(email));
CREATE INDEX IF NOT EXISTS retroverse_contacts_phone_idx ON retroverse_contacts (phone);
