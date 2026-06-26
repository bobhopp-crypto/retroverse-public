# SQL Call Graph — /retroverse-2/song/RVTR025701

Instrumentation: temporary pool.query hook in `tools/experience/audit-song-page-queries.ts` (CLI only, no production changes).

| Field | Value |
|-------|-------|
| Route | `/retroverse-2/song/RVTR025701` |
| Track | Polk Salad Annie — Tony Joe White |
| Year | 1969 |
| Captured | 2026-06-25T16:38:32.536Z |
| **Total SQL executions (single request)** | **29** |
| Distinct query shapes | 19 |
| With separate generateMetadata pass | 35 (+6) |
| Package/research SQL | 0 (JSON file read only) |
| buildPatronSongExperience SQL | 0 |

## 1. Call graph

```
GET /retroverse-2/song/RVTR025701
│
├─ generateMetadata()                    [optional separate pass, +6 SQL if uncached]
│  └─ loadTrackPage(rvtr)                lib/track/load-track-page.ts
│
└─ Retroverse2SongPage                   app/retroverse-2/song/[rvtr]/page.tsx
   │
   ├─ loadTrackPage(rvtr)                → hero: title, artist, year, coverUrl, chart meta
   │  ├─ inspectPing
   │  ├─ canonical_track_display          (track resolve)
   │  ├─ canonical_album_tracks + artwork  (album/cover)
   │  ├─ chart_appearances + canonical_tracks (trajectory)
   │  ├─ canonical_track_display          (related tracks)
   │  └─ loadTrackCoverageByRvtr          (hasVdjMedia flag)
   │
   ├─ Promise.all
   │  ├─ loadArtistPage(slug)            → AttractTourExperience / LivingSongExperience shelves
   │  │  ├─ resolveArtistFromSlug
   │  │  ├─ 6× parallel artist/chart queries
   │  │  ├─ track→album RVAL cover batch
   │  │  └─ loadRelatedArtistsFromGraph   (home-search HTTP unavailable)
   │  │
   │  ├─ yearDestination()               → year discovery + defining artists
   │  │  ├─ loadRvYearChartHistoryCore     (1969 Hot100 ∪ Album200)
   │  │  └─ enrichRvYearDestination
   │  │     ├─ resolveArtistFromSlug ×N   (defining artists for year)
   │  │     └─ loadTrackCoverageByRvtr   (year top singles coverage)
   │  │
   │  ├─ resolveTrackPlayback(rvtr)      → RetroverseVideoPlayer
   │  │  ├─ canonical_track_display      (redundant title/artist)
   │  │  ├─ youtube_video_tracks
   │  │  └─ media_track_links + media_assets
   │  │
   │  └─ loadSongControlPackage          → JSON only, no SQL
   │
   └─ loadPatronSongExperience           → AttractTour + LivingSong (no SQL)
      └─ buildPatronSongExperience OR experience.json hydrate

Client (post-hydration, not counted):
├─ LiveChannelFollower → fetch /api/sunday-nights/current
└─ RetroverseVideoPlayer → SSR playback manifest only
```

## 2. Grouped query table

