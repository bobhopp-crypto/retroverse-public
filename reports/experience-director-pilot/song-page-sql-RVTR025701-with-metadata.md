# Song Page SQL Query Report — RVTR025701

**Route:** `/retroverse-2/song/RVTR025701`
**Track:** Polk Salad Annie — Tony Joe White
**Year:** 1969
**Simulated:** 2026-06-25T16:28:15.151Z
**Metadata pass included:** yes (+1 extra loadTrackPage)
**Total SQL executions:** 35
**Distinct query shapes:** 19

## Call graph (server render)

```
Retroverse2SongPage (app/retroverse-2/song/[rvtr]/page.tsx)
├─ generateMetadata → loadTrackPage
├─ loadTrackPage → inspectPing + track/album/chart/related/coverage queries
├─ Promise.all
│  ├─ loadArtistPage → resolveArtistFromSlug + 6 parallel queries + optional track→album cover
│  ├─ yearDestination → loadRvYearChartHistory (cached RV year union)
│  ├─ resolveTrackPlayback → track + youtube + media queries
│  └─ loadSongControlPackage → JSON file only (no SQL)
└─ loadPatronSongExperience → experience.json OR buildPatronSongExperience (no SQL)

Client (after hydration, not in SQL total above):
├─ LiveChannelFollower → fetch /api/sunday-nights/current
└─ RetroverseVideoPlayer → no SQL (uses SSR playback manifest)
```

## Query groups (identical SQL normalized)

| # | Count | Purpose | experience.json impact | Primary caller |
|--:|------:|---------|------------------------|----------------|
| 1 | 7 | Artist lookup by slug | unchanged | resolveArtistFromSlugImpl |
| 2 | 4 | Postgres connectivity ping | unchanged | loadTrackPageImpl |
| 3 | 3 | Video coverage batch (owned VIDEO + YouTube) | unchanged | loadTrackCoverageByRvtr |
| 4 | 2 | Resolve track by RVTR | unchanged | loadTrackPageImpl |
| 5 | 2 | Track album links + cover artwork | unchanged | loadTrackPageImpl |
| 6 | 2 | Track chart trajectory (canonical join) | reduced | loadTrackPageImpl |
| 7 | 2 | Related tracks by same artist | reduced | loadTrackPageImpl |
| 8 | 2 | Artist lookup by exact name | unchanged | resolveArtistId |
| 9 | 1 | Track chart trajectory (canonical join) | reduced | queryWeeklyChartRows |
| 10 | 1 | Resolve track by RVTR | unchanged | resolveTrackPlaybackImpl |
| 11 | 1 | YouTube playback link lookup | unchanged | resolveTrackPlaybackImpl |
| 12 | 1 | Owned media asset lookup for playback | unchanged | resolveTrackPlaybackImpl |
| 13 | 1 | Artist essential albums | reduced | loadArtistPageImpl |
| 14 | 1 | Resolve track by RVTR | unchanged | loadArtistPageImpl |
| 15 | 1 | Artist dominant chart years | reduced | loadArtistPageImpl |
| 16 | 1 | Artist dominant chart years | reduced | loadArtistPageImpl |
| 17 | 1 | Artist essential albums | reduced | loadArtistPageImpl |
| 18 | 1 | Track→album RVAL for artist signature track covers | reduced | loadArtistPageImpl |
| 19 | 1 | Related artists via chart co-occurrence | reduced | loadRelatedArtistsFromGraph |

## Query details

### 1. Artist lookup by slug (7×)

**Callers:**
- 7× `resolveArtistFromSlugImpl ← lib/artist/resolve-artist.ts`

**experience.json impact:** unchanged

```sql
SELECT id, canonical_name FROM artists
    WHERE lower(regexp_replace(trim(canonical_name), '[^a-z0-9]+', '-', 'g')) = lower($1)
       OR lower(regexp_replace(
            regexp_replace(trim(canonical_name), '^the\s+', '', 'i'),
            '[^a-z0-9]+', '-', 'g'
          )) = lower($1)
    LIMIT 1
```

### 2. Postgres connectivity ping (4×)

