-- Phase 5H — apply/rollback tracking columns (additive).

ALTER TABLE mb_album_ingest_proposals
  ADD COLUMN IF NOT EXISTS applied_album_id bigint,
  ADD COLUMN IF NOT EXISTS applied_rval text,
  ADD COLUMN IF NOT EXISTS applied_cat_row_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS mb_album_ingest_proposals_applied_album_idx
  ON mb_album_ingest_proposals (applied_album_id)
  WHERE applied_album_id IS NOT NULL;