| # | × | Purpose | Module | Page/component path | Consumption | Tables hit | Gone w/ experience.json |
|--:|--:|---------|--------|----------------------|-------------|------------|-------------------------|
| 1 | 3 | Postgres connectivity ping | `lib/track/load-track-page.ts` | page.tsx → loadTrackPage → hero section | fallback/debug | — | no |
| 2 | 1 | Resolve track by RVTR | `lib/track/load-track-page.ts` | page.tsx → loadTrackPage → hero section | hero | canonical_track_display | no |
| 3 | 1 | Track album links + cover artwork | `lib/track/load-track-page.ts` | page.tsx → loadTrackPage → hero section | artwork | canonical_album_tracks, tracks, albums, album_artwork_links, album_external_keys | no |
| 4 | 1 | Track chart trajectory (canonical join) | `lib/track/load-track-page.ts` | page.tsx → loadTrackPage → hero section | chart journey | canonical_tracks, chart_appearances, tracks | yes |
| 5 | 1 | Related tracks by same artist | `lib/track/load-track-page.ts` | page.tsx → loadTrackPage → hero section | related songs | canonical_track_display | yes |
| 6 | 2 | Video coverage batch (owned VIDEO + YouTube) | `lib/charts/load-track-coverage-batch.ts` | page.tsx → coverage badge (hero + year singles) | hero | canonical_track_display, canonical_track_versions, media_track_links, media_assets, tracks, youtube_video_tracks | no |
| 7 | 1 | Track chart trajectory (canonical join) | `lib/artist/load-chart-history.ts` | page.tsx → yearDestination → year discovery shelf | chart journey | canonical_track_display, canonical_tracks, canonical_album_tracks, chart_appearances, tracks, artists, albums, album_external_keys | yes |
| 8 | 7 | Artist lookup by slug | `lib/artist/resolve-artist.ts` | page.tsx → resolveArtistFromSlug (artist/year enrichment) | discovery shelves | artists | yes |
| 9 | 1 | Playback track title/artist confirm | `lib/playback/resolve-track-playback.ts` | page.tsx → resolveTrackPlayback → RetroverseVideoPlayer | hero | canonical_track_display | yes |
| 10 | 1 | YouTube playback link lookup | `lib/playback/resolve-track-playback.ts` | page.tsx → resolveTrackPlayback → RetroverseVideoPlayer | hero | tracks, youtube_video_tracks, youtube_videos | no |
| 11 | 1 | Owned media asset lookup for playback | `lib/playback/resolve-track-playback.ts` | page.tsx → resolveTrackPlayback → RetroverseVideoPlayer | hero | canonical_track_display, media_track_links, media_assets | no |
| 12 | 1 | Artist essential albums | `lib/artist/load-artist-page.ts` | page.tsx → loadArtistPage → AttractTour / LivingSong discovery | discovery shelves | canonical_album_tracks, chart_appearances, tracks, albums, album_artwork_links, album_external_keys | yes |
| 13 | 1 | Resolve track by RVTR | `lib/artist/load-artist-page.ts` | page.tsx → loadArtistPage → AttractTour / LivingSong discovery | hero | canonical_track_display | no |
| 14 | 1 | Artist dominant chart years | `lib/artist/load-artist-page.ts` | page.tsx → loadArtistPage → AttractTour / LivingSong discovery | discovery shelves | chart_appearances, tracks | yes |
| 15 | 1 | Artist chart decades | `lib/artist/load-artist-page.ts` | page.tsx → loadArtistPage → AttractTour / LivingSong discovery | discovery shelves | chart_appearances, tracks | yes |
| 16 | 1 | Resolve track by RVTR | `lib/artist/load-artist-page.ts` | page.tsx → loadArtistPage → AttractTour / LivingSong discovery | hero | canonical_track_display, chart_appearances, tracks, albums | no |
| 17 | 1 | Track→album RVAL for artist signature track covers | `lib/artist/load-artist-page.ts` | page.tsx → loadArtistPage → AttractTour / LivingSong discovery | artwork | canonical_album_tracks, tracks, album_external_keys | no |
| 18 | 1 | Related artists via chart co-occurrence | `lib/artist/load-related-artists.ts` | page.tsx → loadArtistPage → discovery shelves | related songs | chart_appearances, tracks, artists, albums, album_artwork_links | yes |
| 19 | 2 | Artist lookup by exact name | `lib/artist/resolve-artist.ts` | page.tsx → resolveArtistFromSlug (artist/year enrichment) | discovery shelves | artists | yes |

## 3. Execution timeline (first occurrence order)

