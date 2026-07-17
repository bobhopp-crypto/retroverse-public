-- Crimson And Clover verification.
SELECT al.id AS album_id, aek.external_key AS rval, al.title, al.artist_id, ar.canonical_name
FROM albums al
JOIN artists ar ON ar.id = al.artist_id
LEFT JOIN album_external_keys aek ON aek.album_id = al.id
WHERE al.id IN (34358, 21805)
ORDER BY al.id;

SELECT id, album_id, position, title, canonical_track_key, confidence_score, review_flag
FROM canonical_album_tracks
WHERE id IN (477649, 513865, 366343)
ORDER BY album_id, position;

-- Reunited verification.
SELECT id, canonical_name
FROM artists
WHERE id = 4128 OR canonical_name = 'Peaches & Herb'
ORDER BY id;

SELECT ct.id, ct.track_id, ct.canonical_title, ct.artist_id, ar.canonical_name,
       ct.canonical_artist_name, ct.graph_track_id, ct.track_family_id,
       ct.has_hot100, ct.has_vdj_media, ct.identity_source, ct.review_flag,
       (SELECT count(*) FROM canonical_track_versions v WHERE v.canonical_track_id = ct.id) AS version_count
FROM canonical_tracks ct
LEFT JOIN artists ar ON ar.id = ct.artist_id
WHERE ct.id IN (88692, 54777, 54779)
ORDER BY ct.id;

SELECT t.id, t.title, t.artist_id, ar.canonical_name,
       tf.id AS family_id, tf.canonical_artist_id, far.canonical_name AS family_artist,
       tf.normalized_family_key
FROM tracks t
JOIN track_family_members tfm ON tfm.track_id = t.id
JOIN track_families tf ON tf.id = tfm.track_family_id
LEFT JOIN artists ar ON ar.id = t.artist_id
LEFT JOIN artists far ON far.id = tf.canonical_artist_id
WHERE t.id = 31565 OR tf.id = 12368
ORDER BY t.id;

SELECT ctv.id, ctv.canonical_track_id, ct.track_id AS rvtr, ctv.source_type,
       ctv.source_artist, ctv.source_album, ctv.graph_track_id,
       ctv.acoustic_source_id, ctv.media_asset_id
FROM canonical_track_versions ctv
JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
WHERE ctv.id IN (100835, 100836, 100840, 166905)
ORDER BY ctv.id;

SELECT ma.id AS media_id, ma.artist_text, ma.title_text, ma.album_text,
       mtl.track_id, mtl.track_family_id, mtl.confidence_score, mtl.match_reason, mtl.review_flag
FROM media_assets ma
LEFT JOIN media_track_links mtl ON mtl.media_asset_id = ma.id
WHERE ma.id IN (7657, 8876)
ORDER BY ma.id;
