# Artist Coverage Audit (Phase 4C)

**Date:** 2026-06-23  
**Scope:** Read-only — can we show artist-level Owned / YouTube / Missing counts?

---

## Target output

```text
Joe Cocker
Owned: X
YouTube: X
Missing: X
Total: X
Coverage: X%
```

---

## Existing tables

| Table / view | Relevant fields |
|--------------|-----------------|
| `canonical_track_display` | `track_id` (RVTR), `canonical_artist_name`, `has_hot100`, `has_vdj_media`, `peak_hot100_position` |
| `media_track_links` + `media_assets` | VIDEO path via `opsVideoMediaAndClause` |
| `youtube_video_tracks` + `youtube_videos` | RVTR-linked YouTube |
| `artists` | `canonical_name`, slug resolution |
| `chart_appearances` | Optional — chart-week scope per artist |

---

## Existing APIs / loaders

| Loader | Coverage today |
|--------|----------------|
| `loadArtistChartedSongs` | Returns `has_vdj_media` as `inLibrary` per Hot 100 song — **not VIDEO-specific** |
| `loadArtistPage` | `library_tracks` count from `has_vdj_media` |
| `GET /api/playback/[rvtr]` | Per-track owned/youtube resolution |
| **`loadTrackCoverageByRvtr`** (Phase 4) | Batch RVTR → owned / youtube / missing |

No public artist-level coverage aggregate API exists yet.

---

## Existing graph joins

**Artist → RVTR songs (Hot 100):**

```sql
SELECT track_id, ...
FROM canonical_track_display
WHERE lower(regexp_replace(trim(canonical_artist_name), '^the\s+', '', 'i'))
  = lower(regexp_replace(trim($artist), '^the\s+', '', 'i'))
  AND has_hot100 = true
```

Already used in `lib/artist/load-artist-charted-songs.ts`.

**Per-RVTR coverage (Phase 4 pattern):**

```sql
-- owned: media_track_links + opsVideoMediaAndClause
-- youtube: youtube_video_tracks (approved/pending, exact/high)
```

See `lib/charts/load-track-coverage-batch.ts`.

---

## Browser Plus data (ops reference)

Browser Plus does not expose a public artist aggregate. Ops uses:

- `loadChartUniverseIndex()` — all Hot 100 RVTRs
- `videoRvtrSet()` — RVTRs with files under `/DJ MEDIA/VIDEO/`
- Gap rows = chart RVTRs not in video set

Artist filtering in Browser Plus is path/search scoped, not artist-coverage dashboard.

---

## Lowest-risk implementation path

1. **Reuse `loadArtistChartedSongs(slug)`** to get RVTR list for artist.
2. **Call `loadTrackCoverageByRvtr(rvtrs)`** (already built Phase 4).
3. **Aggregate counts** server-side in artist page or `/artist/[slug]/songs`:

```typescript
const counts = { owned: 0, youtube: 0, missing: 0 };
for (const rvtr of rvtrs) {
  const status = coverageMap.get(rvtr) ?? 'missing';
  counts[status] += 1;
}
const total = rvtrs.length;
const coveragePct = total ? Math.round(((counts.owned + counts.youtube) / total) * 100) : 0;
```

4. **Display** on artist charts tab or songs list header — RV2 badge row, no new route.

**Do not use** raw `has_vdj_media` for Owned — use VIDEO clause (Phase 4 standard).

---

## Missing pieces

| Gap | Notes |
|-----|-------|
| Artist page UI slot | No coverage summary component yet |
| Album-only artists | Count Hot 100 RVTRs only for consistency |
| Cached aggregate | Optional — compute on page load with `revalidate` |

---

## Summary

Artist coverage is **feasible without new tables** by composing existing artist song loader + Phase 4 batch coverage. One server function + one UI block on `/artist/[slug]/charts` or `/songs`.
