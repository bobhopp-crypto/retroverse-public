-- Optional healing proposal log (apply manually in dev/staging).
-- All writes to canonical_album_tracks must go through approval + apply-proposal.ts

CREATE TABLE IF NOT EXISTS track_album_link_proposals (
  id bigserial PRIMARY KEY,
  rvtr text NOT NULL,
  album_id bigint NOT NULL REFERENCES albums(id),
  position integer,
  sequence_title text NOT NULL,
  confidence numeric(5, 3) NOT NULL,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_kind text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'rolled_back')),
  proposed_by text,
  reviewed_by text,
  reviewed_at timestamptz,
  applied_cat_row_id bigint,
  rollback_of bigint REFERENCES track_album_link_proposals(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS track_album_link_proposals_rvtr_idx
  ON track_album_link_proposals (rvtr, status);

CREATE TABLE IF NOT EXISTS track_cover_healing_proposals (
  id bigserial PRIMARY KEY,
  album_id bigint NOT NULL REFERENCES albums(id),
  proposed_cover_path text,
  proposed_r2_key text,
  confidence numeric(5, 3),
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'rolled_back')),
  proposed_by text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
