# Atlas Phase A — Implementation Report

**Date:** 2026-06-15  
**Status:** Static prototype · local only · not deployed  
**Routes:** `/ops/atlas` · `/ops/atlas/1970s` · `/ops/atlas/workshop`

---

## Summary

Desktop-first Atlas prototype built inside Ops. Three pages share atlas rail + Two Realities plaque. Real 1970s audit JSON drives territory board. World Map uses live 1970s + placeholder decades. Workshop maps six rooms to existing `/ops/*` routes.

**Existing Ops unchanged** — no routes removed, no directory replaced, no tool redesign.

---

## What was built

| Route | Component | Data |
|-------|-----------|------|
| `/ops/atlas` | `WorldMapBoard` | `lib/atlas/world-map-data.ts` |
| `/ops/atlas/1970s` | `Territory1970sBoard` | `reports/1970s-performance-universe-audit.json` |
| `/ops/atlas/workshop` | `WorkshopBoard` | `lib/atlas/workshop-rooms.ts` |

**Shared chrome:** `AtlasRail` · `TwoRealitiesPlaque` · `AtlasFrame`  
**Styles:** `app/ops/atlas/atlas.css` (paper/teal/orange — not ops dark theme)

---

## 1970s live data wired

| Field | Value | Source |
|-------|------:|--------|
| Owned | 581 | audit `summary.matchedVideos` |
| Missing | 779 | 1360 shelf − 581 |
| Mapped | 65% | `summary.avgCompletenessPct` |
| Complete | 309 | `completenessBuckets.high` |
| Partial | 272 | mid + low buckets |
| Missions | Rhiannon · Night Moves · My Sweet Lord | `top100[0..2]` |
| Campaigns | 85 / 77 / 0 / 0 / 0 | audit dimension averages |

---

## Two Realities plaque

Persistent bar on all Atlas pages.

- **Studio** show floor from `loadSundayNightsState()` (live when set)
- **Program** from `loadEventControlConfig()`
- **Stage** side: static prototype defaults
- Verdict chips: Different · Sync First · Good To Go (Phase A static alignment)

No Postgres / JSON / Vercel / API labels in UI.

---

## Workshop rooms → existing routes

| Room | Tools linked |
|------|--------------|
| Shelf | media-sync, `#year-match`, acquisition |
| Missions | atlas/1970s, year/1967, cover review/backfill/fix |
| Show Prep | show-builder, sunday-nights |
| Event Desk | event-control, passes, pass-registrations |
| Create | content-creator, create |
| Surgery | healing, media-collections, media-lab |

Broken directory cards, debug routes, and redirect-only URLs excluded.

---

## File inventory

```
app/ops/atlas/
  layout.tsx
  page.tsx
  atlas.css
  1970s/page.tsx
  workshop/page.tsx

components/atlas/
  AtlasFrame.tsx
  AtlasRail.tsx
  TwoRealitiesPlaque.tsx
  WorldMapBoard.tsx
  Territory1970sBoard.tsx
  WorkshopBoard.tsx

lib/atlas/
  types.ts
  load-1970s-audit.ts
  load-realities.ts
  world-map-data.ts
  workshop-rooms.ts

tools/atlas-phase-a-screenshots.mjs
reports/atlas-phase-a/*.png
```

---

## Screenshots

| File | Page |
|------|------|
| `reports/atlas-phase-a/world-map.png` | World Map (viewport) |
| `reports/atlas-phase-a/1970s-territory.png` | 1970s Territory |
| `reports/atlas-phase-a/workshop.png` | Workshop |
| `reports/atlas-phase-a/two-realities.png` | Realities plaque |
| `reports/atlas-phase-a/full-world-map.png` | Full scroll reference |

---

## How to review

```bash
RETROVERSE_OPS=1 npm run dev
```

1. Open `http://localhost:3000/internal/ops-pin?next=/ops/atlas` (PIN `6324` unless overridden)
2. Check World Map → click 1970s → Workshop via rail
3. Confirm Two Realities plaque on every page

Re-screenshot:

```bash
node tools/atlas-phase-a-screenshots.mjs
```

---

## Not in scope (by design)

- No schema / DB changes  
- No mission engine  
- No ops directory replacement  
- No production deploy  
- No decade audit runners beyond 1970s  
- No production fetch for Stage column (static prototype)

---

## Next steps (Phase B candidates)

1. Generalize audit runner for other decades  
2. Production Stage column via public now-playing endpoint  
3. Discoveries feed (append-only log)  
4. Optional single "Atlas" card on `/ops` directory  
5. Promote routes to `/atlas` when reviewed

---

*Phase A complete. Review screenshots in `reports/atlas-phase-a/` before deploy.*
