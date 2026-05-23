-- fleetwood_mac_debug.sql — READ ONLY
-- End-to-end graph inspection for Fleetwood Mac (POC album Rumours = RVAL000003).

\set artist_name 'Fleetwood Mac'
\set rumours_rval 'RVAL000003'

-- 1) Artist row
SELECT id AS artist_id, canonical_name
FROM artists
WHERE lower(trim(canonical_name)) = lower(trim(:'artist_name'))
LIMIT 5;

-- 2) Albums + RVAL keys
SELECT
  al.id AS pg_album_id,
  al.title,
  al.release_year,
  aek.external_key AS rval
FROM artists ar
JOIN albums al ON al.artist_id = ar.id
LEFT JOIN album_external_keys aek ON aek.album_id = al.id
WHERE lower(trim(ar.canonical_name)) = lower(trim(:'artist_name'))
ORDER BY al.release_year NULLS LAST, al.title
LIMIT 30;

-- 3) Rumours sequence (canonical_album_tracks)
SELECT
  cat.position,
  cat.title,
  cat.canonical_track_key AS rvtr,
  cat.review_flag
FROM album_external_keys aek
JOIN canonical_album_tracks cat ON cat.album_id = aek.album_id
WHERE upper(trim(aek.external_key)) = upper(trim(:'rumours_rval'))
ORDER BY cat.position
LIMIT 50;

-- 4) Top graph search tracks (same ORDER BY as home-search)
SELECT
  track_id,
  canonical_title,
  peak_hot100_position,
  chart_weeks,
  has_hot100,
  has_vdj_media
FROM canonical_track_display
WHERE lower(trim(canonical_artist_name)) = lower(trim(:'artist_name'))
ORDER BY
  has_hot100 DESC,
  peak_hot100_position ASC NULLS LAST,
  chart_weeks DESC,
  canonical_title ASC
LIMIT 15;

-- 5) Hot 100 chart rows for this artist (track-level)
SELECT
  ca.chart_date,
  ca.chart_position,
  ca.weeks_on_chart,
  t.title AS track_title
FROM chart_appearances ca
JOIN tracks t ON t.id = ca.track_id
JOIN artists ar ON ar.id = t.artist_id
WHERE lower(trim(ar.canonical_name)) = lower(trim(:'artist_name'))
  AND ca.chart_name = 'Billboard Hot 100'
ORDER BY ca.chart_date DESC, ca.chart_position ASC
LIMIT 25;

-- 6) Rumours B200 summary
SELECT
  aek.external_key,
  count(*)::int AS b200_rows,
  min(ca.chart_position) AS peak_rank
FROM album_external_keys aek
JOIN chart_appearances ca ON ca.album_id = aek.album_id
WHERE upper(trim(aek.external_key)) = upper(trim(:'rumours_rval'))
  AND ca.chart_name = 'Billboard 200'
GROUP BY aek.external_key;

-- 7) Artwork for Rumours
SELECT
  aek.external_key,
  al.canonical_cover_path AS album_path,
  aal.r2_cover_key,
  aal.review_flag
FROM album_external_keys aek
JOIN albums al ON al.id = aek.album_id
LEFT JOIN album_artwork_links aal ON aal.album_id = al.id
WHERE upper(trim(aek.external_key)) = upper(trim(:'rumours_rval'))
LIMIT 5;

-- 8) Linkage summary counts (artist albums)
SELECT
  count(DISTINCT ctal.id)::int AS track_album_links,
  count(DISTINCT ctl.id)::int AS chart_track_album_links
FROM artists ar
JOIN albums al ON al.artist_id = ar.id
LEFT JOIN canonical_track_album_links ctal ON ctal.album_id = al.id
LEFT JOIN chart_track_album_links ctl ON ctl.album_id = al.id
WHERE lower(trim(ar.canonical_name)) = lower(trim(:'artist_name'));
