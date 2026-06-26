# Phase 4A + 4B — Coverage Layer Verification

**Date:** 2026-06-24  
**Viewport:** 390 × 844 (mobile)

---

## Canonical rules (verified)

| Status | Rule |
|--------|------|
| **OWNED** | `coverage-owned-video-sql.ts` + `opsVideoMediaAndClause` — `/VIDEO/` only; excludes `/MUSIC/` and VIDEO VAULT |
| **YOUTUBE** | `youtube_video_tracks` (approved/pending, exact/high); only when not OWNED |
| **MISSING** | Neither |

Priority: OWNED → YOUTUBE → MISSING (`classifyTrackCoverage`).

---

## Surfaces audited

| Surface | Route | Badges | Filters |
|---------|-------|--------|---------|
| Chart Week | `/week/[date]` | ✅ | ✅ ALL / OWNED / YOUTUBE / MISSING |
| Top Singles | `/rv/[year]` | ✅ | — (summary list) |
| Top Albums | `/rv/[year]` | N/A | — (Billboard 200; no RVTR track coverage) |
| Month summaries | `/rv/[year]/[month]` | ✅ singles | — |
| Month week drill | `/rv/[year]/[month]/[week]` | ✅ singles | — |

Loader: `loadChartWeekContext()` returns `coverageStatus: "owned" | "youtube" | "missing"` per row.  
Batch: `loadTrackCoverageByRvtr()` for year/month drill maps.

No new routes, APIs, tables, or query params.

---

## Live data check — 1975-09-06 Hot 100

```
#1 Rhinestone Cowboy     → owned   (VIDEO/1970's/*.mp4; MUSIC mp3 ignored)
#2 Fallin' In Love       → missing
#3 Get Down Tonight      → missing
```

Filter **MISSING** on `/week/1975-09-06` hides #1 Rhinestone Cowboy and shows only songs needing attention.

---

## Before / after

| Before (Phase 3) | After (Phase 4) |
|------------------|-----------------|
| Chart rows: title, artist, rank only | + OWNED / YOUTUBE / MISSING pill |
| No coverage filter | Client-side filter bar on chart week |
| `has_vdj_media` conflated audio + video | VIDEO folder only for Owned |

Reference pre-coverage UI: `reports/chart-nav-phase-2/flow-03-week.png` (no badges).

---

## Mobile checks

| Check | Result |
|-------|--------|
| Badge readable at 390px | ✅ 0.58rem uppercase pill |
| Filter bar tappable | ✅ 44px+ touch targets, wrap |
| No horizontal scroll | ✅ flex-wrap on title row + filter |
| Rank column visible | ✅ `#rank` column unchanged |

---

## Screenshots

| File | Content |
|------|---------|
| `1975-chart-week-all.png` | Full week, ALL filter |
| `1975-chart-week-filter-missing.png` | MISSING filter only |
| `1975-top3-badges-crop.png` | Top chart rows crop |
| `1975-year-top-singles.png` | `/rv/1975` Top Singles |
| `1975-month-summaries.png` | `/rv/1975/9` month cards |
| `1978-chart-week-filters.png` | Filter bar + mixed badges |

Capture: `npx tsx tools/capture-coverage-phase-4.ts`

---

## Build

```bash
npx tsc --noEmit          # typecheck
npm run build             # stop dev server first
```

---

## Success criteria

**"Do I have it?"** — answerable from chart week without opening Browser Plus:

- ✅ OWNED / YOUTUBE / MISSING visible on every Hot 100 row
- ✅ Filter to MISSING surfaces acquisition gaps
- ✅ VIDEO ownership ignores MUSIC-only links (Rhinestone Cowboy test)
