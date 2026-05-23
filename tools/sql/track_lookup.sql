-- track_lookup.sql — READ ONLY
-- Inspect canonical_track_display (primary home-search track surface).

\set rvtr 'RVTR672189'
\set title_needle 'Dreams'
\set artist_name 'Fleetwood Mac'

-- By RVTR
SELECT
  track_id,
  retroverse_track_id,
  canonical_title,
  canonical_artist_name,
  first_chart_date,
  peak_hot100_position,
  chart_weeks,
  has_hot100,
  has_vdj_media,
  has_video,
  has_audio,
  has_youtube,
  identity_source,
  version_count,
  review_flag
FROM canonical_track_display
WHERE upper(trim(track_id)) = upper(trim(:'rvtr'))
   OR upper(trim(coalesce(retroverse_track_id, ''))) = upper(trim(:'rvtr'))
LIMIT 5;

-- By artist (mirrors searchCanonicalTracksByArtist ordering)
SELECT
  track_id,
  canonical_title,
  peak_hot100_position,
  chart_weeks,
  has_hot100,
  has_vdj_media,
  identity_source
FROM canonical_track_display
WHERE lower(trim(canonical_artist_name)) = lower(trim(:'artist_name'))
ORDER BY
  has_hot100 DESC,
  peak_hot100_position ASC NULLS LAST,
  chart_weeks DESC,
  canonical_title ASC
LIMIT 20;

-- By title needle (mirrors searchCanonicalTracksByTitle)
SELECT
  track_id,
  canonical_title,
  canonical_artist_name,
  peak_hot100_position,
  has_hot100
FROM canonical_track_display
WHERE canonical_title ILIKE '%' || :'title_needle' || '%'
ORDER BY
  has_hot100 DESC,
  peak_hot100_position ASC NULLS LAST,
  chart_weeks DESC,
  canonical_title ASC
LIMIT 20;

-- Versions for one RVTR (recordings / sources)
SELECT
  ctd.track_id,
  v.source_type,
  v.source_title,
  v.source_artist,
  v.source_album,
  v.version_type,
  v.is_primary,
  v.confidence_score
FROM canonical_track_display ctd
JOIN canonical_track_versions v ON v.canonical_track_id = ctd.id
WHERE upper(trim(ctd.track_id)) = upper(trim(:'rvtr'))
ORDER BY v.is_primary DESC, v.confidence_score DESC
LIMIT 30;

-- Corpus size check
SELECT
  count(*)::bigint AS total_rows,
  count(*) FILTER (WHERE has_hot100)::bigint AS hot100_rows,
  count(*) FILTER (WHERE has_vdj_media)::bigint AS vdj_rows
FROM canonical_track_display;