1. `loadTrackPageImpl` — Postgres connectivity ping
2. `loadTrackPageImpl` — Resolve track by RVTR
3. `loadTrackPageImpl` — Track album links + cover artwork
4. `loadTrackPageImpl` — Track chart trajectory (canonical join)
5. `loadTrackPageImpl` — Related tracks by same artist
6. `loadTrackCoverageByRvtr` — Video coverage batch (owned VIDEO + YouTube)
7. `loadArtistPageImpl` — Postgres connectivity ping
8. `queryWeeklyChartRows` — Track chart trajectory (canonical join)
9. `resolveTrackPlaybackImpl` — Postgres connectivity ping
10. `resolveArtistFromSlugImpl` — Artist lookup by slug
11. `resolveTrackPlaybackImpl` — Playback track title/artist confirm
12. `resolveTrackPlaybackImpl` — YouTube playback link lookup
13. `resolveTrackPlaybackImpl` — Owned media asset lookup for playback
14. `loadArtistPageImpl` — Artist essential albums
15. `loadArtistPageImpl` — Resolve track by RVTR
16. `loadArtistPageImpl` — Artist dominant chart years
17. `loadArtistPageImpl` — Artist chart decades
18. `loadArtistPageImpl` — Resolve track by RVTR
19. `loadArtistPageImpl` — Track→album RVAL for artist signature track covers
20. `loadRelatedArtistsFromGraph` — Related artists via chart co-occurrence
21. `resolveArtistFromSlugImpl` — Artist lookup by slug
22. `resolveArtistFromSlugImpl` — Artist lookup by slug
23. `resolveArtistFromSlugImpl` — Artist lookup by slug
24. `resolveArtistFromSlugImpl` — Artist lookup by slug
25. `resolveArtistFromSlugImpl` — Artist lookup by slug
26. `resolveArtistFromSlugImpl` — Artist lookup by slug
27. `resolveArtistId` — Artist lookup by exact name
28. `resolveArtistId` — Artist lookup by exact name
29. `loadTrackCoverageByRvtr` — Video coverage batch (owned VIDEO + YouTube)

## 4. Suspected hot paths

1. **Year enrichment loop** — `enrichRvYearDestination` calls `resolveArtistFromSlug` once per defining artist (~6–7× identical slug-query shape). Highest duplicate pattern on this page.
2. **Dual track resolve** — `canonical_track_display` hit 3× with different column sets: `loadTrackPage` (full row), `resolveTrackPlayback` (title/artist only), `loadArtistPage` (signature tracks batch).
3. **Dual coverage batch** — `loadTrackCoverageByRvtr` runs from both `loadTrackPage` (hero badge) and `enrichRvYearDestination` (year top singles). Same CTE shape, different RVTR sets.
4. **Full artist page fetch for one song** — `loadArtistPage` pulls albums, tracks, year/decade aggregates, stats, and related artists even though song page only needs discovery shelf cards.
5. **RV year chart union** — large Hot 100 ∪ Album 200 scan for 1969; feeds year destination shelf only.

## 5. Duplicate / repeated queries (precompute candidates)

| Query | × | Recommendation |
|-------|--:|------------------|
| Artist lookup by slug | 7 | Runs 7× — batch or cache at package build time |
| Postgres connectivity ping | 3 | Runs 3× — batch or cache at package build time |
| Video coverage batch (owned VIDEO + YouTube) | 2 | Runs 2× — batch or cache at package build time |
| Artist lookup by exact name | 2 | Runs 2× — batch or cache at package build time |
| Track chart trajectory (canonical join) | 1 | Embed trajectory in experience.json chart chapter |
| Related tracks by same artist | 1 | Embed related shelf items in experience.json |
| Track chart trajectory (canonical join) | 1 | Embed trajectory in experience.json chart chapter |
| Artist essential albums | 1 | Embed in experience.json discovery shelf payload |

## 6. experience.json-only load estimate

| Metric | Count |
|--------|------:|
| Current single-request SQL | 29 |
| Would disappear with prebuilt experience.json | ~17 |
| Likely remain (hero + playback shell) | ~12 |

**Remain at page time:** track resolve (1), album/cover (1), playback media/youtube (2–3), coverage ping (1), optional coverage batch (1).

**Move to package/experience generation:** chart trajectory, related tracks, full artist page queries, RV year union, defining-artist slug resolves, discovery shelf assembly, era exhibit inputs.

## 7. Table hit summary

