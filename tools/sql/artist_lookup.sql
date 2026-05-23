-- artist_lookup.sql — READ ONLY
-- Resolve graph artist rows by name (RVAR lives in Supabase/dossier; local PG uses artists.id + canonical_name).

\set artist_name 'Fleetwood Mac'

-- Exact name match (home-search artist track path uses this pattern)
SELECT
  a.id AS artist_id,
  a.canonical_name,
  count(DISTINCT al.id)::int AS album_count,
  count(DISTINCT ctd.track_id)::int AS canonical_track_count
FROM artists a
LEFT JOIN albums al ON al.artist_id = a.id
LEFT JOIN canonical_track_display ctd
  ON lower(trim(ctd.canonical_artist_name)) = lower(trim(a.canonical_name))
WHERE lower(trim(a.canonical_name)) = lower(trim(:'artist_name'))
GROUP BY a.id, a.canonical_name;

-- Fuzzy discovery (limit results)
SELECT
  a.id AS artist_id,
  a.canonical_name,
  count(DISTINCT al.id)::int AS album_count
FROM artists a
LEFT JOIN albums al ON al.artist_id = a.id
WHERE a.canonical_name ILIKE '%' || :'artist_name' || '%'
GROUP BY a.id, a.canonical_name
ORDER BY a.canonical_name
LIMIT 25;

-- Albums for this artist with RVAL when bridged
SELECT
  a.canonical_name AS artist_name,
  al.id AS pg_album_id,
  al.title AS album_title,
  al.release_year,
  aek.external_key AS rval,
  count(cat.id)::int AS canonical_sequence_rows
FROM artists a
JOIN albums al ON al.artist_id = a.id
LEFT JOIN album_external_keys aek ON aek.album_id = al.id
LEFT JOIN canonical_album_tracks cat ON cat.album_id = al.id
WHERE lower(trim(a.canonical_name)) = lower(trim(:'artist_name'))
GROUP BY a.canonical_name, al.id, al.title, al.release_year, aek.external_key
ORDER BY al.release_year NULLS LAST, al.title
LIMIT 50;
