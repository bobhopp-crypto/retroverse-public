# Retroverse Atlas — Phase 0 Mockups

**Date:** 2026-06-15  
**Status:** Static visual prototypes only — no implementation, no route changes, no deployment  
**Viewport:** Desktop-first · 1440 × 900 · 16" MacBook Pro · minimal scroll above the fold  
**Reference:** [Retroverse Atlas concept](https://chatgpt.com/s/m_6a3078eca3e88191bdc0d459db33e662)

---

## Purpose

Final visual direction for the Retroverse Atlas experience before Phase A code. Four screens, one design system, real 1970s audit data where available.

**Five-second test:** *"Holy shit, what is that?"* — not *"That's a nice admin panel."*

---

## Five questions (every screen)

| # | Question | Atlas language |
|---|----------|----------------|
| 1 | What do I own? | Songs Owned / Territories conquered |
| 2 | What am I missing? | Songs Missing / Unclaimed ground |
| 3 | What do I know? | What I Know / Exhibits ready |
| 4 | What should I do next? | Next Move / Deploy |
| 5 | What matters most? | Top mission / Active territory / Alignment verdict |

---

## Design system (all screens)

### Surfaces

| Token | Value | Use |
|-------|-------|-----|
| Paper | `#F4EED8` | Page background |
| Ink | `#1A1A1A` | Borders (3px), primary type |
| Teal | `#2A9D8F` | Owned, matched, progress fill |
| Signal orange | `#E85D04` | Next move, active mission, different |
| Card cream | `#FFF8EC` | Panels, mission cards |

### Typography ladder

| Role | Size | Example |
|------|------|---------|
| Screen hero | 88–104px | `1970's TERRITORY` |
| Scoreboard | 80–96px | `581`, `779` |
| Next move | 36–44px | `Deploy → Rhiannon` |
| Room / card title | 28–32px | `THE WORKSHOP` |
| Zone label | 12–14px uppercase | `SONGS OWNED` |
| Fine print | 13px min | `RVTR097615` |

### Shared chrome — Atlas rail

```
PERFORMANCE UNIVERSE · [WORLD] · 50s 60s 70s 80s 90s 00s · SEARCH · SUNDAY NIGHTS · STUDIO↔STAGE
```

- Horizontal poster rail — **not** a SaaS sidebar  
- `STUDIO↔STAGE` always visible when curator authenticated  
- No "Ops" label anywhere

### Banned above the fold

- Sortable tables, filter chips, gray metric grids  
- Words: Postgres, JSON, Vercel, API (detail drawer only)  
- 37-card tool directory  
- Broken route links

---

## Screen 1 — World Map

**Mockup:** `reports/atlas-world-map-mockup.png`

### Role

Universe entry. Six decade territories as Risk-style continents on a collectible atlas. Answers all five questions at global scale.

### Layout (1440 × 900)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ATLAS RAIL                                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│  YOUR COLLECTION CAMPAIGN                                                    │
│  Six territories · One universe                          [ WHAT MATTERS MOST ]│
├──────────────────────────────────────────────────────────────────────────────┤
│     ┌────────┐  ┌────────┐  ┌─────────────────────┐                          │
│     │ 1950s  │  │ 1960s  │  │ 1970s ★ ACTIVE      │  ← largest tile           │
│     │        │  │        │  │ 581 · 779 · 43%     │                          │
│     └────────┘  └────────┘  └─────────────────────┘                          │
│     ┌────────┐  ┌────────┐  ┌────────┐                                         │
│     │ 1980s  │  │ 1990s  │  │ 2000s  │                                         │
│     └────────┘  └────────┘  └────────┘                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│ GLOBAL: 2,760 OWNED · 4,347 MISSING · 39% COVERAGE                           │
│ NEXT MOVE: Deploy → Rhiannon · 1970's Territory                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Territory card schema

Each card shows:

| Field | Copy |
|-------|------|
| Decade name | `1970s` |
| Owned | matched count |
| Missing | unmatched count |
| Coverage % | `owned / (owned + missing)` |
| Exhibit depth | seal % (1970s only — live) |
| Active mission | top queue title or `—` |
| Status label | see below |

### Territory data

| Territory | Owned | Missing | Coverage | Exhibit | Active mission | Status | Data |
|-----------|------:|--------:|---------:|--------:|----------------|--------|------|
| **1950s** | 412 | 890 | 32% | — | — | Uncharted | Placeholder |
| **1960s** | 624 | 712 | 47% | — | Fortify Brown Eyed Girl | Active | Placeholder |
| **1970s ★** | **581** | **779** | **43%** | **65%** | **Conquer Rhiannon** | **Deploy Ready** | **Live audit** |
| **1980s** | 498 | 801 | 38% | — | Scout Take On Me | Active | Placeholder |
| **1990s** | 356 | 645 | 36% | — | — | Quiet | Placeholder |
| **2000s** | 289 | 520 | 36% | — | — | Uncharted | Placeholder |

**Global rollup (placeholders except 1970s):** 2,760 owned · 4,347 missing · 39% coverage

### Status labels

| Label | Meaning |
|-------|---------|
| **Deploy Ready** | Top mission ready — curator should act (1970s) |
| **Active** | Ongoing campaign, not top global priority |
| **Quiet** | Owned shelf, no urgent mission |
| **Uncharted** | No audit run yet — honest empty state |

### Visual emphasis — 1970s

- Largest card (≈1.4× others)  
- Orange glow border + `★ ACTIVE TERRITORY` badge  
- Only card with exhibit depth seal (65%)  
- `WHAT MATTERS MOST` callout arrow points here  
- Global Next Move references 1970s

### Five-question mapping

| Question | Answer on screen |
|----------|------------------|
| Own | Global owned + per-card owned |
| Missing | Global missing + per-card missing |
| Know | 1970s seal 65% (only live territory) |
| Next | Bottom Next Move card |
| Matters most | 1970s emphasis + Rhiannon mission |

---

## Screen 2 — 1970s Territory

**Mockup:** `reports/atlas-1970s-territory-mockup.png`  
**Data:** `reports/1970s-performance-universe-audit.json` (2026-06-15)

### Role

Canonical territory board. Phase 2 spec executed with fifth question added.

### Live data

| Metric | Value | Source |
|--------|------:|--------|
| Songs Owned | 581 | `summary.matchedVideos` |
| Songs Missing | 779 | 1,360 shelf − 581 matched |
| Mapped / explored (seal) | 65% | `summary.avgCompletenessPct` |
| Coverage (shelf identity) | 43% | 581 / 1,360 |
| What I Know — complete | 309 | `completenessBuckets.high` (≥75%) |
| What I Know — partial | 272 | mid 193 + low 79 |
| Distinct RVTR | 549 | `summary.uniqueRvtr` |
| PlayCount known | 406 | `summary.playCountKnown` |

### Campaign bars (dimension averages)

| Campaign | Score | Visual |
|----------|------:|--------|
| Covers | 85% | ████████░░ |
| Albums | 77% | ███████░░░ |
| Commentary | 0% | ░░░░░░░░░░ |
| TV | 0% | ░░░░░░░░░░ |
| Movies | 0% | ░░░░░░░░░░ |

### Mission stack

| Rank | Verb | Artist — Title | Plays | Complete | Priority |
|------|------|----------------|------:|---------:|---------:|
| **1 ★** | Conquer | Fleetwood Mac — Rhiannon | 37 | 25% | 27.75 |
| 2 | Fortify | Bob Seger — Night Moves | 85 | 69% | 26.35 |
| 3 | Scout | Billy Preston — My Sweet Lord | 30 | 23% | 23.10 |

**Next Move:** Deploy → Rhiannon · RVTR097615

### What matters most

Ranked enrichment targets — `PlayCount × (100 − completeness%) / 100`:

```
1  Rhiannon      · Fleetwood Mac   · 37 plays · 25% · 27.8
2  Night Moves   · Bob Seger       · 85 plays · 69% · 26.4
3  My Sweet Lord · Billy Preston   · 30 plays · 23% · 23.1
```

Shown as numbered trading-card ranks — **not** a sortable table. Top 3 above fold; full top 100 below scroll.

### Zones (above fold)

1. Territory plaque + 65% wax seal  
2. Year map 1970–79 (star on 1976 / Rhiannon)  
3. Owned / Missing monoliths + What I Know placard  
4. Five campaign stat bars  
5. Mission stack (3 cards)  
6. What matters most (top 3 ranks)  
7. Next Move reinforcement card  
8. Recent discoveries ribbon (illustrative until feed exists)

### Five-question mapping

| Question | Answer |
|----------|--------|
| Own | 581 |
| Missing | 779 |
| Know | 309 complete · 272 partial |
| Next | Deploy → Rhiannon |
| Matters most | Ranked list · Rhiannon #1 |

---

## Screen 3 — Workshop

**Mockup:** `reports/atlas-workshop-mockup.png`

### Role

Visual replacement for the 37-card `/ops` directory — **prototype only**. Six rooms, not six workflows with 37 links. Backstage behind velvet rope.

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ THE WORKSHOP · Behind the atlas · Curator tools only            [PIN GATE]  │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ SHELF                         │ MISSIONS                                     │
│ Media Sync                    │ 1970s Territory                              │
│ Year Match                    │ Year Workspace                               │
│ Acquisition                   │ Cover Review · Backfill · Fix                │
│ "412 unmatched this week"     │ "Rhiannon needs deploy"                      │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ SHOW PREP                     │ EVENT DESK                                   │
│ Set Builder                   │ Event Control                                │
│ Sunday Nights                 │ Pass Generator · Registrations               │
│ Playlist Match                │ "Homepage: Years mode"                       │
│ "Next show in 4 days"         │                                              │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ CREATE                        │ SURGERY                                      │
│ Content Creator               │ Healing · Archive · Debug                    │
│ Pass Art                      │ "Rare · gated"                               │
│ "12 credentials in library"   │                                              │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

### Six rooms — tool mapping

Tools mapped from `ops-architecture-audit.md` and `ops-workflow-audit.md`. Broken/duplicate/debug routes excluded from primary room lists.

#### Room 1 — Shelf (library health)

| Tool | Current route | Role |
|------|---------------|------|
| Media Sync | `/ops/media-sync` | VDJ ↔ R2 inventory |
| Year Match | `/ops#year-match` | Chart ↔ VDJ reconciliation |
| Acquisition | `/ops/acquisition` | Missing media export |

**Status line:** Unmatched count from latest sync  
**Hidden from room:** broken hub/infrastructure cards

#### Room 2 — Missions (enrichment campaigns)

| Tool | Current route | Role |
|------|---------------|------|
| 1970s Territory | `/atlas/1970s` (future) | Campaign board |
| Year Workspace | `/ops/year/{y}` | Video classify + tags |
| Cover Review | `/ops/review/covers` | Covers campaign QA |
| Cover Backfill | `/ops/covers/backfill` | Batch fill |
| Cover Fix | `/ops/covers/corrections` | Promote repairs |

**Status line:** Top mission from active territory  
**Merged later:** rvtags-review, sorting → Year Workspace tabs

#### Room 3 — Show Prep

| Tool | Current route | Role |
|------|---------------|------|
| Set Builder | `/ops/show-builder` | MyList → playlist |
| Sunday Nights | `/ops/sunday-nights` | Live cockpit |
| Playlist Match | SN match modal | RVTR alias |

**Status line:** Days to next show / bridge state  
**Merged later:** `/ops/live` → Sunday Nights panel

#### Room 4 — Event Desk

| Tool | Current route | Role |
|------|---------------|------|
| Event Control | `/ops/event-control` | Homepage programming |
| Pass Generator | `/ops/passes` | Print passes |
| Pass Registrations | `/ops/pass-registrations` | Door sign-ups |

**Status line:** Homepage mode + featured years

#### Room 5 — Create

| Tool | Current route | Role |
|------|---------------|------|
| Content Creator | `/ops/content-creator` | Credential library |
| Pass Art | `/ops/content-creator/create` | New VIP art |

**Status line:** Library count  
**Excluded:** creative-lab (merge later), all debug routes

#### Room 6 — Surgery (rare / archive)

| Tool | Current route | Role |
|------|---------------|------|
| Healing | `/ops/healing` | Gated graph repair |
| Archive | `/ops/media-collections`, `/ops/media-lab` | TV / long-form |
| Debug | `/ops/content-creator/debug/*` | Engineering only |

**Status line:** `Rare · gated`  
**Also houses:** crossroads, crate-builder (experimental), broken route graveyard docs

### Excluded from Workshop (intentionally)

| Item | Reason |
|------|--------|
| `/ops/hub`, `/infrastructure`, `/recovery`, `/rvbr`, `/continuity`, `/integrity` | Broken — no page |
| `/ops/covers`, `/covers/train`, redirect chains | Legacy URLs only |
| `/ops/live` standalone | Merges into Show Prep |
| `/ops` 37-card directory | Replaced by this layout |
| `/control-center` | Dev-only |

### Five-question mapping

| Question | Answer |
|----------|--------|
| Own | Shelf room status |
| Missing | Shelf unmatched line |
| Know | Missions room → territory boards |
| Next | Missions status · Rhiannon |
| Matters most | Room with orange status (Missions) |

---

## Screen 4 — Two Realities

**Mockup:** `reports/atlas-two-realities-mockup.png`

### Role

Always-visible Studio ↔ Stage compass. Plain language alignment — no devops dashboard.

### Collapsed strip (Atlas rail)

```
STUDIO (your desk)  ⟷  STAGE (visitors)     Alignment: Different     Sync First
```

Click expands to full screen (mockup) or fold-down placard.

### Expanded layout

```
┌──────────────────────────────┬──────────────────────────────┐
│ STUDIO · YOUR DESK           │ STAGE · VISITORS             │
│ ● Ready                      │ ○ Idle                       │
│                              │                              │
│ Working on 1970s missions    │ retroverse.live              │
│ Blueprint: 2 changes pending │ Blueprint: deployed yesterday│
│ Show floor: Idle             │ Show floor: Idle             │
│ Program: Years · 67·78·92    │ Program: Years · 67·78·92    │
│ DJ Bridge: Running           │ Last update: 2h ago          │
│                              │                              │
│ [ DIFFERENT ]                │ [ MATCHED program ]          │
└──────────────────────────────┴──────────────────────────────┘
│ ALIGNMENT          │ SYNC STATUS    │ DEPLOY READINESS          │
│ Different          │ Sync First     │ Good To Go *              │
└────────────────────┴────────────────┴───────────────────────────┘
│ See technical details ▸  (drawer: commit SHAs, storage backend) │
└─────────────────────────────────────────────────────────────────┘
```

### Plain-language verdicts

| Dimension | Matched | Different | Can't compare |
|-----------|---------|-----------|---------------|
| **Blueprint** | Desk code = stage code | Uncommitted or undeployed changes | — |
| **Show floor** | Both idle or same song | Live track differs | Desk uses local notes* |
| **Program** | Same homepage story | Featured years or mode differ | — |

\*When local uses file-based state vs stage uses cloud store — show **Can't compare** for show floor only, not an error.

### Deploy readiness

| Label | Meaning |
|-------|---------|
| **Good to go** | Show floor + program matched; blueprint diff is optional push |
| **Sync first** | Show floor or program differs during event week |
| **Not ready** | Bridge sleeping on show night OR validation failed |

### Example state (mockup)

| Field | Studio | Stage |
|-------|--------|-------|
| Show floor | Idle | Idle → **Matched** |
| Program | Years · 1967·1978·1992 | Same → **Matched** |
| Blueprint | 2 changes not deployed | Deployed yesterday → **Different** |
| **Overall alignment** | | **Different** (blueprint only) |
| **Sync status** | | **Sync first** (blueprint pending) |
| **Deploy readiness** | | **Good to go** *after blueprint push |

### Technical detail drawer (hidden by default)

Only on expand — never above fold:

- Commit short SHA (desk vs stage)  
- Storage backend label  
- Bridge PID  
- Last bridge write timestamp  

### Five-question mapping

| Question | Answer |
|----------|--------|
| Own | — (not primary on this screen) |
| Missing | — |
| Know | Program line — what visitors see |
| Next | Sync First → push blueprint |
| Matters most | Deploy readiness stamp |

---

## Visual hierarchy (cross-screen)

| Priority | Element | Screens |
|----------|---------|---------|
| 1 | Hero title / territory name | All |
| 2 | Scoreboard numbers or alignment verdict | Map, 1970s, Realities |
| 3 | Next Move / Deploy CTA | Map, 1970s |
| 4 | Active mission or emphasis tile | Map, 1970s |
| 5 | Campaign bars or room status | 1970s, Workshop |
| 6 | Peripheral: discoveries, mission stack 2–3 | 1970s |

---

## Information hierarchy (cross-screen)

| Tier | Content |
|------|---------|
| **1 — Act now** | Next Move, Deploy readiness, Active mission |
| **2 — Campaign state** | Owned, Missing, Know, Alignment |
| **3 — Context** | Campaign bars, room tools, global rollup |
| **4 — Depth** | Rank 4–100, technical drawer, archive tools |

---

## Artifact index

| File | Screen |
|------|--------|
| `reports/atlas-phase-0-mockups.md` | This document |
| `reports/atlas-world-map-mockup.png` | World Map |
| `reports/atlas-1970s-territory-mockup.png` | 1970s Territory |
| `reports/atlas-workshop-mockup.png` | Workshop |
| `reports/atlas-two-realities-mockup.png` | Two Realities |
| `reports/retroverse-experience-blueprint.md` | Architecture source |
| `reports/1970s-performance-universe-audit.json` | Live 1970s data |

---

## Phase A routing recommendation

### Question

Should Phase A implement `/atlas`, `/atlas/1970s`, `/workshop` — or start under `/ops/atlas`?

### Recommendation: **Start at `/ops/atlas` for Phase A**

| Path | Phase A | Phase B+ |
|------|---------|----------|
| World Map | `/ops/atlas` | `/atlas` |
| 1970s Territory | `/ops/atlas/1970s` | `/atlas/1970s` |
| Workshop prototype | `/ops/atlas/workshop` | `/workshop` |
| Two Realities | Strip on all atlas pages + `/ops/atlas/realities` | Same at `/atlas/realities` |

### Why `/ops/atlas` first

1. **Zero disruption** — `/ops` directory stays; no routes removed (your constraint)  
2. **Gate exists** — `RETROVERSE_OPS=1` + PIN already protect curator surfaces  
3. **Safe sandbox** — static prototype won't leak to public if middleware unchanged  
4. **One entry point** — add single "Atlas" card to ops directory (or footer link) without replacing 37 cards  
5. **Easy promote** — when visual validates, add `/atlas` routes with same components + 301 from `/ops/atlas`

### Why not `/atlas` on day one

- New top-level route needs gate wiring and nav decisions on public shell  
- Risk of bookmark confusion if URL moves twice  
- Workshop at `/workshop` without ops prefix implies backstage is top-level — premature before directory retirement

### Phase A scope (when you say build)

```
/ops/atlas              → World Map (static, audit JSON)
/ops/atlas/1970s        → Territory board (static)
/ops/atlas/workshop     → Workshop rooms (static links to existing /ops routes)
/ops/atlas/realities    → Two Realities (static mock state)
```

All pages: static HTML/React, hardcoded JSON, links out to existing tools — **no new APIs, no ops replacement**.

### Phase B promote (later)

```
/atlas                  → same components
/atlas/1970s
/workshop
/ops/atlas/*            → 301 redirect
/ops                    → eventually → /workshop
```

### Counter-argument (if you want clean URLs immediately)

Implement `/atlas` behind the same ops middleware from day one — works if you're confident the URL won't change. Tradeoff: more middleware/nav work before validating pixels.

**Bottom line:** Prototype under `/ops/atlas` · promote to `/atlas` when Phase A looks right in browser.

---

## Phase A build checklist (future — not now)

- [ ] Static pages at `/ops/atlas`, `/ops/atlas/1970s`, `/ops/atlas/workshop`, `/ops/atlas/realities`
- [ ] Load `1970s-performance-universe-audit.json` for territory screen
- [ ] Placeholder data for World Map non-1970s cards
- [ ] Atlas rail component shared across four screens
- [ ] Two Realities collapsed strip in rail
- [ ] Workshop room links → existing `/ops/*` routes (new tab or same)
- [ ] No changes to `/ops` directory except optional one "Atlas" card
- [ ] No deployment required for local review

---

*Phase 0 complete. Review mockups in `reports/atlas-*-mockup.png`. Say go for Phase A static implementation.*
