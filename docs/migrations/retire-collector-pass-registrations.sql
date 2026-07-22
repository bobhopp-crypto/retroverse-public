-- Retire collector_pass_registrations as an active registration store.
-- Authoritative V1 registration model is:
--   retroverse_passes + retroverse_visitors + retroverse_pass_activity
--
-- This migration:
--   1) Safely merges any remaining collector rows into the claim model
--   2) Does NOT drop collector_pass_registrations (table kept until ops confirms)
--
-- Safe to re-run: already-claimed serials are skipped.

DO $$
DECLARE
  r RECORD;
  vid bigint;
  migrated int := 0;
  skipped int := 0;
BEGIN
  IF to_regclass('public.collector_pass_registrations') IS NULL THEN
    RAISE NOTICE 'collector_pass_registrations does not exist — nothing to migrate';
    RETURN;
  END IF;

  FOR r IN
    SELECT id, pass_number, first_name, last_name, email, created_at
    FROM collector_pass_registrations
    ORDER BY created_at ASC, id ASC
  LOOP
    INSERT INTO retroverse_passes (serial)
    VALUES (btrim(r.pass_number))
    ON CONFLICT (serial) DO NOTHING;

    IF EXISTS (
      SELECT 1 FROM retroverse_passes
      WHERE serial = btrim(r.pass_number) AND claimed = true
    ) THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO retroverse_visitors (first_name, last_name, email, created_at)
    VALUES (
      btrim(r.first_name),
      NULLIF(btrim(COALESCE(r.last_name, '')), ''),
      NULLIF(btrim(COALESCE(r.email, '')), ''),
      COALESCE(r.created_at, now())
    )
    RETURNING id INTO vid;

    UPDATE retroverse_passes
    SET
      claimed = true,
      visitor_id = vid,
      claimed_at = COALESCE(r.created_at, now())
    WHERE serial = btrim(r.pass_number)
      AND claimed = false;

    INSERT INTO retroverse_pass_activity (visitor_id, pass_serial, event_type, metadata)
    VALUES (
      vid,
      btrim(r.pass_number),
      'PASS_CLAIMED',
      jsonb_build_object(
        'source', 'collector_pass_migration',
        'collector_id', r.id
      )
    );

    migrated := migrated + 1;
  END LOOP;

  RAISE NOTICE 'collector_pass migration complete: migrated=% skipped_already_claimed=%', migrated, skipped;
END $$;

COMMENT ON TABLE collector_pass_registrations IS
  'RETIRED registration store. Canonical registrations live in retroverse_passes / retroverse_visitors. Do not write from app code. Table retained until drop is approved.';