| Table | Query executions touching it |
|-------|------------------------------:|
| `tracks` | 12 |
| `artists` | 11 |
| `canonical_track_display` | 9 |
| `chart_appearances` | 7 |
| `albums` | 5 |
| `canonical_album_tracks` | 4 |
| `album_external_keys` | 4 |
| `album_artwork_links` | 3 |
| `media_track_links` | 3 |
| `media_assets` | 3 |
| `youtube_video_tracks` | 3 |
| `canonical_tracks` | 2 |
| `canonical_track_versions` | 2 |
| `youtube_videos` | 1 |

Note: `canonical_track_versions` appears inside coverage subquery only. No package/research tables queried — package loaded from filesystem JSON.

## 8. What should move into package/experience generation

| Data need | Current source | Move to |
|-----------|----------------|---------|
| Chart journey chapter | chart_appearances + canonical_tracks | experience.json `chart` chapter |
| Story chapters | song package JSON (already) | experience.json (already planned) |
| Discovery shelves (artist/related/year/album) | loadArtistPage + yearDestination + related tracks | experience.json `discoveryShelves` |
| Timeline events | package intel (JSON) | experience.json |
| Related songs cards | canonical_track_display same-artist | experience.json shelf items |
| Year destination defining artists | enrichRvYearDestination slug loop | experience build-time href resolution |
| Hero title/artist/year/cover | loadTrackPage | **stay on page** (or slim hero DTO in experience.json) |
| Video playback URL | resolveTrackPlayback | **stay on page** (playback is runtime/media) |

## 9. Query details (SQL shapes)

### 1. Postgres connectivity ping (3×)

- 1× `loadTrackPageImpl ← lib/track/load-track-page.ts`
- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`
- 1× `resolveTrackPlaybackImpl ← lib/playback/resolve-track-playback.ts`

```sql
SELECT 1::int AS ok
```

### 2. Resolve track by RVTR (1×)

- 1× `loadTrackPageImpl ← lib/track/load-track-page.ts`

```sql
SELECT track_id, canonical_title, canonical_artist_name, first_chart_date::text AS first_chart_date,
               peak_hot100_position, chart_weeks, has_hot100
        FROM canonical_track_display
        WHERE upper(trim(track_id)) = upper(trim($1))
           OR upper(trim(coalesce(retroverse_track_id, ''))) = upper(trim($1))
        LIMIT 1
```

### 3. Track album links + cover artwork (1×)

- 1× `loadTrackPageImpl ← lib/track/load-track-page.ts`

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
                        aal.updated_at DESC NULLS LAST,
                        aal.id DESC
               LIMIT 1
             ) AS artwork_updated_at
      FROM canonical_album_tracks cat
      JOIN albums al ON 
-- … truncated …
```

### 4. Track chart trajectory (canonical join) (1×)

- 1× `loadTrackPageImpl ← lib/track/load-track-page.ts`

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

### 5. Related tracks by same artist (1×)

- 1× `loadTrackPageImpl ← lib/track/load-track-page.ts`

```sql
SELECT track_id, canonical_title, peak_hot100_position, first_chart_date::text AS first_chart_date
      FROM canonical_track_display
      WHERE lower(regexp_replace(trim(canonical_artist_name), '^the\s+', '', 'i'))
        = lower(regexp_replace(trim($1), '^the\s+', '', 'i'))
        AND upper(trim(track_id)) <> upper(trim($2))
      ORDER BY first_chart_date ASC NULLS LAST, canonical_title ASC
      LIMIT 4
```

### 6. Video coverage batch (owned VIDEO + YouTube) (2×)

- 2× `loadTrackCoverageByRvtr ← lib/charts/load-track-coverage-batch.ts`

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
          AND yvt.review_flag IN ('approved', 'pending')
          AND yvt.confidence IN ('exact', 'high')
      ) AS has_youtube
    FROM rvtr_list r
