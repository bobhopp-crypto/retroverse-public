# 1970's Performance Universe — Phase 2: Collection Game Design

**Date:** 2026-06-15  
**Status:** Design only — not implementation  
**Viewport:** Desktop-first · 1440 × 900 (16" MacBook Pro) · **no scroll above the fold**  
**Visual reference:** `reports/1970s-territory-game-mockup.png`  
**Data source:** `reports/1970s-performance-universe-audit.md`

---

## Design shift (Phase 1 → Phase 2)

| Phase 1 | Phase 2 |
|---------|---------|
| Decade atlas / poster | **Territory campaign board** |
| Enrichment queue | **Mission system** |
| Ops-adjacent metrics | **Collection game stats** |
| “What to enrich next” | **“What To Do Next” — your turn** |

**North star reaction:** *“Holy shit, what is that?”* — not *“That’s a nice admin panel.”*

**Influences:** Risk (territory control), All-Star Baseball (stat columns on card backs), collectible atlases (year regions), museum exhibits (placards, acquisition ribbons).

---

## Game metaphor (one sentence)

You are **campaigning through the 1970's territory** — conquering songs into your collection, fortifying what you know, and deploying missions to fill the gaps before the next show.

---

## Visual hierarchy

What the eye hits, in order (1440 × 900, no scroll):

```
1. TERRITORY TITLE          "1970's TERRITORY" — museum wing plaque scale
2. COLLECTION SEAL          Decade 65% wax seal (top-right anchor)
3. OWNED vs MISSING         Two monolith numbers — the scoreboard
4. THE MAP                  Risk-style year regions — spatial story
5. WHAT TO DO NEXT          Reinforcement card — orange, dominant CTA
6. ACTIVE MISSION             Top mission card (glowing border)
7. CAMPAIGN BARS              Five All-Star Baseball stat columns
8. WHAT I KNOW                Exhibit completeness split
9. RECENT DISCOVERIES         Acquisition ribbon (peripheral reward loop)
10. MISSION STACK             Missions 2–3 (supporting, not competing with #5)
```

### Size ladder

| Tier | Elements | Type scale |
|------|----------|------------|
| **Hero** | Territory name | 88–104px / 900 |
| **Scoreboard** | Owned, Missing counts | 80–96px / 800 |
| **Turn prompt** | What To Do Next headline | 36–44px / 800 |
| **Campaign %** | Seal + bar labels | 28–32px / 700 |
| **Mission titles** | Conquer / Fortify / Scout | 22–26px / 700 |
| **Zone labels** | SONGS OWNED, THE MAP, etc. | 12–14px / 700 uppercase |
| **Micro** | RVTR, play counts | 13px minimum — never ops-tiny |

### Color hierarchy

| Priority | Color | Use |
|----------|-------|-----|
| 1 | Signal orange `#E85D04` | Active mission, Next Move, missing territory hatch |
| 2 | Ink `#1A1A1A` | Borders, hero type, map outlines |
| 3 | Teal `#2A9D8F` | Owned regions, campaign bar fill, labels |
| 4 | Paper `#F4EED8` | Background — always dominant |
| 5 | Card cream `#FFF8EC` | Mission cards, stat monoliths |

**Never:** gray SaaS chrome, glass blur, thin 1px dividers, table headers, sidebar nav above the fold.

### Spatial hierarchy (zones)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  1970's TERRITORY                                    [ DECADE 65% seal ]   │
│  PERFORMANCE UNIVERSE · YOUR CAMPAIGN                                        │
├────────────────────┬─────────────────────────────┬───────────────────────────┤
│                    │                             │                           │
│   THE MAP          │   SONGS OWNED    MISSING    │   CAMPAIGN PROGRESS       │
│   (Risk board)     │      581           779      │   Covers      ████ 85%   │
│   1970–79 regions  │                             │   Albums      ███░ 77%   │
│                    │   WHAT I KNOW               │   Commentary  ░░░░  0%   │
│                    │   309 complete · 272 partial│   TV          ░░░░  0%   │
│                    │                             │   Movies      ░░░░  0%   │
├────────────────────┴─────────────────────────────┴───────────────────────────┤
│  RECENT DISCOVERIES ribbon          │  MISSIONS (card stack)  │ NEXT MOVE  │
│  acquisition labels                 │  ① Conquer Rhiannon ★   │ Deploy →   │
└─────────────────────────────────────┴─────────────────────────┴────────────┘
```

All primary zones visible without scrolling. Scroll (if any) reveals **year drill-down** or **full mission log** — never required to understand the campaign.

---

## Information hierarchy

What matters to the player-DJ, in priority order:

### Tier 1 — Campaign state (always visible)

| Concept | Game language | Data (1970's audit) | Why first |
|---------|---------------|---------------------|-----------|
| **Songs Owned** | Territories conquered | **581** matched videos · 549 RVTR | Proof of collection depth |
| **Songs Missing** | Unclaimed ground | **779** unmatched in folder | The frontier — identity work |
| **Collection progress** | Decade seal | **65%** avg exhibit completeness | Single “how am I doing?” number |
| **What To Do Next** | Your turn | Deploy → **Rhiannon** (RVTR097615) | One action, not a queue UI |

### Tier 2 — Strategic picture (glanceable)

| Concept | Game language | Data | Why second |
|---------|---------------|------|------------|
| **What I Know** | Exhibits complete | **309** high (≥75%) · **272** partial/low | Knowledge vs ownership |
| **Campaign progress** | Five campaigns | Covers 85% · Albums 77% · Commentary 0% · TV 0% · Movies 0% | Where enrichment effort goes |
| **Territory map** | Year regions 1970–79 | Per-year owned/missing density (derived) | Spatial decade story |
| **Active mission** | Conquer Rhiannon | 37 plays · 25% complete · no cover/album/tags | Highest priority target |

### Tier 3 — Momentum & depth (peripheral)

| Concept | Game language | Data | Why third |
|---------|---------------|------|-----------|
| **Mission stack** | Fortify / Scout | Night Moves (#2) · My Sweet Lord (#3) | Queue without table |
| **Recent discoveries** | Acquisition ribbon | Last N graph gains (tags, covers, chart links) | Reward loop — “you’re winning” |
| **Shelf context** | Fine print | 1,360 videos on shelf · 406 PlayCount known | Ground truth, not hero |

### Anti-patterns (do not surface above fold)

- Sortable tables, CSV export, filter chips
- “Avg completeness by dimension” as a grid
- Broken ops routes, Postgres keys, sync status
- More than **one** primary CTA

---

## The four pillars (emphasis zones)

### 1. Songs Owned — **581**

**Copy:** `SONGS OWNED` / `Territories in your crate`  
**Sub:** 549 distinct identities · 1,360 on shelf  
**Visual:** Left monolith on cream card, teal accent, trophy or wax-stamp icon.  
**Feel:** Baseball card “HITS” column — a number you’re proud of.

### 2. Songs Missing — **779**

**Copy:** `SONGS MISSING` / `Awaiting identity`  
**Sub:** Still in `VIDEO/1970's` without graph link  
**Visual:** Right monolith, orange hatch or compass icon — frontier, not failure.  
**Feel:** Risk empty territories — opportunity map, not error count.

### 3. What I Know — **309 / 272**

**Copy:** `WHAT I KNOW` / `Exhibits ready for the floor`  
**Split:** 309 complete (≥75%) · 272 still partial  
**Visual:** Museum placard under the scoreboard — two numbers, one sentence.  
**Feel:** Curator confidence — “I can spin these with full context.”

### 4. What To Do Next — **Deploy to Rhiannon**

**Copy:** `NEXT MOVE` / `Deploy to Rhiannon`  
**Sub:** RVTR097615 · album shelf empty · 37 plays waiting  
**Visual:** Risk reinforcement card — thick border, orange stamp, arrow. Single click → year-workspace or track exhibit.  
**Feel:** Your turn in the game — not “open task #847.”

---

## Campaign progress (five tracks)

All-Star Baseball stat-column treatment — hand-drawn bars, icons, no flat SaaS progress UI.

| Campaign | Score | Bar | Game verb |
|----------|------:|-----|-----------|
| **Covers** | 85% | ████████░░ | *Illustrate the wall* |
| **Albums** | 77% | ███████░░░ | *Build the shelf* |
| **Commentary** | 0% | ░░░░░░░░░░ | *Write the placards* (Retroverse Tags) |
| **TV** | 0% | ░░░░░░░░░░ | *Scout the screen* |
| **Movies** | 0% | ░░░░░░░░░░ | *Scout the cinema* |

**Decade seal (65%)** = weighted rollup of campaigns on **owned** matched videos only — not Hot 100 universe size.

Commentary at 0% is honest audit signal: tags exist on graph but audit dimension uses canonical tag depth; TV/Movies await graph edges (proxies today).

---

## Mission system

Missions replace “enrichment queue.” Same data (`PlayCount × gap`), game verbs.

| Rank | Verb | Target | Signal |
|------|------|--------|--------|
| **Active** | **Conquer** | Fleetwood Mac — *Rhiannon* | 37 plays · 25% · priority 27.8 |
| 2 | **Fortify** | Bob Seger — *Night Moves* | 85 plays · 69% |
| 3 | **Scout** | Billy Preston — *My Sweet Lord* | 30 plays · 23% |

**Card anatomy (trading card):**

```
┌─────────────────────────┐
│ ★ ACTIVE MISSION        │
│ CONQUER                 │
│ Fleetwood Mac           │
│ Rhiannon                │
│ ─────────────────────   │
│ 37 plays · 25% exhibit  │
│ □ Cover □ Album □ Tags  │
│         [ DEPLOY ]      │
└─────────────────────────┘
```

- **Conquer** = high rotation + low completeness (expand territory)  
- **Fortify** = high rotation + mid completeness (deepen exhibit)  
- **Scout** = medium rotation + low completeness (reconnaissance)

Only mission #1 gets glow/orange border. Missions 2–3 are stacked, slightly recessed.

---

## Territory metaphor — THE MAP

**Concept:** The 1970's decade is one **territory** on the Performance Universe world map. Inside it, **ten year-regions** (1970 … 1979) behave like Risk countries.

| Region state | Visual | Meaning |
|--------------|--------|---------|
| **Teal fill** | Owned density high | Most files matched + decent completeness |
| **Orange hatch** | Missing density high | Unmatched files or low completeness cluster |
| **Star token** | Chart peak / hot mission | e.g. 1977 anchor for *Rhiannon* mission |

**Interaction (future):** Click year → year sub-territory screen (same game language, finer map).  
**Above fold:** Map is **readable decoration + orientation** — not a clickable GIS. Detail on drill-down.

**Derived metric (per year):**  
`yearOwned / (yearOwned + yearMissing)` from folder paths or chart-year on matched RVTR.

---

## Recent discoveries

Museum **acquisition ribbon** — horizontal strip, ticket-stub or label aesthetic.

**Examples (illustrative):**

- Rhiannon entered Hot 100 orbit  
- Night Moves cover verified  
- Black Betty tags added  

**Rules:**

- Max 3–5 items above fold  
- Newest left  
- Verb = discovery language, not “row updated”  
- Tapping opens the exhibit (track page), not an ops log

---

## Collection progress

Three nested rings of progress (communicate without three charts):

| Ring | Label | 1970's value |
|------|-------|--------------|
| **Outer** | Decade exhibit depth | 65% seal |
| **Middle** | Crate identity | 581 / 1,360 matched (43%) |
| **Inner** | Chart universe (context) | 551 owned graph tracks vs 5,420 Hot 100 peaks |

Only **Decade 65%** is hero-sized. Crate and chart context live in sublines — avoid triple-donut SaaS charts.

---

## Example screen: 1970's Territory (spec)

**Route (future):** `/universe/1970s` or `/performance-universe/1970s`  
**Title block:** `1970's TERRITORY` · `PERFORMANCE UNIVERSE · YOUR CAMPAIGN`

### Above-the-fold content checklist

- [ ] Decade seal: **65%**
- [ ] Songs Owned: **581**
- [ ] Songs Missing: **779**
- [ ] What I Know: **309** complete · **272** partial
- [ ] Map: 1970–79 regions with owned/missing shading
- [ ] Campaign bars: Covers 85 · Albums 77 · Commentary 0 · TV 0 · Movies 0
- [ ] Active mission: Conquer Rhiannon
- [ ] What To Do Next: Deploy to Rhiannon → RVTR097615
- [ ] Recent discoveries: 3 acquisition labels
- [ ] Missions 2–3: Fortify Night Moves · Scout My Sweet Lord

### Below-the-fold (optional scroll)

- Full mission log (card grid, not table)  
- Year region drill-down  
- Hot 100 frontier teaser (“4,869 chart peaks beyond crate”)  
- Link to audit JSON for ops — **not** linked from hero

### Motion (light)

- Seal: subtle pulse on campaign gain (once)  
- Active mission: soft orange border breathe  
- Discovery ribbon: slide-in on new gain  
- No parallax, no dashboard auto-refresh spinner

---

## Component mapping (implementation hint)

| UI zone | Suggested component | Data hook |
|---------|---------------------|-----------|
| Territory header | `TerritoryPlaque` | decade slug |
| Map | `YearRegionMap` | per-year counts from audit/crate |
| Scoreboard | `CollectionMonolith` × 2 | owned / missing |
| What I Know | `ExhibitPlacard` | completeness buckets |
| Campaign | `CampaignStatBars` × 5 | dimension averages |
| Missions | `MissionCard` stack | audit queue JSON |
| Next move | `ReinforcementCard` | queue[0] |
| Discoveries | `AcquisitionRibbon` | recent ops/gain feed |

Reuse audit runner output — no new scoring logic for v1 UI.

---

## Success criteria

| Visitor says… | We hit |
|---------------|--------|
| “What IS this?” | Game/board/museum hybrid reads instantly |
| “I need to fix Rhiannon” | What To Do Next is unmissable |
| “I’m winning” | Owned + discoveries + campaign bars |
| “There’s a frontier” | Missing + map hatch + missions |

| Visitor says… | We missed |
|---------------|-----------|
| “Nice admin panel” | Too table-like, gray, small type |
| “Which metric matters?” | Too many equal-weight numbers |
| “I’ll scroll to find the task” | Next move not above fold |

---

## Artifacts

| File | Purpose |
|------|---------|
| `reports/1970s-territory-game-mockup.png` | Phase 2 visual mockup |
| `reports/1970s-territory-game-design.md` | This document |
| `reports/1970s-universe-mockup.md` | Phase 1 reference (superseded for game framing) |
| `reports/1970s-performance-universe-audit.md` | Live data |

---

## Next step (when ready to build)

1. Static React page from this spec — hardcoded audit snapshot  
2. Wire `run-1970s-performance-universe-audit.ts` output to props  
3. Year drill-down reuses same layout at 1977 (etc.) scale

No ops chrome. No tables above the fold. One territory, one turn, one holy-shit poster.
