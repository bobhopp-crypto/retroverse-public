-- Retroverse Pass Experience v2 (additive, run once against retroverse Postgres)
-- Registration MVP: first name is the only required visitor field.
-- Email and phone become optional so a scan-to-registration flow can
-- complete with first name alone. No existing rows are modified.

ALTER TABLE retroverse_visitors ALTER COLUMN email DROP NOT NULL;
