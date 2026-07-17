BEGIN;

UPDATE albums
SET artist_id = 5528
WHERE id = 34358
  AND artist_id = 48
  AND title = 'Crimson & Clover';

UPDATE canonical_album_tracks
SET canonical_track_key = 'RVTR157295',
    updated_at = now()
WHERE id IN (477649, 513865)
  AND album_id = 34358
  AND canonical_track_key = 'RVTR859552';

COMMIT;
