-- search_expansion_debug.sql — READ ONLY
-- Validate data available for home-search expansion (graph tracks + album context + charts).
-- Compare results to: curl "http://localhost:3000/api/home-search?q=..."

\set search_query 'Fleetwood Mac'
\set artist_name 'Fleetwood Mac'

-- A) Graph track panel (canonical_track_display — primary local source)
SELECT 'graph_tracks' AS panel, ctd.*
FROM (
  SELECT
    track_id,
    retroverse_track_id,
    canonical_title,
    canonical_artist_name,
    peak_hot100_position,
    chart_weeks,
    has_hot100,
    has_vdj_media,
    has_video
  FROM canonical_track_display
  WHERE lower(trim(canonical_artist_name)) = lower(trim(:'artist_name'))
  ORDER BY
    has_hot100 DESC,
    peak_hot100_position ASC NULLS LAST,
    chart_weeks DESC,
    canonical_title ASC
  LIMIT 12
) ctd;

-- B) Albums with RVAL (graph side — Supabase may add more in app)
SELECT 'graph_albums' AS panel, x.*
FROM (
  SELECT
    aek.external_key AS rval,
    al.title,
    al.release_year,
    ar.canonical_name AS artist_name,
    min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_peak,
    count(cat.id)::int AS sequence_tracks
  FROM artists ar
  JOIN albums al ON al.artist_id = ar.id
  LEFT JOIN album_external_keys aek ON aek.album_id = al.id
  LEFT JOIN chart_appearances ca ON ca.album_id = al.id
  LEFT JOIN canonical_album_tracks cat ON cat.album_id = al.id
  WHERE ar.canonical_name ILIKE '%' || :'search_query' || '%'
     OR al.title ILIKE '%' || :'search_query' || '%'
  GROUP BY aek.external_key, al.title, al.release_year, ar.canonical_name
  ORDER BY b200_peak NULLS LAST, al.release_year DESC NULLS LAST
  LIMIT 12
) x;

-- C) Title needle fallback (non-artist-first path)
SELECT 'title_needle_tracks' AS panel, y.*
FROM (
  SELECT
    track_id,
    canonical_title,
    canonical_artist_name,
    peak_hot100_position
  FROM canonical_track_display
  WHERE canonical_title ILIKE '%' || :'search_query' || '%'
     OR canonical_artist_name ILIKE '%' || :'search_query' || '%'
  ORDER BY
    has_hot100 DESC,
    peak_hot100_position ASC NULLS LAST,
    chart_weeks DESC
  LIMIT 12
) y;

-- D) Linked album per track title (album route index pattern)
SELECT
  ctd.track_id AS rvtr,
  ctd.canonical_title,
  cat_album.rval,
  cat_album.album_title,
  cat_album.position AS album_position
FROM canonical_track_display ctd
LEFT JOIN LATERAL (
  SELECT
    aek.external_key AS rval,
    al.title AS album_title,
    cat.position,
    cat.title AS sequence_title
  FROM canonical_album_tracks cat
  JOIN albums al ON al.id = cat.album_id
  JOIN album_external_keys aek ON aek.album_id = al.id
  WHERE cat.canonical_track_key = ctd.track_id
     OR (
       cat.canonical_track_key IS NULL
       AND lower(trim(cat.title)) = lower(trim(ctd.canonical_title))
     )
  ORDER BY cat.position
  LIMIT 1
) cat_album ON true
WHERE lower(trim(ctd.canonical_artist_name)) = lower(trim(:'artist_name'))
ORDER BY ctd.peak_hot100_position ASC NULLS LAST
LIMIT 15;

-- E) Hot 100 rows that could merge into search (SQLite also used in app — PG track chart facts)
SELECT
  ca.chart_date,
  ca.chart_position,
  t.title,
  ar.canonical_name AS artist_name
FROM chart_appearances ca
JOIN tracks t ON t.id = ca.track_id
JOIN artists ar ON ar.id = t.artist_id
WHERE ca.chart_name = 'Billboard Hot 100'
  AND (
    ar.canonical_name ILIKE '%' || :'search_query' || '%'
    OR t.title ILIKE '%' || :'search_query' || '%'
  )
ORDER BY ca.chart_date DESC
LIMIT 15;

-- F) Explain dominant artist track query (plan only)
EXPLAIN (VERBOSE, COSTS)
SELECT track_id, canonical_title, peak_hot100_position
FROM canonical_track_display
WHERE lower(trim(canonical_artist_name)) = lower(trim(:'artist_name'))
ORDER BY has_hot100 DESC, peak_hot100_position ASC NULLS LAST
LIMIT 12;

-- G) Readiness counts for this session
SELECT
  (SELECT count(*) FROM canonical_track_display) AS total_canonical_tracks,
  (SELECT count(*) FROM album_external_keys WHERE external_key ~* '^RVAL[0-9]{6}$') AS rval_bridged_albums,
  (SELECT count(*) FROM canonical_album_tracks) AS album_sequence_rows;
