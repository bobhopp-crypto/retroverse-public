# Atlas Phase D — One-Screen Mission Card

**Date:** 2026-06-15  
**Objective:** Enrich one RVTR from one page. No ops tool maze.  
**Reference:** Rhiannon `RVTR097615` · 25% complete · #1 mission  
**Status:** Wireframe + plan only (no code yet)

---

## Verdict on current page

The Phase C mission page **passes briefing** but **fails enrichment**:

| Test | Result |
|------|--------|
| Can I see what's missing? | Partial — checklist exists but mixed with auto-done noise |
| Can I see reward value? | Yes — but buried under progress bar |
| Can I complete open tasks without leaving? | **No** — every open task is an external link |
| Does it feel like a collectible card? | Partial — hero art exists; body reads like admin checklist |
| One screen (1440×900, minimal scroll)? | **No** — vertical stack; impact ring competes with progress bar |

**Root cause:** Mission page is a **router** to existing ops tools, not a **work surface**.

---

## Design north star

> Completing a baseball card — flip it over, fill the empty stat slots, stamp it complete.

- **Front of card:** giant art, name, team (artist), rarity (plays), completeness grade
- **Back of card:** stat slots — empty ones are **tap-to-fill**, not “go to another room”
- **Peripheral context:** same-artist cards on the shelf, territory scoreboard, recent pulls from the pack

No dark ops chrome. Paper, ink, stamps, slot machine satisfaction on save.

---

## Information architecture (single screen)

Priority order (top → bottom, left → right):

1. Hero artwork + card identity
2. **Completeness score** (dominant number)
3. **Missing slots** (only gaps — not 8-row checklist)
4. **Reward ledger** (earned / available / completion bonus)
5. **Embedded actions** inline with each gap
6. Same-artist related songs (horizontal strip)
7. Territory impact (compact scoreboard)
8. Recent discoveries (ribbon)
9. Queue nav (prev/next) — footer, not hero

**Remove or demote:**
- “RVTR linked” / “Track identified” auto-done rows (show as card seal, not tasks)
- Duplicate “Why this song matters” prose block (merge into card subtitle)
- Confusing dual metrics: rename **Shelf coverage** (43%) vs **Exhibit depth** (25%)

---

## Wireframe — 1440 × 900 (desktop, ~1 screen)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ← 1970s Territory          CONQUER MISSION · #1 of 100          [ READY ▣ ]   Night Moves → │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─────────────────────────┐   RHIANNON                                                    │
│  │                         │   Fleetwood Mac · 1976 · 37 plays · Hot 100 #11                 │
│  │                         │                                                               │
│  │     HERO COVER ART      │              ┌──────────────┐                                   │
│  │      (320–400px)        │              │              │                                   │
│  │                         │              │     25%      │  ← EXHIBIT DEPTH (large)           │
│  │   [ stamp overlay ]     │              │  COMPLETE    │                                   │
│  │                         │              └──────────────┘                                   │
│  └─────────────────────────┘              Shelf: 43% owned · Priority 27.8                   │
│                                                                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  FILL THE CARD — 5 slots open · +16 pts available · +10 completion bonus                   │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─ SLOT: ALBUM ─────────────────────────────────────────────────────────────── +5 pts ─┐   │
│  │  ✗ No album linked yet                                                                │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │ EMBED: Top 3 album candidates (healing audit) · cover thumb · confidence bar    │ │   │
│  │  │ [ Fleetwood Mac (1975) ]  [ Greatest Hits ]  [ Rumours — verify ]               │ │   │
│  │  │                                    [ Link this album ]  (calls healing apply)   │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                              │
│  ┌─ SLOT: COVER ─────────────────────────────────────────────────────────────── +4 pts ─┐   │
│  │  ✗ No cover on linked album                                                           │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │ EMBED: Current placeholder · 2–3 candidate covers · [ Apply cover ]             │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                              │
│  ┌─ SLOT: COMMENTARY ────────────────────────────────────────────────────────── +3 pts ─┐   │
│  │  ✗ Exhibit placard empty (0 tags)                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │ EMBED: Style + Crowd tag panels (from OpsRvTagsReview) · video thumb if path     │ │   │
│  │  │ [ Anthem ] [ Singalong ] [ … ]     [ Save placard ] → updates RVTR tags store   │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                              │
│  ┌─ SLOT: TV ────────┐  ┌─ SLOT: MOVIE ─────────────────────────────────────── +2 each ─┐   │
│  │ ✗ Not logged      │  │ ✗ Not logged                                          │         │   │
│  │ [ Search & link ] │  │ [ Search & link ]  (inline media search — phase 2)    │         │   │
│  └───────────────────┘  └───────────────────────────────────────────────────────────────┘   │
│                                                                                              │
│  ✓ Chart exhibit linked (seal — not expandable)                                            │
│                                                                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  SAME ARTIST SHELF — Fleetwood Mac                                                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                                               │
│  │ art  │ │ art  │ │ art  │ │ art  │ │ +3   │  ← mini cards, completeness ring, mission link │
│  │Dreams│ │Go Own│ │Say.. │ │Rhian │ │ more │                                               │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                                               │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  TERRITORY IMPACT                    │  RECENT DISCOVERIES                                  │
│  1970s · 65% → 66% mapped            │  ◆ Rhiannon entered orbit · ◆ Night Moves cover ·  │
│  Completing Rhiannon moves #1 bar    │  ◆ Black Betty tags added                            │
│  [████████░░] campaign: Albums 77%   │                                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  ← Night Moves (prev)                              Points earned: 2 · Available: 16 · +10 bonus │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Mobile collapse (future)

