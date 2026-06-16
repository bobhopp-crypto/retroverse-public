-- Phase 5F — hardened proposal columns (additive migration).

ALTER TABLE mb_album_ingest_proposals
  ADD COLUMN IF NOT EXISTS album_group_key text,
  ADD COLUMN IF NOT EXISTS is_album_primary boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS track_recoveries_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS curation_verdict text
    CHECK (curation_verdict IS NULL OR curation_verdict IN ('approve', 'review', 'reject')),
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS release_shape text,
  ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS mb_album_ingest_proposals_album_group_idx
  ON mb_album_ingest_proposals (batch_name, album_group_key);