**Callers:**
- 2× `loadTrackPageImpl ← lib/track/load-track-page.ts`
- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`
- 1× `resolveTrackPlaybackImpl ← lib/playback/resolve-track-playback.ts`

**experience.json impact:** unchanged

```sql
SELECT 1::int AS ok
```

### 3. Video coverage batch (owned VIDEO + YouTube) (3×)

**Callers:**
- 3× `loadTrackCoverageByRvtr ← lib/charts/load-track-coverage-batch.ts`

**experience.json impact:** unchanged

```sql
WITH rvtr_list AS (
      SELECT upper(trim(x)) AS rvtr FROM unnest($1::text[]) AS x
    )
    SELECT
      r.rvtr,
      
    EXISTS (
      SELECT 1
      FROM canonical_track_display ctd_cov
      JOIN canonical_track_versions ctv_cov
        ON ctv_cov.canonical_track_id = ctd_cov.id AND ctv_cov.is_primary IS TRUE
      JOIN media_track_links mtl_cov ON mtl_cov.track_id = ctv_cov.graph_track_id
      JOIN media_assets ma_cov ON ma_cov.id = mtl_cov.media_asset_id
      WHERE upper(trim(coalesce(ctd_cov.retroverse_track_id, ctd_cov.track_id))) = upper(trim(r.rvtr))
      
    AND coalesce(ma_cov.source_path, ma_cov.directory_path, '') ILIKE '%/VIDEO/%'
    AND coalesce(ma_cov.source_path, ma_cov.directory_path, '') NOT ILIKE '%/MUSIC/%'
    AND coalesce(ma_cov.source_path, ma_cov.directory_path, '') NOT ILIKE '%/VIDEO VAULT/%'
    AND (
      lower(coalesce(ma_cov.file_extension, '')) IN ('mp4', 'mkv', 'mov', 'avi', 'm4v')
      OR lower(coalesce(ma_cov.filename, '')) ~ '\.(mp4|mkv|mov|avi|m4v)$'
    )
  
    )
   AS has_owned_video,
      EXISTS (
        SELECT 1
        FROM youtube_video_tracks yvt
        WHERE upper(trim(yvt.rvtr)) = r.rvtr
          AND yvt.review_flag IN 
-- … truncated …
```

### 4. Resolve track by RVTR (2×)

**Callers:**
- 2× `loadTrackPageImpl ← lib/track/load-track-page.ts`

**experience.json impact:** unchanged

```sql
SELECT track_id, canonical_title, canonical_artist_name, first_chart_date::text AS first_chart_date,
               peak_hot100_position, chart_weeks, has_hot100
        FROM canonical_track_display
        WHERE upper(trim(track_id)) = upper(trim($1))
           OR upper(trim(coalesce(retroverse_track_id, ''))) = upper(trim($1))
        LIMIT 1
```

### 5. Track album links + cover artwork (2×)

**Callers:**
- 2× `loadTrackPageImpl ← lib/track/load-track-page.ts`

**experience.json impact:** unchanged

```sql
SELECT al.title, al.release_year, aek.external_key AS rval,
             al.canonical_cover_path AS cover_path,
             (
               SELECT aal.canonical_cover_path FROM album_artwork_links aal
               WHERE aal.album_id = al.id
               ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC,
                        aal.confidence_score DESC NULLS LAST,
                        aal.updated_at DESC NULLS LAST,
                        aal.id DESC
               LIMIT 1
             ) AS artwork_path,
             (
               SELECT aal.r2_cover_key FROM album_artwork_links aal
               WHERE aal.album_id = al.id
               ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC,
                        aal.confidence_score DESC NULLS LAST,
                        aal.updated_at DESC NULLS LAST,
                        aal.id DESC
               LIMIT 1
             ) AS r2_cover_key,
             (
               SELECT aal.updated_at::text FROM album_artwork_links aal
               WHERE aal.album_id = al.id
               ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC,
                        aal.confidence_score DESC NULLS LAST,
              
-- … truncated …
```

### 6. Track chart trajectory (canonical join) (2×)

**Callers:**
- 2× `loadTrackPageImpl ← lib/track/load-track-page.ts`

**experience.json impact:** reduced

```sql
SELECT ca.chart_date::text AS chart_date, ca.chart_name, ca.chart_position,
             COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart
      FROM chart_appearances ca
      JOIN canonical_tracks ct ON ct.graph_track_id = ca.track_id
      WHERE upper(trim(ct.track_id)) = upper(trim($1))
         OR upper(trim(coalesce(ct.retroverse_track_id, ''))) = upper(trim($1))
      ORDER BY
        CASE WHEN ca.chart_name ILIKE '%Hot 100%' THEN 0 ELSE 1 END,
        ca.chart_date ASC,
        ca.chart_position ASC
```

### 7. Related tracks by same artist (2×)

**Callers:**
- 2× `loadTrackPageImpl ← lib/track/load-track-page.ts`

**experience.json impact:** reduced

```sql
SELECT track_id, canonical_title, peak_hot100_position, first_chart_date::text AS first_chart_date
      FROM canonical_track_display
      WHERE lower(regexp_replace(trim(canonical_artist_name), '^the\s+', '', 'i'))
        = lower(regexp_replace(trim($1), '^the\s+', '', 'i'))
        AND upper(trim(track_id)) <> upper(trim($2))
      ORDER BY first_chart_date ASC NULLS LAST, canonical_title ASC
      LIMIT 4
```

### 8. Artist lookup by exact name (2×)

**Callers:**
- 2× `resolveArtistId ← lib/artist/resolve-artist.ts`

**experience.json impact:** unchanged

```sql
SELECT id, canonical_name FROM artists WHERE lower(trim(canonical_name)) = lower(trim($1)) LIMIT 1
```

### 9. Track chart trajectory (canonical join) (1×)

**Callers:**
- 1× `queryWeeklyChartRows ← lib/artist/load-chart-history.ts`

**experience.json impact:** reduced

```sql
SELECT
      (
        SELECT upper(trim(coalesce(nullif(trim(ct.retroverse_track_id::text), ''), ctd.track_id)))
        FROM canonical_tracks ct
        JOIN canonical_track_display ctd ON ctd.id = ct.id
        WHERE ct.graph_track_id = t.id
          AND upper(trim(coalesce(nullif(trim(ct.retroverse_track_id::text), ''), ctd.track_id))) ~ '^RVTR\d{6}$'
        LIMIT 1
      ) AS track_id,
      t.title AS track_title,
      ca.chart_date::text AS chart_date,
      ca.chart_position,
      COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart,
      ca.chart_name,
      COALESCE(ar.canonical_name, '') AS artist_name,
      al.canonical_cover_path AS cover_path,
      NULL::int AS release_year,
      NULL::text AS artwork_path,
      NULL::text AS r2_cover_key
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN LATERAL (
      SELECT cat.album_id
      FROM canonical_album_tracks cat
      WHERE upper(trim(cat.canonical_track_key::text)) = upper(trim(t.id::text))
      ORDER BY cat.position
      LIMIT 1
    ) link ON true
    LEFT JOIN albums al ON al.id = link.album_id
    WHERE ca.chart_name = 'Billboar
-- … truncated …
```

### 10. Resolve track by RVTR (1×)

**Callers:**
- 1× `resolveTrackPlaybackImpl ← lib/playback/resolve-track-playback.ts`

**experience.json impact:** unchanged

```sql
SELECT canonical_title, canonical_artist_name
      FROM canonical_track_display
      WHERE upper(trim(track_id)) = upper(trim($1))
         OR upper(trim(coalesce(retroverse_track_id, ''))) = upper(trim($1))
      LIMIT 1
```

### 11. YouTube playback link lookup (1×)

**Callers:**
- 1× `resolveTrackPlaybackImpl ← lib/playback/resolve-track-playback.ts`

**experience.json impact:** unchanged

```sql
SELECT DISTINCT ON (yv.youtube_id)
             yv.youtube_id, yv.title
      FROM youtube_video_tracks yvt
      JOIN youtube_videos yv ON yv.youtube_id = yvt.youtube_video_id
      WHERE upper(trim(yvt.rvtr)) = upper(trim($1))
        AND yvt.review_flag IN ('approved', 'pending')
        AND yvt.confidence IN ('exact', 'high')
      ORDER BY
        yv.youtube_id,
        CASE yvt.confidence WHEN 'exact' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
        yvt.id ASC
      LIMIT 1
```

### 12. Owned media asset lookup for playback (1×)

**Callers:**
- 1× `resolveTrackPlaybackImpl ← lib/playback/resolve-track-playback.ts`

**experience.json impact:** unchanged

```sql
SELECT ma.id AS media_asset_id, ma.r2_media_key, ma.source_path
      FROM media_track_links mtl
      JOIN media_assets ma ON ma.id = mtl.media_asset_id
      JOIN canonical_track_display ctd ON ctd.track_id::text = mtl.track_id::text
      WHERE upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) = upper(trim($1))
      
    AND coalesce(ma.source_path, ma.directory_path, '') ILIKE '%/VIDEO/%'
    AND coalesce(ma.source_path, ma.directory_path, '') NOT ILIKE '%/MUSIC/%'
    AND coalesce(ma.source_path, ma.directory_path, '') NOT ILIKE '%/VIDEO VAULT/%'
    AND (
      lower(coalesce(ma.file_extension, '')) IN ('mp4', 'mkv', 'mov', 'avi', 'm4v')
      OR lower(coalesce(ma.filename, '')) ~ '\.(mp4|mkv|mov|avi|m4v)$'
    )
  
      ORDER BY mtl.confidence_score DESC NULLS LAST, ma.id ASC
      LIMIT 1
```

### 13. Artist essential albums (1×)

**Callers:**
- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`

**experience.json impact:** reduced

```sql
SELECT
        al.id AS pg_album_id,
        al.title,
        al.release_year,
        aek.external_key AS rval,
        min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_peak,
        al.canonical_cover_path AS cover_path,
        (
          SELECT aal.canonical_cover_path FROM album_artwork_links aal
          WHERE aal.album_id = al.id
          ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
          LIMIT 1
        ) AS artwork_path,
        (
          SELECT aal.r2_cover_key FROM album_artwork_links aal
          WHERE aal.album_id = al.id
          ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
          LIMIT 1
        ) AS r2_cover_key,
        count(DISTINCT cat.id)::int AS sequence_tracks
      FROM albums al
      LEFT JOIN album_external_keys aek ON aek.album_id = al.id
      LEFT JOIN canonical_album_tracks cat ON cat.album_id = al.id
      LEFT JOIN chart_appearances ca ON ca.album_id = al.id
      WHERE al.artist_id = $1
      GROUP BY al.id, al.title, al.release_year, aek.external_key, al.canonical_cover_path
      ORDER BY al.release_year ASC NULL
-- … truncated …
```

### 14. Resolve track by RVTR (1×)

**Callers:**
- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`

**experience.json impact:** unchanged

```sql
SELECT track_id, canonical_title, peak_hot100_position, chart_weeks,
             first_chart_date::text AS first_chart_date, has_vdj_media
      FROM canonical_track_display
      WHERE lower(regexp_replace(trim(canonical_artist_name), '^the\s+', '', 'i'))
        = lower(regexp_replace(trim($1), '^the\s+', '', 'i'))
      ORDER BY first_chart_date ASC NULLS LAST, canonical_title ASC
      LIMIT 12
```

### 15. Artist dominant chart years (1×)

**Callers:**
- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`

**experience.json impact:** reduced

```sql
SELECT extract(year FROM ca.chart_date)::int AS year, count(*)::int AS count
      FROM chart_appearances ca
      JOIN tracks t ON t.id = ca.track_id
      WHERE t.artist_id = $1 AND ca.chart_name = 'Billboard Hot 100'
      GROUP BY 1
      HAVING extract(year FROM ca.chart_date)::int IS NOT NULL
      ORDER BY count DESC, year ASC
      LIMIT 8
```

### 16. Artist dominant chart years (1×)

**Callers:**
- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`

**experience.json impact:** reduced

```sql
SELECT
        (extract(year FROM ca.chart_date)::int / 10) * 10 AS decade,
        count(*)::int AS count
      FROM chart_appearances ca
      JOIN tracks t ON t.id = ca.track_id
      WHERE t.artist_id = $1 AND ca.chart_name = 'Billboard Hot 100'
      GROUP BY 1
      HAVING (extract(year FROM ca.chart_date)::int / 10) * 10 IS NOT NULL
      ORDER BY decade ASC
```

### 17. Artist essential albums (1×)

**Callers:**
- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`

**experience.json impact:** reduced

```sql
SELECT
        (SELECT count(*)::int FROM chart_appearances ca
          JOIN tracks t ON t.id = ca.track_id WHERE t.artist_id = $1 AND ca.chart_name = 'Billboard Hot 100') AS hot100_rows,
        (SELECT count(*)::int FROM canonical_track_display ctd
          WHERE lower(regexp_replace(trim(ctd.canonical_artist_name), '^the\s+', '', 'i'))
            = lower(regexp_replace(trim($2), '^the\s+', '', 'i'))
            AND ctd.peak_hot100_position IS NOT NULL AND ctd.peak_hot100_position <= 10) AS top10_hits,
        (SELECT count(DISTINCT al.id)::int FROM albums al
          JOIN chart_appearances ca ON ca.album_id = al.id
          WHERE al.artist_id = $1 AND ca.chart_name = 'Billboard 200') AS b200_albums,
        (SELECT count(DISTINCT al.id)::int FROM albums al
          JOIN chart_appearances ca ON ca.album_id = al.id
          WHERE al.artist_id = $1 AND ca.chart_name = 'Billboard 200' AND ca.chart_position <= 10) AS top10_albums,
        (SELECT min(al.release_year)::int FROM albums al WHERE al.artist_id = $1) AS min_year,
        (SELECT max(al.release_year)::int FROM albums al WHERE al.artist_id = $1) AS max_year,
        (SELECT count(*)::int FROM canonical_track_display c
-- … truncated …
```

### 18. Track→album RVAL for artist signature track covers (1×)

**Callers:**
- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`

**experience.json impact:** reduced

```sql
SELECT DISTINCT ON (cat.canonical_track_key)
        cat.canonical_track_key AS track_key,
        aek.external_key AS rval
      FROM canonical_album_tracks cat
      JOIN album_external_keys aek ON aek.album_id = cat.album_id
      WHERE cat.canonical_track_key = ANY($1::text[])
      ORDER BY cat.canonical_track_key, cat.position
```

### 19. Related artists via chart co-occurrence (1×)

**Callers:**
- 1× `loadRelatedArtistsFromGraph ← lib/artist/load-related-artists.ts`

**experience.json impact:** reduced

```sql
SELECT
      ar2.id AS artist_id,
      ar2.canonical_name,
      count(*)::int AS co_weeks,
      (
        SELECT al.canonical_cover_path
        FROM albums al
        WHERE al.artist_id = ar2.id
          AND al.canonical_cover_path IS NOT NULL
          AND trim(al.canonical_cover_path) <> ''
        ORDER BY al.release_year DESC NULLS LAST
        LIMIT 1
      ) AS cover_path,
      (
        SELECT aal.canonical_cover_path
        FROM albums al
        JOIN album_artwork_links aal ON aal.album_id = al.id
        WHERE al.artist_id = ar2.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS artwork_path,
      (
        SELECT aal.r2_cover_key
        FROM albums al
        JOIN album_artwork_links aal ON aal.album_id = al.id
        WHERE al.artist_id = ar2.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS r2_cover_key
    FROM chart_appearances ca1
    JOIN tracks t1 ON t1.id = ca1.track_id
    JOIN chart_appearances ca2
      ON ca2.chart_date = ca1.chart_date
      AND ca2.chart_name = ca1.chart_name
      AND ca2.trac
-- … truncated …
```

## experience.json as single source of truth — estimate

- **Unchanged (hero + playback shell):** ~24 query executions
- **Reduced/eliminated (experience assembly):** ~11 query executions across 9 query shapes
- Precomputed `experience.json` already avoids runtime `buildPatronSongExperience` SQL (none today); remaining savings come from **not re-fetching graph/chart/artist/discovery inputs** at page time.
- Target post-SSOT page load: **track hero query + playback query + coverage ping** (~6–8 executions), with discovery shelves and chapters read from JSON.


---

## Single-request vs metadata pass

- Single request: **29** queries
- With separate generateMetadata pass: **35** queries
- Duplicate overhead: **6** queries
