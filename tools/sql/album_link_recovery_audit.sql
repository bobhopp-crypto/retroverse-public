-- Album-link recovery audit (READ ONLY)
-- Hot 100 tracks missing canonical_album_tracks rows.
-- Run: psql ... -f tools/sql/album_link_recovery_audit.sql

\set sample_limit 20

SELECT
  count(*)::int AS hot100_total,
  count(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM canonical_album_tracks cat
    WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
  ))::int AS hot100_missing_links
FROM canonical_track_display ctd
WHERE ctd.has_hot100 = true;

-- Top missing by chart significance (manual review queue)
SELECT
  ctd.track_id AS rvtr,
  ctd.canonical_title,
  ctd.canonical_artist_name,
  ctd.peak_hot100_position,
  ctd.chart_weeks,
  extract(year FROM ctd.first_chart_date)::int AS first_chart_year,
  ctd.artist_id
FROM canonical_track_display ctd
WHERE ctd.has_hot100 = true
  AND NOT EXISTS (
    SELECT 1 FROM canonical_album_tracks cat
    WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
  )
ORDER BY ctd.chart_weeks DESC, ctd.peak_hot100_position ASC NULLS LAST
LIMIT :sample_limit;

-- Tracklist slots with title match but no RVTR (backfill candidates)
SELECT
  cat.album_id,
  al.title AS album_title,
  ar.canonical_name AS artist_name,
  cat.position,
  cat.title AS track_title,
  cat.canonical_track_key
FROM canonical_album_tracks cat
JOIN albums al ON al.id = cat.album_id
JOIN artists ar ON ar.id = al.artist_id
WHERE (cat.canonical_track_key IS NULL OR trim(cat.canonical_track_key) = '')
  AND cat.title ILIKE '%stand by me%'
ORDER BY ar.canonical_name, al.release_year
LIMIT 30;

-- Fixture: Stand By Me / Ben E. King
SELECT 'fixture' AS label, ctd.*
FROM canonical_track_display ctd
WHERE upper(trim(ctd.track_id)) = 'RVTR430551';

SELECT 'fixture_links' AS label, cat.*
FROM canonical_album_tracks cat
WHERE upper(trim(cat.canonical_track_key)) = 'RVTR430551';

-- Fixture: Thriller (healthy control)
SELECT 'control' AS label, count(*)::int AS link_count
FROM canonical_album_tracks cat
WHERE upper(trim(cat.canonical_track_key)) = 'RVTR336241';
