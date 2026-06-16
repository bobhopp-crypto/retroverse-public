# Atlas Phase D1 — One-Screen Mission Card Layout

**Date:** 2026-06-15  
**Route:** `/ops/atlas/mission/[rvtr]`  
**Status:** Implemented (layout only — embed placeholders for D2)

---

## What changed

| Piece | Change |
|-------|--------|
| `lib/atlas/mission-types.ts` | `MissionWorkspace`, `MissionGap`, `MissionSeal`, `MissionRelatedCard` |
| `lib/atlas/load-mission.ts` | `loadMissionWorkspace()` — gaps-only, seals, related artist, discoveries |
| `components/atlas/MissionCardBoard.tsx` | New card layout (replaces Phase C board on page) |
| `app/ops/atlas/mission/[rvtr]/page.tsx` | Loads workspace + related cover map |
| `app/ops/atlas/atlas.css` | `atlas-mcard-*` styles |

**Checkpoint met:** Zero links to `/ops/year/*`, `/ops/review/*`, `/ops/rvtags-review/*`, media lab, etc.

---

## Page zones

1. Top bar — territory back, mission rank, status stamp, next mission
2. Hero — large art, title/meta, **Exhibit depth** ring, shelf coverage + priority
3. Fill the card — 5 open slots (Rhiannon) with D2 embed placeholders
4. Seals — canonical RVTR, track identified, chart exhibit
5. Same artist shelf — horizontal mini cards with covers
6. Territory impact + recent discoveries
7. Queue footer — prev/next + points ledger

---

## Review

```bash
RETROVERSE_OPS=1 npm run dev
# /ops/atlas/mission/RVTR097615
```

---

## Next: Phase D2

Embedded album link, tag panels, classification pills — no external navigation.
