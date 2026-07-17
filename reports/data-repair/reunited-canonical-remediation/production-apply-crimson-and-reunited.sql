BEGIN;

-- Prior local repair: Crimson And Clover.
UPDATE albums
SET artist_id = 48
WHERE id = 34358
  AND artist_id = 5528
  AND title = 'Crimson & Clover';

UPDATE canonical_album_tracks
SET canonical_track_key = 'RVTR859552',
    updated_at = now()
WHERE id IN (477649, 513865)
  AND album_id = 34358
  AND canonical_track_key = 'RVTR157295'
  AND lower(title) = 'crimson and clover';

-- Current local repair: Reunited canonical public identity.
DO $$
DECLARE
  target_artist_id bigint;
BEGIN
  SELECT id INTO target_artist_id
  FROM artists
  WHERE canonical_name = 'Peaches & Herb'
  LIMIT 1;

  IF target_artist_id IS NULL THEN
    INSERT INTO artists (canonical_name)
    VALUES ('Peaches & Herb')
    RETURNING id INTO target_artist_id;
  END IF;

  INSERT INTO artist_aliases (artist_id, alias_name, is_preferred)
  SELECT target_artist_id, alias_name, is_preferred
  FROM (VALUES
    ('Peaches & Herb'::text, true),
    ('Peaches Herb'::text, false),
    ('Peaches and Herb'::text, false)
  ) proposed(alias_name, is_preferred)
  WHERE NOT EXISTS (
    SELECT 1
    FROM artist_aliases aa
    WHERE aa.artist_id = target_artist_id
      AND lower(trim(aa.alias_name)) = lower(trim(proposed.alias_name))
  );

  UPDATE tracks
  SET artist_id = target_artist_id
  WHERE id = 31565
    AND title = 'Reunited'
    AND artist_id = 4128;

  UPDATE track_families
  SET canonical_artist_id = target_artist_id,
      normalized_family_key = target_artist_id::text || '::reunited'
  WHERE id = 12368
    AND canonical_name = 'Reunited'
    AND canonical_artist_id = 4128
    AND normalized_family_key = '4128::reunited';

  UPDATE canonical_tracks
  SET artist_id = target_artist_id,
      canonical_artist_name = 'Peaches & Herb',
      has_vdj_media = true,
      identity_source = 'hot100_vdj',
      updated_at = now()
  WHERE id = 88692
    AND upper(trim(track_id)) = 'RVTR280043'
    AND artist_id = 4128
    AND lower(canonical_artist_name) = 'peaches';

  UPDATE canonical_tracks
  SET artist_id = NULL,
      canonical_artist_name = 'Peaches & Herb',
      review_flag = 'duplicate_of:RVTR280043',
      updated_at = now()
  WHERE id IN (54777, 54779)
    AND upper(trim(track_id)) IN ('RVTR979276', 'RVTR386049')
    AND canonical_title = 'Reunited';

  UPDATE canonical_track_versions
  SET canonical_track_id = 88692
  WHERE id IN (100835, 100836, 100840)
    AND canonical_track_id IN (54777, 54779);

  UPDATE canonical_track_versions
  SET source_artist = 'Peaches & Herb'
  WHERE id = 166905
    AND canonical_track_id = 88692
    AND graph_track_id = 31565
    AND lower(source_artist) = 'peaches';

  INSERT INTO media_track_links (
    media_asset_id,
    track_id,
    track_family_id,
    confidence_score,
    match_reason,
    review_flag
  )
  SELECT media_asset_id, 31565, 12368, 100, 'reunited_canonical_identity_remediation', 'ok'
  FROM (VALUES (8876::bigint), (7657::bigint)) proposed(media_asset_id)
  WHERE NOT EXISTS (
    SELECT 1
    FROM media_track_links mtl
    WHERE mtl.media_asset_id = proposed.media_asset_id
      AND mtl.track_id = 31565
  );
END $$;

COMMIT;
