-- MusicBrainz album ingest proposals (staging only — no canonical writes on stage).
-- Apply path is gated by RETROVERSE_MB_INGEST_APPLY=1 (future phase).

CREATE TABLE IF NOT EXISTS mb_album_ingest_proposals (
  proposal_id bigserial PRIMARY KEY,
  batch_name text NOT NULL DEFAULT 'MB-CANARY-25',
  rvtr text NOT NULL,
  artist_id bigint NOT NULL REFERENCES artists(id),
  artist_name text NOT NULL,
  track_title text NOT NULL,
  mb_release_group_id text,
  mb_release_id text NOT NULL,
  mb_recording_id text,
  proposed_rval text NOT NULL,
  proposed_album_title text NOT NULL,
  proposed_album_year integer,
  proposed_track_position integer NOT NULL,
  proposed_tracklist_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence text NOT NULL,
  signals_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  qualify_reason text,
  status text NOT NULL DEFAULT 'staged'
    CHECK (status IN ('staged', 'approved', 'applied', 'rolled_back', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  rollback_at timestamptz,
  CONSTRAINT mb_album_ingest_proposals_rvtr_batch_uniq UNIQUE (rvtr, batch_name)
);

CREATE INDEX IF NOT EXISTS mb_album_ingest_proposals_batch_status_idx
  ON mb_album_ingest_proposals (batch_name, status);

CREATE INDEX IF NOT EXISTS mb_album_ingest_proposals_proposed_rval_idx
  ON mb_album_ingest_proposals (proposed_rval);

CREATE INDEX IF NOT EXISTS mb_album_ingest_proposals_mb_release_idx
  ON mb_album_ingest_proposals (mb_release_id);
