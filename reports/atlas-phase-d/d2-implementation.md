# Atlas Phase D2 — Embedded Mission Gameplay Loop

**Date:** 2026-06-15  
**Route:** `/ops/atlas/mission/RVTR097615`  
**Scope:** Album link + Commentary only (no TV, Movie, Cover automation)

---

## Summary

First complete gameplay loop on the mission page:

**Open Mission → Link Album → Save Commentary → Completion Ring Updates → Territory Impact Updates → Stay on Page**

No navigation to legacy ops tools.

---

## What was built

| Piece | Purpose |
|-------|---------|
| `lib/atlas/mission-scores.ts` | Live completeness scoring (matches audit runner) |
| `lib/atlas/mission-live-state.ts` | PG + tag store + review state loader, album candidates, saves |
| `MissionCardClient.tsx` | Client shell with live workspace state |
| `mission/MissionAlbumSlot.tsx` | Inline candidates + Link album |
| `mission/MissionCommentarySlot.tsx` | Style/Crowd tags + performance class + Save |
| `mission/AtlasRvTagsPanels.tsx` | Atlas-styled tag/class panels |
| `app/api/ops/atlas/mission/[rvtr]/route.ts` | GET/POST refresh workspace + cover |
| `app/api/ops/atlas/mission/[rvtr]/album-link/route.ts` | Apply healing album link |
| `app/api/ops/atlas/mission/[rvtr]/commentary/route.ts` | Save RVTR tags + classification |

---

## Embedded actions

### Album slot
- Top 3 candidates from `auditTrackAlbumLinks`
- Cover art via album ID lookup
- Confidence % per candidate
- **Link album** → `applyHealingAlbumLink` (requires `RETROVERSE_HEALING_APPLY=1`)
- Slot closes on success; exhibit depth + points update inline

### Commentary slot
- Style + Crowd tag panels (fixed layout from rvtags-review)
- Performance class pills (Fill / Cocktail / Dance / Slow)
- **Save placard** → `saveRetroverseTagsForRvtr` + `saveYearReviewRecord`
- Slot closes when commentary score ≥ threshold (2+ tags or score ≥ 0.75)

### Deferred (D3 badge only)
- Cover, TV, Movie shown as compact chips — no links, no embeds

---

## Live progress updates

After each save, server returns fresh `MissionWorkspace` + `coverUrl`:

- Exhibit depth ring (%)
- Open slot count + available points
- Earned points + seals
- Territory mapped → after delta
- Status stamp (READY / IN PROGRESS / FORTIFIED)
- Hero cover (when album link provides artwork)

---

## APIs reused

| API / module | Used for |
|--------------|----------|
| `auditTrackAlbumLinks()` | Album candidate ranking |
| `applyHealingAlbumLink()` | Album link write |
| `healingWritesEnabled()` | Album write gate |
| `saveRetroverseTagsForRvtr()` | Canonical commentary tags |
| `saveYearReviewRecord()` | Performance classification |
| `loadYearWorkspaceState()` + `reviewForVideoRow()` | Read classification |
| `loadRetroverseTagsStore()` / `tagsForRvtr()` | Read tags |
| `loadVdjMetaForPaths()` | Play count + User2 hints |
| `inspectQuery()` | Live album link counts |
| `resolveAlbumCoverUrlFromRow()` | Candidate + hero covers |
| `resolveAtlasCoverMap()` / `loadTrackPage()` | Hero cover resolution |

**New thin routes** wrap the above — no duplicate business logic.

---

## Rhiannon test flow

```bash
RETROVERSE_OPS=1 RETROVERSE_HEALING_APPLY=1 npm run dev
# PIN if needed: /internal/ops-pin?next=/ops/atlas/mission/RVTR097615
```

1. Open mission — hero + 25% ring + 2 open slots (Album, Commentary)
2. Pick album candidate → **Link album** — ring rises (album score), +5 pts, album seal
3. Toggle style/crowd tags + class → **Save placard** — ring rises again, +3 pts
4. Action slots close; deferred Cover/TV/Movie remain as D3 chips
5. Never leaves `/ops/atlas/mission/RVTR097615`

---

## Screenshots

| File | Viewport |
|------|----------|
| `reports/atlas-phase-d/mission-rhiannon-d2.png` | 1440×900 above fold |
| `reports/atlas-phase-d/mission-rhiannon-d2-full.png` | Full page |

Capture:

```bash
node tools/atlas-phase-d-screenshots.mjs
```

---

## Remains for D3 (not started)

- Cover slot embed + cover healing apply
- TV / Movie appearance search + linkage
- Live discoveries feed (audit log)
- Related shelf completeness from live scores (still audit JSON)
- Mission completion celebration + auto-advance queue
- Mobile collapse pass

---

## Env requirements

| Variable | Required for |
|----------|--------------|
| `RETROVERSE_OPS=1` | Page + API access |
| Postgres (inspect) | Live scores, album candidates, album link |
| `RETROVERSE_HEALING_APPLY=1` | Album **Link album** writes |

Commentary save works without healing flag (local ops state + tag store only).
