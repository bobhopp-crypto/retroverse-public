-- Idempotent migration: collector_pass_registrations → permanent claim model (Neon).
-- Excludes known QA/test rows. Does not drop collector_pass_registrations.
-- Safe to re-run: already-claimed serials are skipped (never overwrite).
--
-- Real rows to migrate (inspected 2026-07-20):
--   id=2 pass=00003   Dani Hackbart
--   id=3 pass=48      Sheldon Wood
--   id=4 pass=000036  jim wright
--   id=5 pass=00063   Shannon Wirkus
-- Excluded:
--   id=1 pass=TEST-20260605 Cursor Verify (test)

DO $$
DECLARE
  r RECORD;
  vid bigint;
  serial_norm text;
  migrated int := 0;
  skipped_claimed int := 0;
  skipped_excluded int := 0;
  skipped_empty int := 0;
BEGIN
  IF to_regclass('public.collector_pass_registrations') IS NULL THEN
    RAISE NOTICE 'collector_pass_registrations missing — abort';
    RETURN;
  END IF;

  FOR r IN
    SELECT id, pass_number, first_name, last_name, email, created_at
    FROM collector_pass_registrations
    ORDER BY created_at ASC, id ASC
  LOOP
    -- Exclude Cursor / QA test rows
    IF r.id = 1
       OR upper(btrim(r.pass_number)) LIKE 'TEST%'
       OR lower(btrim(r.first_name)) = 'cursor'
       OR lower(coalesce(r.email, '')) LIKE '%@retroverse.test'
    THEN
      skipped_excluded := skipped_excluded + 1;
      RAISE NOTICE 'EXCLUDE test row id=% pass=%', r.id, r.pass_number;
      CONTINUE;
    END IF;

    serial_norm := btrim(r.pass_number);
    IF serial_norm = '' THEN
      skipped_empty := skipped_empty + 1;
      CONTINUE;
    END IF;

    INSERT INTO retroverse_passes (serial)
    VALUES (serial_norm)
    ON CONFLICT (serial) DO NOTHING;

    IF EXISTS (
      SELECT 1 FROM retroverse_passes
      WHERE serial = serial_norm AND claimed = true
    ) THEN
      skipped_claimed := skipped_claimed + 1;
      RAISE NOTICE 'SKIP already claimed serial=% (collector id=%)', serial_norm, r.id;
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
    WHERE serial = serial_norm
      AND claimed = false;

    INSERT INTO retroverse_pass_activity (visitor_id, pass_serial, event_type, metadata)
    VALUES (
      vid,
      serial_norm,
      'PASS_CLAIMED',
      jsonb_build_object(
        'source', 'collector_pass_migration',
        'collector_id', r.id,
        'collector_pass_number', r.pass_number,
        'migrated_at', now()
      )
    );

    migrated := migrated + 1;
    RAISE NOTICE 'MIGRATED collector id=% → serial=% visitor_id=%', r.id, serial_norm, vid;
  END LOOP;

  RAISE NOTICE 'DONE migrated=% skipped_claimed=% skipped_excluded=% skipped_empty=%',
    migrated, skipped_claimed, skipped_excluded, skipped_empty;
END $$;

COMMENT ON TABLE collector_pass_registrations IS
  'RETIRED registration store. Canonical registrations live in retroverse_passes / retroverse_visitors. Do not write from app code. Table retained until drop is approved.';
