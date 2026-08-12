-- Retroverse live song requests v1.
-- Additive only: does not alter the existing pass-registration tables or data.

CREATE TABLE IF NOT EXISTS retroverse_request_events (
  event_id text PRIMARY KEY,
  title text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  activated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS retroverse_request_events_one_active_idx
  ON retroverse_request_events ((is_active))
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS retroverse_request_sources (
  id bigserial PRIMARY KEY,
  event_id text NOT NULL REFERENCES retroverse_request_events(event_id),
  source_kind text NOT NULL CHECK (source_kind IN ('folder', 'list', 'playlist')),
  source_key text NOT NULL,
  source_label text NOT NULL,
  include_descendants boolean NOT NULL DEFAULT false,
  eligible_track_count integer NOT NULL CHECK (eligible_track_count >= 0),
  activated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS retroverse_request_sources_one_active_per_event_idx
  ON retroverse_request_sources (event_id)
  WHERE deactivated_at IS NULL;

CREATE TABLE IF NOT EXISTS retroverse_request_catalog_tracks (
  id bigserial PRIMARY KEY,
  source_id bigint NOT NULL REFERENCES retroverse_request_sources(id),
  event_id text NOT NULL REFERENCES retroverse_request_events(event_id),
  public_key text NOT NULL UNIQUE,
  rvtr text,
  virtualdj_track_identity text NOT NULL,
  artist text NOT NULL,
  title text NOT NULL,
  year integer,
  source_path_snapshot text NOT NULL,
  selected_source_label text NOT NULL,
  source_relative_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, source_path_snapshot)
);

CREATE INDEX IF NOT EXISTS retroverse_request_catalog_active_lookup_idx
  ON retroverse_request_catalog_tracks (event_id, source_id, artist, title);

CREATE TABLE IF NOT EXISTS retroverse_request_allowances (
  event_id text NOT NULL REFERENCES retroverse_request_events(event_id),
  visitor_id bigint NOT NULL REFERENCES retroverse_visitors(id),
  pass_serial text NOT NULL REFERENCES retroverse_passes(serial),
  allowance integer NOT NULL DEFAULT 1 CHECK (allowance >= 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0 AND used_count <= allowance),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, pass_serial)
);

CREATE TABLE IF NOT EXISTS retroverse_song_requests (
  id bigserial PRIMARY KEY,
  event_id text NOT NULL REFERENCES retroverse_request_events(event_id),
  visitor_id bigint NOT NULL REFERENCES retroverse_visitors(id),
  pass_serial text NOT NULL REFERENCES retroverse_passes(serial),
  catalog_track_id bigint NOT NULL REFERENCES retroverse_request_catalog_tracks(id),
  rvtr text,
  virtualdj_track_identity text NOT NULL,
  artist text NOT NULL,
  title text NOT NULL,
  year integer,
  source_path_snapshot text NOT NULL,
  selected_source_label text NOT NULL,
  source_relative_path text,
  guest_comment text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'played', 'skipped')),
  dj_response text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  played_at timestamptz,
  skipped_at timestamptz,
  responded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS retroverse_song_requests_event_status_idx
  ON retroverse_song_requests (event_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS retroverse_song_requests_member_history_idx
  ON retroverse_song_requests (visitor_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS retroverse_song_requests_pass_history_idx
  ON retroverse_song_requests (pass_serial, requested_at DESC);

-- Idempotent upgrade for installations that applied an earlier request draft.
ALTER TABLE retroverse_request_catalog_tracks
  ADD COLUMN IF NOT EXISTS public_key text;

UPDATE retroverse_request_catalog_tracks
SET public_key = md5(source_id::text || ':' || id::text || ':' || random()::text || ':' || clock_timestamp()::text)
WHERE public_key IS NULL;

ALTER TABLE retroverse_request_catalog_tracks
  ALTER COLUMN public_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS retroverse_request_catalog_tracks_public_key_idx
  ON retroverse_request_catalog_tracks (public_key);

-- Early request drafts keyed the allowance by member. The product rule is one
-- request per pass per event; a member may legitimately hold more than one pass.
DO $$
DECLARE
  primary_key_definition text;
BEGIN
  SELECT pg_get_constraintdef(oid)
  INTO primary_key_definition
  FROM pg_constraint
  WHERE conrelid = 'retroverse_request_allowances'::regclass
    AND contype = 'p';

  IF primary_key_definition = 'PRIMARY KEY (event_id, visitor_id)' THEN
    ALTER TABLE retroverse_request_allowances
      DROP CONSTRAINT retroverse_request_allowances_pkey;
    ALTER TABLE retroverse_request_allowances
      ADD CONSTRAINT retroverse_request_allowances_pkey
      PRIMARY KEY (event_id, pass_serial);
  END IF;
END $$;

-- Relationship hardening: preserve the exact member/pass/event/source/track chain
-- even if data is written outside the application transaction.
CREATE UNIQUE INDEX IF NOT EXISTS retroverse_passes_serial_visitor_idx
  ON retroverse_passes (serial, visitor_id);

CREATE UNIQUE INDEX IF NOT EXISTS retroverse_request_sources_id_event_idx
  ON retroverse_request_sources (id, event_id);

CREATE UNIQUE INDEX IF NOT EXISTS retroverse_request_catalog_tracks_id_event_idx
  ON retroverse_request_catalog_tracks (id, event_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'retroverse_request_allowances_pass_member_fk'
  ) THEN
    ALTER TABLE retroverse_request_allowances
      ADD CONSTRAINT retroverse_request_allowances_pass_member_fk
      FOREIGN KEY (pass_serial, visitor_id)
      REFERENCES retroverse_passes (serial, visitor_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'retroverse_request_catalog_source_event_fk'
  ) THEN
    ALTER TABLE retroverse_request_catalog_tracks
      ADD CONSTRAINT retroverse_request_catalog_source_event_fk
      FOREIGN KEY (source_id, event_id)
      REFERENCES retroverse_request_sources (id, event_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'retroverse_song_requests_pass_member_fk'
  ) THEN
    ALTER TABLE retroverse_song_requests
      ADD CONSTRAINT retroverse_song_requests_pass_member_fk
      FOREIGN KEY (pass_serial, visitor_id)
      REFERENCES retroverse_passes (serial, visitor_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'retroverse_song_requests_track_event_fk'
  ) THEN
    ALTER TABLE retroverse_song_requests
      ADD CONSTRAINT retroverse_song_requests_track_event_fk
      FOREIGN KEY (catalog_track_id, event_id)
      REFERENCES retroverse_request_catalog_tracks (id, event_id);
  END IF;
END $$;
