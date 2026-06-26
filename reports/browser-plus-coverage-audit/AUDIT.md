# Browser Plus Coverage Alignment Audit (Phase 4D)

**Date:** 2026-06-23  
**Scope:** Read-only — align Browser Plus with My Videos / Retroverse / Missing views.

---

## Target views

| View | Definition |
|------|------------|
| **My Videos** | Files under `/DJ MEDIA/VIDEO/` (excludes VIDEO VAULT) |
| **Retroverse** | Full Hot 100 chart universe (all chart RVTRs) |
| **Missing** | Chart Hot 100 RVTRs with no owned VIDEO file |

---

## Existing Browser Plus capabilities

### Modes (`lib/ops/browser-plus/load-browser-plus.ts`)

| Mode | Purpose |
|------|---------|
| `my-videos` | VDJ library scan — VIDEO folder files |
| `retroverse` | Chart universe rows keyed by RVTR |
| `gaps` | Chart RVTRs without VIDEO ownership |

### Path rules

```typescript
// chart-universe.ts + load-browser-plus.ts
MY_VIDEO_PATH = /\/DJ MEDIA\/VIDEO\//
VIDEO_VAULT excluded
VIDEO_EXTENSIONS = mp4, mkv, mov, avi, ...
```

`isMyVideoLibraryPath(filePath)` — canonical VIDEO ownership test.

### Chart universe index

`loadChartUniverseIndex()`:

- Reads `canonical_track_display` where RVTR pattern matches
- `hot100Rvtrs` Set — all Hot 100 canonical RVTRs
- `byRvtr` Map — title, artist, chart year metadata

### Gap detection

`buildGapRows(chartIndex, coveredRvtrs)`:

- `coveredRvtrs` = `videoRvtrSet(rows)` from scanned VIDEO files with resolved RVTR
- Emits synthetic `BrowserPlusRow` with `fileType: "GAP"`, `workStatusReason: "Hot 100 chart track with no DJ MEDIA/VIDEO file"`

### Stats strip

`BrowserPlusModel.stats` includes:

- `hot100RvtrCount`
- `videoHot100Count`
- `gapCount`
- `myVideoRows` / `myVideoRvtrs`

---

## Alignment with public Phase 4 coverage

| Public badge | Browser Plus equivalent |
|--------------|-------------------------|
| OWNED | `my-videos` row with RVTR + VIDEO path |
| YOUTUBE | **Not in Browser Plus today** — YouTube is graph-only |
| MISSING | `gaps` mode row |

Browser Plus is **VIDEO-file-centric**. YouTube availability lives in `youtube_video_tracks` (public chart layer only after Phase 4).

---

## Existing APIs (ops)

| Route | Role |
|-------|------|
| `/api/ops/browser-plus/execution` | Adapter execution |
| Browser Plus page `/ops/browser-plus` | Full UI |

No public API. Ops PIN gated.

---

## Missing joins / gaps

| Gap | Impact |
|-----|--------|
| YouTube not in Browser Plus modes | "Retroverse" view is chart+file, not chart+YouTube |
| `has_vdj_media` vs VIDEO path | Browser Plus uses path rules; public Phase 4 uses `opsVideoMediaAndClause` — **aligned** |
| Artist-scoped Missing | Browser Plus filters by folder/search, not artist aggregate |
| Real-time vs VDJ scan | Browser Plus reads VDJ database/filesystem; public coverage reads Postgres graph |

---

## Lowest-risk path to three-view workflow

### Already works (ops)

1. **My Videos** — `my-videos` mode, VIDEO folder tree
2. **Retroverse** — `retroverse` mode, Hot 100 RVTR catalog
3. **Missing** — `gaps` mode, chart RVTRs − owned VIDEO set

### Recommended alignment (no new systems)

1. **Label harmonization** — Ops UI labels match public badges: Owned / Missing (YouTube stays public-only or add optional column from graph join).
2. **Shared classifier** — Import `classifyTrackCoverage` + batch loader in Browser Plus gap enrichment (read-only join to `youtube_video_tracks` for a fourth "YouTube only" ops hint — optional).
3. **Cross-link** — From gap row → `/week/[date]` or `/retroverse-2/song/[rvtr]` (already partially via RVTR column).
4. **Do not duplicate** chart universe SQL — keep `loadChartUniverseIndex()` as single Hot 100 source.

### Not recommended

- New Browser Plus database tables
- Runtime VDJ scan from public chart pages
- Merging MUSIC folder into Owned

---

## Summary

Browser Plus **already implements** My Videos / Retroverse / Missing for VIDEO ownership. Phase 4 public coverage adds **YouTube** as a middle state Browser Plus does not show today.

Alignment = shared RVTR classification function + consistent VIDEO path rules (done in Phase 4 batch loader). Optional future: YouTube column in Browser Plus retroverse/gaps modes via existing `youtube_video_tracks` join.
