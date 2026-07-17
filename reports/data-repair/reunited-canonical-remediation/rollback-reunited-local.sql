BEGIN;

DO $$
DECLARE
  target_artist_id bigint;
BEGIN
  SELECT id INTO target_artist_id
  FROM artists
  WHERE canonical_name = 'Peaches & Herb'
  LIMIT 1;

  UPDATE media_track_links
  SET review_flag = 'rolled_back',
      match_reason = 'rollback_reunited_canonical_identity_remediation'
  WHERE media_asset_id IN (8876, 7657)
    AND track_id = 31565
    AND track_family_id = 12368
    AND match_reason = 'reunited_canonical_identity_remediation';

  UPDATE canonical_track_versions
  SET canonical_track_id = 54777
  WHERE id IN (100835, 100836)
    AND canonical_track_id = 88692;

  UPDATE canonical_track_versions
  SET canonical_track_id = 54779
  WHERE id = 100840
    AND canonical_track_id = 88692;

  UPDATE canonical_track_versions
  SET source_artist = 'peaches'
  WHERE id = 166905
    AND canonical_track_id = 88692
    AND graph_track_id = 31565
    AND source_artist = 'Peaches & Herb';

  UPDATE canonical_tracks
  SET artist_id = NULL,
      canonical_artist_name = CASE
        WHEN upper(trim(track_id)) = 'RVTR979276' THEN 'Peaches & Herb'
        WHEN upper(trim(track_id)) = 'RVTR386049' THEN 'Peaches Herb'
        ELSE canonical_artist_name
      END,
      review_flag = 'ok',
      updated_at = now()
  WHERE id IN (54777, 54779)
    AND review_flag = 'duplicate_of:RVTR280043';

  UPDATE canonical_tracks
  SET artist_id = 4128,
      canonical_artist_name = 'peaches',
      has_vdj_media = false,
      identity_source = 'hot100',
      updated_at = now()
  WHERE id = 88692
    AND upper(trim(track_id)) = 'RVTR280043'
    AND artist_id = target_artist_id;

  UPDATE track_families
  SET canonical_artist_id = 4128,
      normalized_family_key = '4128::reunited'
  WHERE id = 12368
    AND canonical_artist_id = target_artist_id;

  UPDATE tracks
  SET artist_id = 4128
  WHERE id = 31565
    AND artist_id = target_artist_id;

  DELETE FROM artist_aliases
  WHERE artist_id = target_artist_id
    AND alias_name IN ('Peaches & Herb', 'Peaches Herb', 'Peaches and Herb');

  DELETE FROM artists
  WHERE id = target_artist_id
    AND canonical_name = 'Peaches & Herb'
    AND NOT EXISTS (SELECT 1 FROM albums WHERE artist_id = target_artist_id)
    AND NOT EXISTS (SELECT 1 FROM tracks WHERE artist_id = target_artist_id)
    AND NOT EXISTS (SELECT 1 FROM canonical_tracks WHERE artist_id = target_artist_id)
    AND NOT EXISTS (SELECT 1 FROM track_families WHERE canonical_artist_id = target_artist_id);
END $$;

COMMIT;
