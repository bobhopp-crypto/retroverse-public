# YouTube Production Phase 1 — Migration Report

**Date:** 2026-06-23  
**Target:** Neon `RetroVerse` / branch `production` / database `neondb`  
**Scope:** `youtube_videos`, `youtube_video_tracks` only — no UI or app code changes

---

## Summary

Phase 1 complete. Production now has canonical YouTube video metadata and RVTR links synced from local. `resolveTrackPlayback` returns watch URLs instead of search fallbacks for linked tracks.

---

## 1. Production Schema (pre-migration)

| Object | Status |
|--------|--------|
| `youtube_videos` | **Missing** |
| `youtube_video_tracks` | **Missing** |
| `youtube_track_links` | Present (legacy, untouched) |

Database: `neondb` on Neon project `solitary-bonus-45291527`, branch `br-old-fog-aqo17qea`.

---

## 2. Schema Created

Applied local DDL (indexes, sequences, FK constraints):

- `youtube_videos` — PK, unique on `youtube_id`, 4 indexes
- `youtube_video_tracks` — PK, FK → `youtube_videos(youtube_id)` ON DELETE CASCADE, FK → `tracks(id)`, 3 indexes

---

## 3–4. Data Import

| Source | Method | Rows imported |
|--------|--------|---------------|
| Local `youtube_videos` | `pg_dump --data-only` → `psql` COPY | **13,202** |
| Local `youtube_video_tracks` | same | **13,064** |

Dump files used:
- `/tmp/youtube-schema-prod.sql` (~5.6 KB)
- `/tmp/youtube-data-prod.sql` (~68 MB)

Pre-import FK check: **0** missing `track_id` references in prod (12,301 distinct track IDs validated).

---

## 5. Row Count Validation

| Table | Local | Production | Match |
|-------|------:|-----------:|:-----:|
| `youtube_videos` | 13,202 | 13,202 | ✓ |
| `youtube_video_tracks` | 13,064 | 13,064 | ✓ |

Post-import FK integrity:
- Orphan `youtube_video_id` refs: **0**
- Orphan `track_id` refs: **0**

---

## 6. Spot-Check (20 RVTRs)

All 20 sample RVTRs present in prod with valid 11-char YouTube IDs:

| RVTR | YouTube ID |
|------|------------|
| RVTR846047 | H2R3o35fA14 |
| RVTR108692 | GF8pUppLci4 |
| RVTR033074 | j3Y5UCzVElU |
| RVTR510953 | 9dJxLa_eJnk |
| RVTR539242 | lOfZLb33uCg |
| RVTR483205 | C_TfBbR6L0M |
| RVTR632374 | ZcJjMnHoIBI |
| RVTR544132 | t2mU6USTBRE |
| RVTR233269 | BvUZijEuNDQ |
| RVTR658693 | Gl1vulzQDwU |
| RVTR856287 | notKtAgfwDA |
| RVTR013925 | 6ZlLQLFq_H4 |
| RVTR868735 | FklUAoZ6KxY |
| RVTR197621 | N9qYF9DZPdw |
| RVTR203202 | 8Gv0H-vPoDc |
| RVTR690612 | xiVqKFDqxyg |
| RVTR854173 | CcGgwIpl-cY |
| RVTR977146 | F60JsBA-fjA |
| RVTR532820 | 4nzMnZAeRtU |
| RVTR793771 | 3wmn1YdHZCM |

---

## 7. Playback Verification (`resolveTrackPlayback`)

Tested via production API: `GET https://retroverse-public.vercel.app/api/playback/{RVTR}`

| Metric | Before | After |
|--------|--------|-------|
| RVTR515161 | `source: search` | `source: youtube`, `watch?v=7qrRzNidzIc` |
| 20 spot-check RVTRs | N/A (tables missing) | **20/20 PASS** — canonical watch URLs |
| + RVTR515161 | — | **21/21 PASS** |

No app deploy required — existing `resolveTrackPlayback` query path picks up new tables immediately.

---

## Coverage Report

| Metric | Count |
|--------|------:|
| Canonical tracks (`canonical_track_display`) | 49,187 |
| RVTRs with approved/high YouTube link | 13,054 |
| **Coverage** | **26.5%** |
| Distinct YouTube videos | 13,202 |
| Link rows (includes multi-link edge cases) | 13,064 |

Tracks without a link continue to fall back to YouTube search URLs (unchanged behavior).

---

## Storage Impact

| Object | Size (prod) |
|--------|-------------|
| `youtube_videos` | 8.7 MB |
| `youtube_video_tracks` | 3.8 MB |
| **Combined new footprint** | **~12.5 MB** |
| Total database | 1,219 MB |

Incremental impact: **~1.0%** of current DB size.

---

## Migration Runtime

| Step | Duration |
|------|----------|
| Schema apply | ~2s |
| Data import (68 MB COPY) | ~3s |
| **Total** | **5 seconds** |

Started: 2026-06-23T19:03:47Z  
Completed: 2026-06-23T19:03:52Z

---

## Rollback Confirmation

Safe rollback (additive-only migration; no existing tables modified):

```sql
DROP TABLE IF EXISTS youtube_video_tracks CASCADE;
DROP TABLE IF EXISTS youtube_videos CASCADE;
```

- Legacy `youtube_track_links` is **not** affected
- Graph tables (`artists`, `albums`, `tracks`, etc.) are **not** affected
- App behavior reverts to search-url fallback for all RVTRs
- Estimated rollback time: < 1 second

Optional backup before rollback (if needed later):

```bash
pg_dump "$PROD_URL" -t youtube_videos -t youtube_video_tracks -Fc -f youtube-phase1-backup.dump
```

---

## What Was NOT Changed

Per scope:

- Song Experience UI
- Search
- Artist / Album / Live pages
- Application code or Vercel deploy

---

## Deploy Risk

**Low.** Data-only migration to new tables. No schema changes to existing graph. Verified live playback on production without redeploy.

---

## Next Steps (out of scope for Phase 1)

- Phase 2: Song Experience video thumbnail + watch button UI
- Expand YouTube coverage beyond 13,054 RVTRs (~73.5% of graph still search-only)
- Consider deprecating legacy `youtube_track_links` once new tables are canonical everywhere