- Hero art full-width top
- Completeness score overlays art corner
- Slots stack vertically; related songs horizontal scroll
- Territory + discoveries collapse to accordion

---

## Component map

| Zone | New component | Data source |
|------|---------------|-------------|
| Card hero | `MissionCardHero` | `loadMissionDetail` + `loadTrackPage` cover |
| Completeness | `MissionCompletenessDial` | audit `completenessPct` + live recompute |
| Missing slots | `MissionCardSlots` | filtered checklist (gaps only) |
| Album embed | `MissionAlbumSlot` | `auditTrackAlbumLinks(rvtr)` + healing apply API |
| Cover embed | `MissionCoverSlot` | `auditCoverForRvtr` + cover healing (phase 2) |
| Commentary embed | `MissionTagsSlot` | `loadRetroverseTagsStore` + tag vocabulary |
| TV/Movie embed | `MissionMediaSlot` | media search scoped to artist (phase 2) |
| Related songs | `MissionArtistShelf` | audit rows same artist OR `loadTrackPage.relatedTracks` |
| Territory | `MissionTerritoryStrip` | audit summary + campaign bars |
| Discoveries | `MissionDiscoveriesRibbon` | territory feed (static → live later) |
| Queue | `MissionQueueFooter` | existing prev/next |

---

## Embedded actions — reuse matrix

| Gap | Embed strategy | Existing backend | Leave page? |
|-----|----------------|------------------|-------------|
| Album linkage | Candidate cards + one-click approve | `GET /api/ops/healing/review?rvtr=` · `POST /api/ops/healing/apply` | **No** |
| Album cover | Candidate grid + apply | `auditCoverForRvtr` · cover healing proposals | **No** (P1 preview, P2 apply) |
| Commentary | Style/Crowd tag panels | `saveRetroverseTagsForRvtr` · new thin mission API | **No** |
| Performance class | 4-pill selector (Fill/Cocktail/Dance/Slow) | `PATCH /api/ops/year-workspace` with `workspaceKey` from audit `path` | **No** |
| TV / Movie | Inline search modal, log linkage | media-lab APIs (TBD) | **Defer** — expandable panel P2 |
| Chart exhibit | Read-only seal + link to `/track/{rvtr}` | already done | Optional peek |

**Fallback rule:** If embed cannot load (PG down, writes disabled), show **disabled slot + reason** — never a blind link to `/ops/year/1978`.

---

## Data layer changes

### Extend `loadMissionDetail` → `loadMissionWorkspace`

Single server loader returning everything the card needs:

```ts
type MissionWorkspace = MissionDetail & {
  coverUrl: string | null;
  filePath: string | null;           // audit row.path
  workspaceKey: string | null;       // derived from path for year-workspace PATCH
  canonicalTags: RvTagId[];
  classification: string | null;
  peakHot100: number | null;
  // Live gaps (recomputed, not frozen checklist)
  gaps: MissionGap[];
  seals: MissionSeal[];               // auto-done: chart, identity
  relatedByArtist: MissionRelatedCard[];
  albumCandidates: AlbumLinkCandidate[];  // from healing audit
  coverAudit: CoverAuditSummary | null;
  discoveries: DiscoveryItem[];
  points: { earned: number; available: number; bonus: number };
};
```

### Live checklist recompute

Replace static `buildChecklist()` links with **runtime scores**:

| Gap | Done when |
|-----|-----------|
| Album | `albumScore >= 0.75` OR live PG link count > 0 |
| Cover | `coverScore >= 1` OR linked album has cover URL |
| Commentary | `≥2` canonical tags OR `commentaryScore >= 0.75` |
| TV / Movie | linkage flags (PG or ops state) |

Re-run audit dimensions on save success (optimistic UI + background refresh).

### Related songs

**P0:** Filter `audit.rows` where `artist` matches (normalize case), sort by `playCount` desc, cap 6, exclude current RVTR.

**P1:** Merge with `loadTrackPage(rvtr).relatedTracks` for graph-connected siblings.

### Recent discoveries

**P0:** Reuse territory static strings from `load1970sAudit().discoveries`.

**P1:** Append from `healing-audit.jsonl` / tag store `updatedAt` — last 3 events in territory.

---

## API additions (minimal)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ops/atlas/mission/[rvtr]` | GET | Full workspace payload (or extend page loader only) |
| `/api/ops/atlas/mission/[rvtr]/tags` | POST | `{ tags: RvTagId[] }` → `saveRetroverseTagsForRvtr` |
| `/api/ops/atlas/mission/[rvtr]/refresh` | POST | Recompute completeness after embed saves |

