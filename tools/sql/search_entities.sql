-- Canonical searchable entity index (deterministic overlay search).
-- Apply local:  npm run search:refresh-entities
-- Apply Neon:   RETROVERSE_PG_HOST=… RETROVERSE_PG_PASSWORD=… npm run search:refresh-entities
-- Refresh after graph imports: REFRESH MATERIALIZED VIEW CONCURRENTLY search_entities;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP MATERIALIZED VIEW IF EXISTS search_entities;

CREATE MATERIALIZED VIEW search_entities AS
SELECT
  'artist'::text AS entity_type,
  a.canonical_name AS label,
  regexp_replace(
    regexp_replace(lower(trim(a.canonical_name)), '^the\s+', '', 'g'),
    '[^a-z0-9]+',
    ' ',
    'g'
  ) AS normalized_label,
  NULL::text AS rv_id,
  regexp_replace(
    regexp_replace(lower(trim(a.canonical_name)), '^the\s+', '', 'g'),
    '[^a-z0-9]+',
    '-',
    'g'
  ) AS slug,
  NULL::text AS artist_name,
  NULL::int AS release_year,
  (
    SELECT al.canonical_cover_path
    FROM albums al
    WHERE al.artist_id = a.id AND al.canonical_cover_path IS NOT NULL
    ORDER BY al.release_year DESC NULLS LAST
    LIMIT 1
  ) AS cover_path
FROM artists a

UNION ALL

SELECT
  'album'::text,
  al.title,
  regexp_replace(
    lower(trim(al.title) || ' ' || trim(ar.canonical_name)),
    '[^a-z0-9]+',
    ' ',
    'g'
  ),
  upper(trim(aek.external_key)),
  regexp_replace(lower(trim(al.title)), '[^a-z0-9]+', '-', 'g'),
  ar.canonical_name,
  al.release_year,
  al.canonical_cover_path
FROM albums al
JOIN artists ar ON ar.id = al.artist_id
LEFT JOIN album_external_keys aek ON aek.album_id = al.id

UNION ALL

SELECT
  'track'::text,
  ctd.canonical_title,
  regexp_replace(
    lower(trim(ctd.canonical_title) || ' ' || trim(ctd.canonical_artist_name)),
    '[^a-z0-9]+',
    ' ',
    'g'
  ),
  upper(trim(ctd.track_id)),
  regexp_replace(lower(trim(ctd.canonical_title)), '[^a-z0-9]+', '-', 'g'),
  ctd.canonical_artist_name,
  NULL::int,
  NULL::text
FROM canonical_track_display ctd

UNION ALL

SELECT
  'year'::text,
  y.year_label,
  y.year_label,
  NULL::text,
  y.year_label,
  NULL::text,
  y.year_num,
  NULL::text
FROM (
  SELECT DISTINCT
    extract(year FROM ca.chart_date)::int AS year_num,
    extract(year FROM ca.chart_date)::text AS year_label
  FROM chart_appearances ca
  WHERE ca.chart_date IS NOT NULL
    AND extract(year FROM ca.chart_date) BETWEEN 1950 AND 2035
) y;

CREATE INDEX search_entities_normalized_trgm
  ON search_entities USING gin (normalized_label gin_trgm_ops);

CREATE INDEX search_entities_type_norm
  ON search_entities (entity_type, normalized_label);

CREATE INDEX search_entities_norm_prefix
  ON search_entities (normalized_label text_pattern_ops);

REFRESH MATERIALIZED VIEW search_entities;
