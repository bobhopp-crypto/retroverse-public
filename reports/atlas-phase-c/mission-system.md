# Atlas Phase C — Mission System

**Date:** 2026-06-15  
**Route:** `/ops/atlas/mission/[rvtr]`  
**Example:** `/ops/atlas/mission/RVTR097615` (Rhiannon)

---

## Summary

Mission detail pages are the primary enrichment workflow. Deploy links from World Map, 1970s Territory, and mission cards now route here — not to generic track or ops pages.

No new dashboards, reporting screens, or route categories.

---

## What was built

| Piece | Purpose |
|-------|---------|
| `lib/atlas/load-mission.ts` | Load mission from audit JSON by RVTR |
| `lib/atlas/mission-types.ts` | Checklist, status, detail types |
| `lib/atlas/mission-href.ts` | `atlasMissionHref(rvtr)` helper |
| `components/atlas/MissionDetailBoard.tsx` | Full mission layout |
| `app/ops/atlas/mission/[rvtr]/page.tsx` | Server page |

---

## Mission page sections

1. **Hero** — title, artist, cover, plays, territory, coverage, priority, status stamp (READY / IN PROGRESS / FORTIFIED / COMPLETE)
2. **Mission progress** — checklist completion bar + territory points earned/available
3. **Territory impact** — 65% → 66% mapped, rank #1
4. **Why this song matters** — context copy from audit data
5. **Checklist** — gaps with ✓/✗, point rewards, mission-language actions
6. **Prev / Next** — from audit `top100` queue

---

## Checklist → workshop links

| Task | Action | Route |
|------|--------|-------|
| Album linkage | Build Album Shelf | `/ops/year/1978` |
| Album cover | Restore Album Cover | `/ops/review/covers` |
| Commentary | Write Exhibit Placard | `/ops/rvtags-review/1978` |
| TV / Movie | Search TV & Film Archive | `/ops/media-lab` / `/ops/media-collections` |
| Related exhibits | Open Exhibit | `/track/{rvtr}` |

---

## Point rewards (placeholder)

| Task | Points |
|------|-------:|
| Album linkage | +5 |
| Album cover | +4 |
| Commentary | +3 |
| TV / Movie | +2 each |
| Complete mission | +10 |

---

## Review

```bash
RETROVERSE_OPS=1 npm run dev
```

1. `/ops/atlas/1970s` → click **Deploy → Rhiannon**
2. Confirm `/ops/atlas/mission/RVTR097615`
3. Use checklist actions → existing workshop tools
4. **Next mission** → Night Moves

Screenshot: `reports/atlas-phase-b/mission-rhiannon.png` (via screenshot script)
