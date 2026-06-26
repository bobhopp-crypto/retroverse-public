# Chart Coverage Architecture Audit (Phase 3C)

**Date:** 2026-06-23  
**Scope:** Read-only audit — can chart rows show **Owned Video / YouTube Available / Missing** without new tables?

---

## Question

For `/week/[date]` chart rows (RVTR-backed), can we display media coverage indicators using **existing** graph fields, joins, and APIs?

---

## Desired indicators

| Label | Meaning |
|-------|---------|
| **Owned Video** | Playable file in DJ MEDIA/VIDEO linked to RVTR |
| **YouTube Available** | Approved/high-confidence YouTube link exists |
| **Missing** | Neither owned video nor curated YouTube |

---

## Existing fields

### `canonical_track_display` (primary RVTR view)

| Field | Use |
|-------|-----|
| `track_id` / `retroverse_track_id` | RVTR key |
| `has_vdj_media` | Boolean — any VDJ media link (audio **or** video) |
| `has_hot100` | Chart universe flag |
| `canonical_title`, `canonical_artist_name` | Display |

**Gap:** `has_vdj_media` is not video-specific. Audio in `/MUSIC/` can be true while VIDEO is missing.

### `media_track_links` + `media_assets`

| Field | Use |
|-------|-----|
| `media_assets.source_path` | Path-based ownership (`/DJ MEDIA/VIDEO/…`) |
| `media_assets.r2_media_key` | Cloud-hosted owned media |
| `media_assets.file_extension` | mp4/mkv/etc. |
| `mtl.confidence_score` | Link quality |

**Pattern:** `lib/ops/ops-video-media.ts` → `opsVideoMediaAndClause()` filters VIDEO-only paths.

### YouTube graph

| Table | Fields |
|-------|--------|
| `youtube_video_tracks` | `rvtr`, `review_flag`, `confidence` |
| `youtube_videos` | `youtube_id`, `title`, `thumbnail_url` |

**Pattern:** `lib/playback/resolve-track-playback.ts` — approved/pending + exact/high confidence.

### Browser Plus (ops only)

| Source | Use |
|--------|-----|
| `load-browser-plus.ts` | VDJ library scan, VIDEO folder tree |
| `chart-universe.ts` | Hot 100 RVTR set vs `isMyVideoLibraryPath(filePath)` gap rows |
| `videoRvtrSet()` | RVTRs with files under `/DJ MEDIA/VIDEO/` (excludes VIDEO VAULT) |

**Note:** Browser Plus is ops-scoped; public chart rows should not call it at runtime.

### Year Match console (ops pattern)

`lib/ops/load-year-match.ts` already computes per-RVTR:

- `has_vdj_media` (VIDEO-filtered EXISTS)
- `has_video` (same VIDEO EXISTS)
- `best_match_source_path`

This is the **reference join pattern** for owned-video detection.

---

## Existing APIs

| API | Returns coverage? |
|-----|-------------------|
| `GET /api/playback/[rvtr]` | `hasVdjMedia`, `target.source` (youtube / media_asset / search) |
| `GET /api/charts/week` | Chart rows only — **no** coverage fields today |
| Browser Plus `/api/ops/browser-plus/*` | Full library + gaps — **ops only** |

`resolveTrackPlayback` resolution order:

1. YouTube (approved link)
2. R2 media asset
3. YouTube search fallback

---

## Can we derive Owned / YouTube / Missing without new tables?

**Yes.** Classification logic already exists in separate modules; chart week loader needs a **batch join**, not a new schema.

### Proposed classification (per RVTR)

```
if EXISTS video media_asset link (opsVideoMediaAndClause) OR r2_media_key
  → Owned Video
else if EXISTS youtube_video_tracks (approved/pending + exact/high)
  → YouTube Available
else
  → Missing
```

Optional refinement: treat `has_vdj_media=true` without VIDEO path as **Missing** for video indicator (don't conflate audio).

---

## Missing pieces (implementation gaps)

| Gap | Risk | Fix |
|-----|------|-----|
| `load-chart-week-context.ts` SLICE_SQL has RVTR but no coverage join | Medium | Extend SQL with lateral EXISTS flags (same as year-match) |
| Batch 100-row chart week = 100 extra EXISTS if naive | Medium | Single query with LEFT JOIN aggregates, or batch RVTR `IN (...)` |
| `has_vdj_media` on display view conflates audio | Low | Use VIDEO path clause for public "Owned" badge |
| No public batch playback API | Low | Extend chart week context JSON with `coverage: 'owned'|'youtube'|'missing'` |
| Embed vs watch-only YouTube | Low | Phase 1 audit noted optional `embed_allowed` on `youtube_videos` — not required for badge |

**No new tables required.**

---

## Lowest-risk implementation path

### Phase 4 (future — not in scope now)

1. **Add coverage flags to chart week SQL** (`load-chart-week-context.ts`):
   - Reuse `opsVideoMediaAndClause("ma_v")` in EXISTS subquery per row (or batch post-query).
   - Reuse YouTube join from `resolve-track-playback.ts`.

2. **Extend `ChartWeekPortalRow` type** with optional:
   ```typescript
   coverage: "owned" | "youtube" | "missing";
   ```

3. **UI:** Small badge on chart row (RV2 tokens — green/cyan/muted). Skin only; no navigation change.

4. **Cache:** Chart week page already `revalidate = 3600` — coverage can piggyback.

5. **Do NOT:**
   - Create coverage tables
   - Call Browser Plus from public routes
   - Block navigation on Missing

### Alternative (even lower touch)

- Client-side: batch `GET /api/playback/RVTR` for visible rows — **avoid** (N+1, slow on full Hot 100).

---

## Data source map

```
Chart row (chart_appearances)
  → tracks → canonical_tracks → RVTR
       ├─ media_track_links → media_assets [VIDEO path] → Owned
       ├─ youtube_video_tracks → youtube_videos → YouTube
       └─ canonical_track_display.has_vdj_media → hint only (not sufficient alone)
```

---

## Summary

| Requirement | Status |
|-------------|--------|
| RVTR identity on chart rows | ✅ Already in loader |
| Owned video signal | ✅ EXISTS pattern in ops/year-match + ops-video-media |
| YouTube signal | ✅ youtube_video_tracks + resolveTrackPlayback |
| Browser Plus alignment | ✅ chart-universe gap logic (ops reference) |
| New tables needed | ❌ No |
| Public API today | ⚠️ Playback API per-RVTR only; chart week API needs extension |

**Recommendation:** Extend `loadChartWeekContext` + `ChartWeekPortalRow` with two EXISTS flags; render badges in chart-week portal CSS. Estimated touch: 2 lib files + 1 UI file. No new routes, no new systems.
