# Collection Workflow — Phase A + B Implementation Report

**Date:** 2026-06-23  
**Scope:** Charts discoverability in RV2 shell + Browser Plus intent modes  
**Out of scope:** acquisition queue, download workflow, schema changes, chart content redesign

---

## Phase A — Charts

### Route inventory

| Route | Status | Shell (after) | Notes |
|-------|--------|---------------|-------|
| `/retroverse-2/charts` | **New hub** | RV2 blue | Hot 100 / Top 200 / Browse By Year entry |
| `/rv/[year]` | Canonical year chronicle | **RV2 blue** | Hot 100 + B200 month leaders |
| `/rv/[year]/[month]` | Month drill | **RV2 blue** | Singles Hot 100 + Albums B200 |
| `/rv/[year]/[month]/[week]` | Week deep link | **RV2 blue** | Same drill, highlighted week |
| `/charts?year=&month=&week=` | Legacy redirect | — | Deep links → `/rv/...`; bare → hub |
| `/week/[date]` | Parallel week portal | Custom | Unchanged (Hot 100 neighborhood) |
| `/artist/[slug]/charts` | Artist chart explorer | Artist exhibit | Unchanged |
| `/search?q=` (year) | Embedded RV history | RV2 blue | Unchanged content |
| `/track/[id]` | Redirect | — | → `/retroverse-2/song/[rvtr]` |

### Chart inventory (content surfaces)

| Chart type | Where it lives | Entry from hub |
|------------|----------------|----------------|
| **Hot 100 Singles** | `/rv/[year]` month cards + month/week drill | → `/rv/1978` |
| **Top 200 Albums** | Same chronology (`albumSnapshots`) | → `/rv/1984` |
| **Browse By Year** | `/rv/[year]` full year view | Featured year grid on hub |

### Phase A changes

1. **`Rv2PublicShell`** — added **Charts** nav alongside Live / Search / Years; `activeNav` support
2. **`/retroverse-2/charts`** — first-class charts hub (3 cards, featured years)
3. **`Rv2ChronologyFrame`** — wraps all `/rv/*` pages in RV2 shell
4. **`rv-rv2-overrides.css`** — token overrides only; chart layout untouched
5. **Legacy cleanup** — `/charts` bare redirect → hub; home Charts pad → hub; orphan `/charts` links fixed

### Screenshots (Phase A)

| File | Surface |
|------|---------|
| `01-charts-hub.png` | Charts hub |
| `02-rv1978-rv2-shell.png` | `/rv/1978` in RV2 shell |

---

## Phase B — Browser Plus modes

### Before → After

| Old mode | New mode | Scope |
|----------|----------|-------|
| `library` | **MY VIDEOS** | `~/DJ MEDIA/VIDEO` only (excludes VIDEO VAULT) |
| `retroverse` | **RETROVERSE** | VDJ rows with Hot 100 canonical RVTR |
| `work` | *(retired)* | Work columns still visible in My Videos |
| — | **GAPS** | Hot 100 chart RVTRs missing from video library |

### Data sources (unchanged)

- VDJ `database.xml` via `loadBrowserPlusModel()`
- Canonical graph via `canonical_track_display` (PG)
- Gap rows computed at API time — **no new tables**

### Browser Plus mode design

**Mode 1 — MY VIDEOS**
- Filter: file path under `DJ MEDIA/VIDEO` (not VAULT)
- Default mode on load
- Quick action: **Video Library** folder scope (`VIDEO`)
- Columns: library shape (genre, plays, thumbnail, package/deck)

**Mode 2 — RETROVERSE**
- Filter: `coverageFlags` includes `HOT100` + mapped RVTR
- Chart-universe view across full VDJ database
- Columns: canonical artist/track, coverage score, match method

**Mode 3 — GAPS**
- Source: `model.gapRows` (synthetic rows, no file path)
- Hot 100 RVTRs not present in MY VIDEOS library
- Sorted by peak Hot 100 position
- Header shows gap count (e.g. ~28,323 from audit)
- Folder tree disabled (flat gap list)

### API enrichment

`GET /api/ops/browser-plus` now calls `attachBrowserPlusChartCoverage()`:

```typescript
chartCoverage: {
  hot100RvtrCount,
  videoHot100Count,
  gapCount,
  myVideoRows,
  myVideoRvtrs,
}
```

Tags `HOT100` on matching VDJ rows for retroverse filter.

### Files changed (Phase B)

- `lib/ops/browser-plus/types.ts` — mode type + `gapRows` / `chartCoverage`
- `lib/ops/browser-plus/chart-universe.ts` — gap builder + enrichment
- `lib/ops/browser-plus/load-browser-plus.ts` — column mode map
- `app/api/ops/browser-plus/route.ts` — attach enrichment
- `components/ops/browser-plus/VirtualDjBrowserPlus.tsx` — mode UI + filters

### Screenshot (Phase B)

| File | Surface |
|------|---------|
| `03-browser-plus-my-videos.png` | Browser Plus (My Videos default) |

---

## Checkpoint

1. **Charts hub:** http://localhost:3000/retroverse-2/charts — 4 nav items, 3 chart cards
2. **Year chronicle:** http://localhost:3000/rv/1978 — RV2 topbar, same chart content
3. **Browser Plus:** http://localhost:3000/ops/browser-plus — modes: MY VIDEOS | RETROVERSE | GAPS

---

## Not built (per spec)

- Acquisition / download queue
- New DB tables or migrations
- Chart content redesign
- New public pages beyond charts hub + existing route shell wraps