Reuse unchanged:
- `/api/ops/healing/review?rvtr=`
- `/api/ops/healing/apply`
- `/api/ops/year-workspace` PATCH (classification)

---

## Visual system (Phase D)

Build on Phase B atlas.css — new BEM block `atlas-mission-card`:

- **Hero art:** min 360px, thick ink frame, subtle paper shadow, status stamp top-right
- **Completeness:** 96–120px numeral, orange ring, label “Exhibit depth”
- **Slots:** baseball stat row — label left, embed panel inset like card stock
- **Save actions:** teal primary buttons, stamp animation on success
- **Related shelf:** miniature `AtlasMissionCard` geometry
- **No** `ops-rvreview__` dark theme inside mission — restyle tag panels with atlas tokens

---

## Implementation plan

### Phase D1 — Layout restructure (no new writes)

**Goal:** Pass visual “one screen” test; gaps-only UI; no external links.

1. Replace `MissionDetailBoard` with `MissionCardBoard` layout per wireframe
2. Extend `load-mission.ts` → `loadMissionWorkspace` (related artist, seals, gaps-only)
3. Rename metrics: Exhibit depth vs Shelf coverage
4. Demote auto-done to seals; remove “Why this song matters” duplicate block
5. Replace checklist links with **placeholder embed panels** (“Coming in D2”)
6. Add related artist shelf + discoveries ribbon + compact territory strip
7. CSS: `atlas-mission-card*` block in `atlas.css`
8. Screenshot: Rhiannon at 1440×900

**Files touched:**
- `components/atlas/MissionDetailBoard.tsx` → refactor or split
- `components/atlas/MissionCard*.tsx` (new)
- `lib/atlas/load-mission.ts`, `mission-types.ts`
- `app/ops/atlas/mission/[rvtr]/page.tsx`
- `app/ops/atlas/atlas.css`

**Checkpoint:** Page shows all required zones; zero links to `/ops/year/*`, `/ops/review/*`, etc.

---

### Phase D2 — Embedded writes (P0 actions)

**Goal:** Complete album + commentary without leaving page.

1. **`MissionTagsSlot`** — extract tag UI from `OpsRvTagsReview` into shared `RvTagsFixedPanels` (no queue navigation)
2. **`POST /api/ops/atlas/mission/[rvtr]/tags`**
3. **`MissionAlbumSlot`** — fetch candidates via healing review API; approve button → healing apply
4. Wire save → optimistic slot ✓ + points update + toast stamp
5. Fix year routing: derive `workspaceKey` from audit `path` for classification PATCH
6. **`MissionClassSlot`** — optional 4-pill performance class inline

**Checkpoint:** Rhiannon — link album + save 2 tags → completeness rises; no navigation.

---

### Phase D3 — Cover + media (P1)

1. **`MissionCoverSlot`** — cover audit preview + candidate selection
2. Cover apply if healing cover writes exist; else “preview only” with explicit reason
3. **`MissionMediaSlot`** — artist-scoped TV/movie search drawer (not full media lab)
4. Live discoveries feed from audit log

---

### Phase D4 — Live data loop

1. On mount + after each save: refresh gap scores (lightweight audit slice for one RVTR)
2. Territory impact “after completion” uses live avg, not +1 hardcode
3. Optional: mission completion celebration stamp + auto-advance to next in queue

---

## Rhiannon acceptance test

| Step | Expected |
|------|----------|
| Open `/ops/atlas/mission/RVTR097615` | All content visible ≤1.2 screens scroll at 1440×900 |
| See missing | Album, Cover, Commentary, TV, Movie — **5 slots**, not 8 checklist rows |
| See reward | +16 available, +10 bonus, +2 earned — visible without scrolling past hero |
| Album action | Pick candidate → Link → slot stamps ✓, +5 pts, no page change |
| Commentary | Toggle tags → Save placard → slot stamps ✓, +3 pts |
| Related | ≥3 other Fleetwood Mac songs with art |
| Territory | 65% mapped, campaign bar visible |
| Discoveries | ≥3 ribbon items |
| No maze | Zero navigation to `/ops/year/1978` or dark ops pages for P0 tasks |

---

## Out of scope (explicit)

- Replacing `/ops/*` routes or workshop board
- New dashboards or reporting categories
- Bulk cover review queue inside mission
- Auto-apply healing without human confirm button
- Mobile-first pass (desktop 1440×900 first, per atlas convention)

---

## Risk notes

| Risk | Mitigation |
|------|------------|
| Healing writes disabled | Show candidates read-only + env hint |
| PG unavailable | Fall back to audit JSON scores; embeds disabled with message |
| Rhiannon not in 1978 pilot CSV | Tags save via RVTR store, not pilot queue |
| TV/movie too heavy to embed | Phase 2 drawer; P0 shows compact “log later” slot |
| Tag panel ops styling | Restyle with atlas tokens in D2 |

---

## Next step

Review this wireframe + plan. On approval, implement **Phase D1** first (layout + data shape, no writes), screenshot Rhiannon, then **D2** embeds.
