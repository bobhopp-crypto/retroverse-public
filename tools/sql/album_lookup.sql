-- album_lookup.sql — READ ONLY
-- Resolve RVAL → Postgres album_id → chart + artwork + sequence.

\set rval 'RVAL000003'

-- RVAL bridge
SELECT
  aek.external_key AS rval,
  aek.album_id AS pg_album_id,
  aek.source,
  aek.confidence_score
FROM album_external_keys aek
WHERE upper(trim(aek.external_key)) = upper(trim(:'rval'))
LIMIT 5;

-- Album header + artist
SELECT
  aek.external_key AS rval,
  al.id AS pg_album_id,
  ar.canonical_name AS artist_name,
  al.title AS album_title,
  al.release_year,
  al.canonical_cover_path
FROM album_external_keys aek
JOIN albums al ON al.id = aek.album_id
JOIN artists ar ON ar.id = al.artist_id
WHERE upper(trim(aek.external_key)) = upper(trim(:'rval'))
LIMIT 5;

-- Billboard 200 chart stats (album-level)
SELECT
  aek.external_key AS rval,
  ca.chart_name,
  count(*)::int AS chart_rows,
  min(ca.chart_position) AS peak_position,
  max(ca.weeks_on_chart) AS max_weeks_on_chart,
  min(ca.chart_date)::text AS first_chart_date,
  max(ca.chart_date)::text AS last_chart_date
FROM album_external_keys aek
JOIN chart_appearances ca ON ca.album_id = aek.album_id
WHERE upper(trim(aek.external_key)) = upper(trim(:'rval'))
  AND ca.chart_name = 'Billboard 200'
GROUP BY aek.external_key, ca.chart_name;

-- Artwork linkage (curator / R2)
SELECT
  aek.external_key AS rval,
  aal.canonical_cover_path,
  aal.r2_cover_key,
  aal.review_flag,
  aal.confidence_score,
  aal.source
FROM album_external_keys aek
LEFT JOIN album_artwork_links aal ON aal.album_id = aek.album_id
WHERE upper(trim(aek.external_key)) = upper(trim(:'rval'))
ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
LIMIT 10;

-- Canonical album sequence (positions + RVTR keys)
SELECT
  aek.external_key AS rval,
  cat.position,
  cat.title,
  cat.canonical_track_key AS rvtr,
  cat.review_flag,
  cat.canonical_source
FROM album_external_keys aek
JOIN canonical_album_tracks cat ON cat.album_id = aek.album_id
WHERE upper(trim(aek.external_key)) = upper(trim(:'rval'))
ORDER BY cat.position
LIMIT 100;
