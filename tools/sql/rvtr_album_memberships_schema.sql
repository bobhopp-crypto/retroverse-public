-- RVTR ↔ album membership without owning a tracklist slot.
-- Used when canonical_album_tracks position is keyed to a sibling RVTR fragment.
-- Run once in dev/staging before healing co-album attaches.

CREATE TABLE IF NOT EXISTS rvtr_album_memberships (
  id bigserial PRIMARY KEY,
  rvtr text NOT NULL,
  album_id bigint NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  sequence_position integer,
  sequence_title text NOT NULL,
  anchor_cat_row_id bigint REFERENCES canonical_album_tracks(id) ON DELETE SET NULL,
  confidence_score numeric(5, 3) NOT NULL DEFAULT 0,
  source_kind text NOT NULL,
  canonical_source text NOT NULL DEFAULT 'healing_co_album',
  review_flag text NOT NULL DEFAULT 'curated',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rvtr, album_id)
);

CREATE INDEX IF NOT EXISTS rvtr_album_memberships_album_idx
  ON rvtr_album_memberships (album_id);

CREATE INDEX IF NOT EXISTS rvtr_album_memberships_rvtr_idx
  ON rvtr_album_memberships (upper(trim(rvtr)));