```

### 7. Track chart trajectory (canonical join) (1×)

- 1× `queryWeeklyChartRows ← lib/artist/load-chart-history.ts`

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
    WHERE ca.chart_name = 'Billboard Hot 100'
      AND ca.chart_position = 1
    AND EXTRACT(YEAR FROM ca.chart_date)::int = $1
  
    UNION ALL
    
    SELECT
      (
        SELECT upper(aek.external_key)
        FROM album_externa
-- … truncated …
```

### 8. Artist lookup by slug (7×)

- 7× `resolveArtistFromSlugImpl ← lib/artist/resolve-artist.ts`

```sql
SELECT id, canonical_name FROM artists
    WHERE lower(regexp_replace(trim(canonical_name), '[^a-z0-9]+', '-', 'g')) = lower($1)
       OR lower(regexp_replace(
            regexp_replace(trim(canonical_name), '^the\s+', '', 'i'),
            '[^a-z0-9]+', '-', 'g'
          )) = lower($1)
    LIMIT 1
```

### 9. Playback track title/artist confirm (1×)

- 1× `resolveTrackPlaybackImpl ← lib/playback/resolve-track-playback.ts`

```sql
SELECT canonical_title, canonical_artist_name
      FROM canonical_track_display
      WHERE upper(trim(track_id)) = upper(trim($1))
         OR upper(trim(coalesce(retroverse_track_id, ''))) = upper(trim($1))
      LIMIT 1
```

### 10. YouTube playback link lookup (1×)

- 1× `resolveTrackPlaybackImpl ← lib/playback/resolve-track-playback.ts`

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

### 11. Owned media asset lookup for playback (1×)

- 1× `resolveTrackPlaybackImpl ← lib/playback/resolve-track-playback.ts`

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

### 12. Artist essential albums (1×)

- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`

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
      ORDER BY al.release_year ASC NULLS LAST, al.title ASC
      LIMIT 24
```

### 13. Resolve track by RVTR (1×)

- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`

```sql
SELECT track_id, canonical_title, peak_hot100_position, chart_weeks,
             first_chart_date::text AS first_chart_date, has_vdj_media
      FROM canonical_track_display
      WHERE lower(regexp_replace(trim(canonical_artist_name), '^the\s+', '', 'i'))
        = lower(regexp_replace(trim($1), '^the\s+', '', 'i'))
      ORDER BY first_chart_date ASC NULLS LAST, canonical_title ASC
      LIMIT 12
```

### 14. Artist dominant chart years (1×)

- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`

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

### 15. Artist chart decades (1×)

- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`

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

### 16. Resolve track by RVTR (1×)

- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`

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
        (SELECT count(*)::int FROM canonical_track_display ctd
          WHERE lower(regexp_replace(trim(ctd.canonical_artist_name), '^the\s+', '', 'i'))
            = lower(regexp_replace(trim($2), '^the\s+', '', 'i'))
            AND ctd.has_vdj_media) AS li
-- … truncated …
```

### 17. Track→album RVAL for artist signature track covers (1×)

- 1× `loadArtistPageImpl ← lib/artist/load-artist-page.ts`

```sql
SELECT DISTINCT ON (cat.canonical_track_key)
        cat.canonical_track_key AS track_key,
        aek.external_key AS rval
      FROM canonical_album_tracks cat
      JOIN album_external_keys aek ON aek.album_id = cat.album_id
      WHERE cat.canonical_track_key = ANY($1::text[])
      ORDER BY cat.canonical_track_key, cat.position
```

### 18. Related artists via chart co-occurrence (1×)

- 1× `loadRelatedArtistsFromGraph ← lib/artist/load-related-artists.ts`

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
      AND ca2.track_id <> ca1.track_id
    JOIN tracks t2 ON t2.id = ca2.track_id
    JOIN artists ar2 ON ar2.id = t2.artist_id
    WHERE t1.artist_id = $1
      AND t2.artist_id <> $1
      AND ca1.chart_name = 'Billb
-- … truncated …
```

### 19. Artist lookup by exact name (2×)

- 2× `resolveArtistId ← lib/artist/resolve-artist.ts`

```sql
SELECT id, canonical_name FROM artists WHERE lower(trim(canonical_name)) = lower(trim($1)) LIMIT 1
```

