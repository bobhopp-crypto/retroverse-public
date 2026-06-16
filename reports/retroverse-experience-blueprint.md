# Retroverse Experience Blueprint

**Phase 3 — Performance Universe Architecture**  
**Date:** 2026-06-15  
**Status:** Design only — do not implement yet  
**Inputs:** `1970s-territory-game-design.md`, `1970s-territory-game-mockup.png`, `1970s-performance-universe-audit.json`, `ops-workflow-audit.md`, `ops-architecture-audit.md`  
**Viewport anchor:** Desktop-first · 1440 × 900 · 16" MacBook Pro · minimal scroll above the fold

---

## North star

Retroverse is a **collectible music atlas** — a museum you campaign through, not a tool suite you administer.

**Four questions every screen must answer:**

| # | Question | Game language |
|---|----------|---------------|
| 1 | What do I own? | **Songs Owned** — territories conquered |
| 2 | What am I missing? | **Songs Missing** — unclaimed ground |
| 3 | What do I know? | **What I Know** — exhibits ready for the floor |
| 4 | What should I do next? | **Next Move** — your turn |

**Five-second test:** *"Holy shit, what is that?"* — not *"That's a nice admin panel."*

---

## Part 1 — Information Architecture

### 1.1 Conceptual model (blank sheet)

Retroverse has **three layers**, not two (public vs ops):

```
┌─────────────────────────────────────────────────────────────────┐
│  THE FLOOR          What visitors see · retroverse.live         │
│  (Exhibits, Search, Sunday Nights, Territory teasers)           │
├─────────────────────────────────────────────────────────────────┤
│  THE ATLAS          Your collection campaign · curator home     │
│  (Territories, Missions, Campaigns, Discoveries)                │
├─────────────────────────────────────────────────────────────────┤
│  THE BACKSTAGE      Power tools · never primary navigation      │
│  (Live cockpit, cover QA, sync, passes, gated surgery)          │
└─────────────────────────────────────────────────────────────────┘
```

**Territories** are the spine of The Atlas. Everything else hangs off them.

| Layer | Audience | Mental model |
|-------|----------|--------------|
| **The Floor** | Public, collectors, show guests | Museum wing + live stage |
| **The Atlas** | Bob (curator-DJ) | Campaign board + field guide |
| **The Backstage** | Bob (operator) | Workshop behind the velvet rope |

Ops today = Backstage mislabeled as the product. Phase 3 inverts that.

---

### 1.2 Entity hierarchy

```
Performance Universe
└── Territory (decade: 1950s … 2000s)
    └── Year Region (1970 … 1979)
        └── Exhibit (RVTR track identity)
            ├── Media file(s) on shelf
            ├── Campaign scores (Cover, Album, Commentary, TV, Movie)
            └── Mission eligibility (PlayCount × gap)
```

**Canonical IDs never disappear.** RVTR/RVAL/RVAR are exhibit accession numbers — shown as fine print, not navigation.

---

### 1.3 Content types (experience objects)

| Object | User-facing name | Purpose |
|--------|------------------|---------|
| **Territory** | `1970's Territory` | Decade campaign board |
| **Year Region** | `1974` on the map | Sub-territory drill-down |
| **Exhibit** | Track page | Single song's museum placard |
| **Mission** | Conquer / Fortify / Scout card | Actionable enrichment target |
| **Campaign** | Covers · Albums · Commentary · TV · Movies | Progress tracks |
| **Discovery** | Acquisition ribbon item | Recent graph gain |
| **Show** | Sunday Nights | Live performance event |
| **Pass** | Collector credential | Event collectible |

No "workspace," "console," "board," or "dashboard" in primary IA copy.

---

### 1.4 Territory schema (all decades)

Each territory exposes the **same six surfaces**. Data may be sparse until audit runners exist per decade.

| Surface | Field | Definition | 1970's (live audit) |
|---------|-------|------------|---------------------|
| **Owned** | `songsOwned` | Matched videos with graph link (RVTR) | **581** |
| **Missing** | `songsMissing` | Files on shelf without graph link | **779** |
| **Coverage %** | `coveragePct` | `owned / (owned + missing)` — identity on shelf | **43%** (581/1360) |
| **Exhibit depth** | `exhibitDepthPct` | Avg completeness on owned matched | **65%** (seal) |
| **What I Know** | `exhibitsComplete` / `exhibitsPartial` | High (≥75%) vs rest | **309** / **272** |
| **Campaign progress** | five 0–100% bars | Dimension averages on owned | Covers 85 · Albums 77 · Commentary 0 · TV 0 · Movies 0 |
| **Active missions** | top 3 queue | `PlayCount × (100 − completeness%)` | Rhiannon · Night Moves · My Sweet Lord |
| **Recent discoveries** | last N gains | Human-readable acquisition events | (feed TBD) |
| **Next move** | queue[0] | Single CTA target | Deploy → Rhiannon |

**Placeholder territories (1950s–2000s except 1970s):** Same layout, data from generalized audit runner or "Uncharted" state with honest empty campaigns until first audit pass.

| Territory | VDJ folder pattern | Audit status |
|-----------|-------------------|--------------|
| **1950s** | `VIDEO/1950's` | Uncharted — runner needed |
| **1960s** | `VIDEO/1960's` | Partial — year-workspace pilots (1967) |
| **1970s** | `VIDEO/1970's` | **Live** — `1970s-performance-universe-audit.json` |
| **1980s** | `VIDEO/1980's` | Uncharted |
| **1990s** | `VIDEO/1990's` | Uncharted |
| **2000s** | `VIDEO/2000's` | Uncharted |

**Coverage % vs Exhibit depth:** Two different numbers, never conflated.

- **Coverage %** = "How much of my shelf has identity?"
- **Exhibit depth %** = "How rich are the exhibits I own?"

Hero seal = **Exhibit depth**. Sublines carry coverage.

---

### 1.5 Information tiers (global rule)

Every Atlas screen respects three tiers:

| Tier | Always visible | Examples |
|------|----------------|----------|
| **1 — Campaign state** | Yes, above fold | Owned, Missing, Seal, Next Move |
| **2 — Strategy** | Yes, above fold | What I Know, Campaign bars, Map, Active mission |
| **3 — Momentum** | Peripheral or scroll | Mission stack, Discoveries, chart frontier, shelf fine print |

**Never Tier 1:** tables, filter chips, Postgres keys, route lists, sync stack traces.

---

### 1.6 Cross-territory views

| View | Purpose | Above fold |
|------|---------|------------|
| **World Map** | All six territories as Risk continents | Seal per decade, one-line owned/missing |
| **Territory Board** | Single decade (Phase 2 mockup) | Full four-question layout |
| **Year Region** | One year inside decade | Smaller map + year missions |
| **Exhibit** | Single RVTR | Artist, title, campaigns, chart, video |
| **Mission Deploy** | Deep link from Next Move | Exhibit editor framed as mission completion |

---

## Part 2 — Navigation Architecture

### 2.1 Design rule: journeys, not routes

Navigation is labeled by **place and intent**, not URL paths or tool names.

| ❌ Route-centric | ✅ Experience-centric |
|-----------------|----------------------|
| `/ops/year/1978` | 1970's Territory → 1978 Region |
| `/ops/review/covers` | Covers Campaign → Review batch |
| `/ops/sunday-nights` | Sunday Nights · Live Stage |
| `/ops` | Backstage (hidden entry) |

URLs may exist for bookmarks; **chrome never leads with them**.

---

### 2.2 Primary navigation (Atlas — curator mode)

Fixed **atlas rail** — horizontal, poster-style, not a SaaS sidebar.

```
[ WORLD MAP ]  [ 1950s ] [ 1960s ] [ 1970s ★ ] [ 1980s ] [ 1990s ] [ 2000s ]     [ SEARCH ]  [ SUNDAY NIGHTS ● ]
                                                                                                    [ STUDIO ↔ STAGE ]
```

| Item | Destination | When visible |
|------|-------------|--------------|
| **World Map** | Universe overview | Always (Atlas home) |
| **Territory tabs** | Decade board | Always |
| **Search** | Canonical entity discovery | Always |
| **Sunday Nights** | Live show floor | Always; pulses when live |
| **Studio ↔ Stage** | Two Realities strip | Curator only (ops gate) |

**No "Ops" in primary nav.** Backstage entry = small wax seal icon or footer "Workshop" link after PIN.

---

### 2.3 Secondary navigation (within territory)

Horizontal **campaign tabs** below territory plaque — All-Star Baseball stat column metaphor:

```
[ OVERVIEW ]  [ COVERS ]  [ ALBUMS ]  [ COMMENTARY ]  [ TV ]  [ MOVIES ]  [ MISSIONS ]
```

- **Overview** = Phase 2 territory board (default landing)
- Campaign tabs = filtered mission stacks + campaign-specific progress (no tables above fold)
- **Missions** = full card grid (scroll allowed)

---

### 2.4 Public navigation (The Floor)

Visitors get a **lighter atlas rail**:

```
[ HOME ]  [ SEARCH ]  [ YEARS ]  [ SUNDAY NIGHTS ]  [ COLLECT ]
```

- **Years** = chart chronology (`/rv`, `/charts`) — discovery, not campaign
- **Collect** = passes, credentials (event mode)
- Territory campaign boards are **curator-only** unless a territory is promoted as a public "wing opening" event

---

### 2.5 Backstage navigation (The Workshop)

Not in primary chrome. Entered via PIN → **Workshop** hub organized by **workflow mode**, not 37 feature cards:

| Workshop mode | Intent | Replaces |
|---------------|--------|----------|
| **Tonight** | Live show | sunday-nights + live merge |
| **Shelf** | Library health | media-sync, year-match, acquisition |
| **Show Prep** | Before next SN | show-builder, year workspace tabs |
| **Illustrate** | Cover campaigns | cover review, backfill, fix |
| **Archive** | TV / long-form | media-collections, media-lab |
| **Event Desk** | Marketing | event-control, content-creator, passes |
| **Surgery** | Gated graph repair | healing (rare) |

Workshop uses **functional language internally** — still not exposed on The Atlas.

---

### 2.6 Navigation depth budget

| Level | Max depth from Atlas home |
|-------|---------------------------|
| Territory board | 1 click |
| Year region | 2 clicks |
| Exhibit | 2–3 clicks |
| Mission deploy | 1 click from Next Move |
| Workshop tool | 2 clicks (Workshop → mode → tool) |

---

## Part 3 — Visual Hierarchy

### 3.1 Global eye path (Territory board)

Identical to Phase 2 — canonical for all territories:

1. Territory plaque (hero title)
2. Exhibit depth seal (decade %)
3. Owned / Missing monoliths
4. Year region map
5. **Next Move** reinforcement card (orange)
6. Active mission card
7. Campaign stat bars
8. What I Know placard
9. Recent discoveries ribbon
10. Mission stack (2–3)

### 3.2 World Map eye path

1. **PERFORMANCE UNIVERSE** hero
2. Six territory cards (poster tiles, not equal-weight grid cells)
3. Global collection summary (total owned / missing across decades)
4. **Next Move** across all territories (highest priority mission globally)
5. Studio ↔ Stage strip (curator only)

### 3.3 Typography ladder (desktop)

| Role | Size | Weight |
|------|------|--------|
| Universe / Territory hero | 88–104px | 900 |
| Scoreboard numbers | 80–96px | 800 |
| Next Move headline | 36–44px | 800 |
| Campaign / seal % | 28–32px | 700 |
| Mission card title | 22–26px | 700 |
| Zone labels | 12–14px uppercase | 700 |
| Accession (RVTR) | 13px min | 600 |

### 3.4 Color system

| Token | Hex | Role |
|-------|-----|------|
| Paper | `#F4EED8` | Dominant background |
| Ink | `#1A1A1A` | Borders, primary type |
| Teal | `#2A9D8F` | Owned, progress fill |
| Signal orange | `#E85D04` | Next move, active mission, missing hatch |
| Card cream | `#FFF8EC` | Panels |

**Banned above the fold:** `#6B7280` SaaS gray, glass blur, 1px hairlines, zebra tables, icon-only sidebars.

### 3.5 Component vocabulary

| Component | Metaphor |
|-----------|----------|
| `TerritoryPlaque` | Museum wing sign |
| `CollectionMonolith` | Baseball card stat column |
| `YearRegionMap` | Risk board |
| `CampaignStatBars` | All-Star Baseball back |
| `MissionCard` | Trading card |
| `ReinforcementCard` | Risk deploy card |
| `AcquisitionRibbon` | Museum acquisition label |
| `WaxSeal` | Decade completion stamp |
| `TwoRealitiesStrip` | Split compass (Studio / Stage) |

---

## Part 4 — Desktop Layouts

### 4.1 Territory board (1440 × 900) — reference layout

Primary spec: `1970s-territory-game-mockup.png` + Phase 2 doc.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ATLAS RAIL: World · 50s · 60s · 70s · 80s · 90s · 00s · Search · SN · ⟷      │
├──────────────────────────────────────────────────────────────────────────────┤
│  1970's TERRITORY                                         [ 65% WAX SEAL ]   │
│  PERFORMANCE UNIVERSE · YOUR CAMPAIGN                                        │
├────────────────────┬─────────────────────────────┬───────────────────────────┤
│  THE MAP           │  OWNED 581    MISSING 779   │  CAMPAIGN PROGRESS        │
│  1970–79 regions   │  WHAT I KNOW 309 · 272      │  Covers      ████ 85%    │
│                    │  Coverage 43% (fine)        │  Albums      ███░ 77%    │
│                    │                             │  Commentary  ░░░░  0%    │
│                    │                             │  TV / Movies ░░░░  0%    │
├────────────────────┴─────────────────────────────┴───────────────────────────┤
│  DISCOVERIES ribbon     │  MISSION STACK          │  NEXT MOVE               │
│  3 acquisition labels   │  ① Conquer Rhiannon ★   │  Deploy → Rhiannon       │
└─────────────────────────┴─────────────────────────┴──────────────────────────┘
│ CAMPAIGN TABS: Overview · Covers · Albums · Commentary · TV · Movies · Missions │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Scroll policy:** Zero scroll required to answer all four questions. Scroll reveals mission log, year drill-down, chart frontier teaser.

---

### 4.2 World Map (1440 × 900)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  PERFORMANCE UNIVERSE                                    STUDIO ↔ STAGE      │
│  YOUR COLLECTION CAMPAIGN                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐                                      │
│   │ 1950s   │  │ 1960s   │  │ 1970s ★ │   ← largest tile = focus territory │
│   │ ??%     │  │ ??%     │  │ 65%     │                                      │
│   │ · owned │  │ · owned │  │ 581/779 │                                      │
│   └─────────┘  └─────────┘  └─────────┘                                      │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐                                      │
│   │ 1980s   │  │ 1990s   │  │ 2000s   │                                      │
│   └─────────┘  └─────────┘  └─────────┘                                      │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  GLOBAL: 12,400 owned · 8,200 missing (illustrative until all audits run)    │
│  NEXT MOVE (universe): Deploy → Rhiannon · 1970's Territory                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Territory tiles = **collectible atlas pages**, not dashboard widgets. Uneven sizing OK (featured decade larger).

---

### 4.3 Year region (1440 × 900)

Same grammar as territory board, compressed:

- Hero: `1976` (not "Year Workspace")
- Map: quarters or seasons (optional) OR track constellation
- Owned/Missing for year only
- Missions filtered to `performanceYear === 1976`
- Next Move scoped to year

---

### 4.4 Exhibit page (existing track page — evolved)

Above fold for curator (ops gate):

- Exhibit placard (artist, title, RVTR)
- Five campaign mini-bars
- **If this track is active mission:** orange mission banner + Deploy actions
- Public visitors: no mission chrome — pure museum exhibit

---

### 4.5 Two Realities strip (Studio ↔ Stage)

Always visible in Atlas rail when curator authenticated. **Not a dashboard panel** — a **compass bar**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  STUDIO (your desk)          ⟷          STAGE (visitors)                     │
│  ● Ready to show              ○          ● Live · Tiny Dancer                │
│  Changes not deployed yet                Last updated 2h ago                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

Click expands **fold-down placard** (still no table):

| Zone | Plain language | States |
|------|----------------|--------|
| **Your desk** | What you're working on locally | Ready · Drafting · Out of date |
| **The stage** | What retroverse.live shows | Live · Idle · Event mode |
| **Alignment** | One-word verdict | **Matched** · **Different** · **Can't compare** |
| **Show readiness** | Can you deploy tonight? | **Good to go** · **Sync first** · **Not ready** |

See Part 5.6 for field mapping.

---

### 4.6 Workshop hub (backstage — 1440 × 900)

Only layout that may feel slightly "panel-like" — still **not gray SaaS**:

- Seven mode cards (Tonight, Shelf, Show Prep, …) as **workshop doors**
- Each door shows **one status line** + **one next action**
- No 37-card directory

---

## Part 5 — Data Requirements

### 5.1 Territory snapshot (per decade)

**Artifact:** `reports/{decade}-performance-universe-audit.json` (generalize runner from 1970s)

```typescript
type TerritorySnapshot = {
  territoryId: "1950s" | "1960s" | "1970s" | "1980s" | "1990s" | "2000s";
  generatedAt: string;
  summary: {
    matchedVideos: number;      // songsOwned
    unmatchedVideos: number;    // songsMissing
    totalOnShelf: number;
    uniqueRvtr: number;
    coveragePct: number;
    avgCompletenessPct: number; // exhibitDepthPct / seal
    completenessBuckets: { high: number; mid: number; low: number };
    campaignPct: {
      covers: number;
      albums: number;
      commentary: number;
      tv: number;
      movies: number;
    };
  };
  yearRegions: Array<{
    year: number;
    owned: number;
    missing: number;
    coveragePct: number;
  }>;
  missions: Array<Mission>;     // top 100, UI shows 3
  discoveries: Array<Discovery>; // last N
};

type Mission = {
  verb: "conquer" | "fortify" | "scout";
  rvtr: string;
  artist: string;
  title: string;
  playCount: number;
  completenessPct: number;
  enrichmentPriority: number;
  campaignGaps: ("cover" | "album" | "commentary" | "tv" | "movie")[];
};

type Discovery = {
  at: string;
  label: string;   // "Rhiannon entered Hot 100 orbit"
  rvtr?: string;
  kind: "cover" | "chart" | "tags" | "album" | "identity";
};
```

**Refresh cadence:** On demand + after VDJ sync / tag pass / cover batch. Cached JSON served to UI; no live PG scan on page load.

---

### 5.2 Universe rollup

Aggregate six territory snapshots:

- `totalOwned`, `totalMissing`, `globalNextMove` (max enrichmentPriority)
- Per-territory seal for World Map tiles

---

### 5.3 Exhibit depth scoring (existing — do not reinvent)

From `run-1970s-performance-universe-audit.ts`:

| Campaign | Score source |
|----------|--------------|
| Covers | Album cover resolution |
| Albums | Album graph link depth |
| Commentary | Retroverse Tags (`ops/retroverse-tags-by-rvtr.json`) |
| TV / Movies | Path/tag proxies until graph edges exist |

**Mission priority:** `PlayCount × (100 − completenessPct) / 100`

---

### 5.4 Discoveries feed

**New requirement:** append-only log of curator-visible gains.

| Source event | Discovery label |
|--------------|-----------------|
| Chart link added | "{Title} entered Hot 100 orbit" |
| Cover verified | "{Title} cover verified" |
| Tags approved | "{Title} placard written" |
| RVTR matched | "{Title} claimed for the collection" |
| Album linked | "{Title} shelf built" |

**Store:** `RETROVERSE_DATA/atlas/discoveries.jsonl` or PG table `atlas_discoveries` — design choice at implementation. UI needs last 5 per territory.

---

### 5.5 Live show data (Sunday Nights)

Unchanged canonical store: `sunday_nights_state` (PG prod / JSON local).

Atlas rail **Sunday Nights** link reads public payload — same as today.

---

### 5.6 Two Realities (Studio ↔ Stage) data

**Design goal:** Always visible, zero jargon, honest about local vs production split.

#### Plain-language labels

| Internal | User sees |
|----------|-----------|
| Local dev | **Studio** (your desk) |
| Production | **Stage** (the show floor) |
| Git commit | **Blueprint version** |
| Deployed commit | **What's on stage** |
| OUT OF SYNC | **Different** |
| IN SYNC | **Matched** |
| JSON vs Postgres storage | **Note:** "Desk uses local notes" — not a error |
| Bridge PID | **DJ bridge** · Running / Sleeping |
| Event mode | **Event night** · On / Off |

#### Strip fields (collapsed)

| Field | Studio | Stage |
|-------|--------|-------|
| **Status dot** | Ready / Drafting | Live / Idle |
| **Headline** | e.g. "Changes not deployed" | e.g. "Visitors see 1967 hero" |
| **Alignment** | Matched / Different / Can't compare | (single verdict) |
| **Show readiness** | Good to go / Sync first / Not ready | — |

#### Expanded placard (on click)

| Check | Question it answers |
|-------|---------------------|
| **Blueprint** | Is your desk code what's deployed? |
| **Show floor** | Is live now-playing the same on desk and stage? |
| **Program** | Same featured years + homepage story? |
| **Collection data** | Same Postgres graph? (always yes if shared Neon) |
| **Deploy** | One button: "Push to stage" → existing deploy flow |

#### Alignment logic (from reality-dashboard-feasibility)

| Dimension | Matched when |
|-----------|--------------|
| Blueprint | local commit === deployed commit (± dirty flag) |
| Show floor | both live null OR same RVTR |
| Program | homepage mode + featured years equal |
| Collection | shared PG → always matched; local-only JSON → "Can't compare" for live |

**Show readiness:**

- **Good to go** — Blueprint matched + Show floor matched + no dirty uncommitted programming
- **Sync first** — Different on show floor or program during event week
- **Not ready** — Bridge sleeping on show night OR validation failures from SN system panel

#### API shape (future)

`GET /api/atlas/realities` (ops-gated) returns both columns + verdicts — aggregates existing loaders from feasibility doc; **no new storage**.

---

### 5.7 Data sources map

| UI need | Source today | Gap |
|---------|--------------|-----|
| Territory owned/missing | PG `media_assets` + `media_track_links` | Generalize decade runner |
| Missions | Audit JSON top100 | None for 1970s |
| Campaign % | Audit dimension averages | None for 1970s |
| Discoveries | — | **New feed** |
| World map | Sum of territory snapshots | Run all decades |
| Studio ↔ Stage | SN state, event control, git, Vercel meta | Expose deployed commit publicly or via ops API |
| Exhibit pages | Existing track/album/artist loaders | Add campaign mini-bars |

---

## Part 6 — Migration Plan

### 6.1 Strategy

**Build Atlas first. Hang Workshop on the back. Never migrate ops → rename.**

```
Phase A: Atlas shell (World Map + 1970s board + static audit JSON)
Phase B: Discoveries + Two Realities strip
Phase C: Generalize territory audits (all decades)
Phase D: Mission Deploy → absorb year workspace UX
Phase E: Workshop hub replaces ops directory
Phase F: Retire primary links to scattered ops routes
```

---

### 6.2 Experience mapping — what survives

These align with the ideal experience and **stay** (some relabeled):

| Current | Future home | Role |
|---------|-------------|------|
| `/` HomeDirectory | The Floor · Home | Public entry |
| `/search`, `/artist`, `/album`, `/track` | The Floor · Exhibits | Canonical discovery |
| `/rv`, `/charts` | The Floor · Years | Chronology discovery |
| `/sunday-nights`, `/live` | The Floor · Live Stage | Show |
| `run-1970s-performance-universe-audit.ts` | Atlas data pipeline | Territory snapshots |
| `/ops/year/[year]` (grid UX) | Mission Deploy within territory | Curator enrichment |
| `/ops/show-builder` | Workshop · Show Prep | Set building |
| `/ops/sunday-nights` | Workshop · Tonight | Live cockpit |
| `/ops/event-control` | Workshop · Event Desk | Homepage programming |
| `/ops/content-creator` | Workshop · Event Desk | Pass art |
| `/ops/passes`, `/ops/pass-registrations` | Workshop · Event Desk | Event ops |
| `/ops/review/covers`, backfill, corrections | Workshop · Illustrate | Covers campaign |
| `/ops/media-sync`, acquisition, year-match | Workshop · Shelf | Library health |
| `/ops/media-collections`, media-lab | Workshop · Archive | TV/Movies campaigns |
| `/internal/ops-pin` | Workshop gate | Unchanged |

---

### 6.3 What merges

| Sources | Target | Rationale |
|---------|--------|-----------|
| `/ops/sunday-nights` + `/ops/live` | Workshop · Tonight (single cockpit) | Same state store |
| `/ops/year/{y}` + `/ops/rvtags-review/{y}` + `/ops/year/{y}/sorting` | Territory → Mission Deploy | One enrichment UX |
| `/ops/event-control` event mode + SN event toggle | Workshop · Tonight + Two Realities | One programming truth |
| `/ops/creative-lab` + `/ops/content-creator` | Workshop · Event Desk | One credential path |
| `/ops/media-lab` + midnight-special review | Workshop · Archive | One TV browser |
| `/ops#year-match` + `/ops/acquisition` | Workshop · Shelf (two steps, one workflow) | Same reconciliation model |
| Phase 2 territory board + year workspace data | Atlas · Territory Overview | Game layer over same RVTR rows |

---

### 6.4 What becomes secondary

Accessible from Workshop modes or campaign tabs — **not atlas rail, not home footer prominence:**

| Route | Access path |
|-------|-------------|
| `/ops/covers/embed` | Illustrate → Review (popup) |
| `/ops/healing` | Surgery door (rare) |
| `/ops/crossroads` | Archive or Show Prep insight link |
| `/ops/crate-builder` | Show Prep → experimental |
| `/ops/content-creator/debug/*` | Engineering only |
| CLI scripts (`cover:*`, `healing:*`) | Beside Workshop steps |
| Audit JSON downloads | Workshop · Shelf → advanced |

---

### 6.5 What disappears from primary navigation

| Item | Action |
|------|--------|
| `/ops` feature directory (37 cards) | Replace with Workshop mode doors |
| `/ops/hub`, `/infrastructure`, `/recovery`, `/rvbr`, `/continuity`, `/integrity` | **Delete cards** (broken) |
| `/ops/live` standalone | Merge → Tonight |
| `/ops/covers`, `/ops/covers/train` redirects | Keep redirect, remove links |
| `/ops/content-creator/*` redirect chain | Keep redirect, remove links |
| `/control-center` | Dev-only; never linked from Atlas |
| "Archive Ops" footer on home | Replace with "Workshop" wax seal (curator) |
| Ops language in public nav | Remove |

---

### 6.6 Route map (ideal state)

| Experience path | URL (implementation detail) |
|-----------------|-------------------------------|
| World Map | `/atlas` |
| Territory board | `/atlas/1970s` |
| Year region | `/atlas/1970s/1976` |
| Mission deploy | `/atlas/1970s/mission/RVTR097615` |
| Workshop hub | `/workshop` (gated; `/ops` redirects here) |
| Tonight | `/workshop/tonight` |
| Public exhibit | `/track/{rvtr}` (unchanged) |

Public URLs stable for SEO. Atlas/workshop paths new.

---

### 6.7 Migration phases (sequenced)

| Phase | Deliverable | Ops impact |
|-------|-------------|------------|
| **A** | `/atlas/1970s` static board from audit JSON | None — additive |
| **B** | World Map + atlas rail in app shell | Home gets "Your Atlas" link (curator) |
| **C** | Discoveries feed + mission deploy links to existing year workspace | Year workspace reachable from mission card |
| **D** | Generalize audit runner → all six territories | Shelf workflow unchanged |
| **E** | Two Realities strip | Replaces reality-dashboard mockup concept |
| **F** | Workshop hub; `/ops` → redirect; directory cards removed | Primary ops entry moves |
| **G** | Merge live + SN; merge year workspace tabs | Route deprecations with redirects |
| **H** | Public territory teasers (optional) | Event-mode programming |

**Do not block Atlas on Workshop cleanup.** Atlas ships with read-only audit data first.

---

### 6.8 Operator workflow → experience mapping

| Real workflow (ops audit) | Atlas surface | Workshop backend |
|---------------------------|---------------|------------------|
| Live show | Sunday Nights rail + Stage in Two Realities | Tonight |
| Library health | Territory Missing count → Shelf missions | Shelf |
| Show prep | Territory missions + Show Prep missions | Show Prep |
| Graph enrichment | Campaign bars + Mission Deploy | Illustrate |
| Event marketing | Stage program line | Event Desk |
| TV archive | TV/Movies campaign (0% today) | Archive |

---

## Part 7 — Success criteria

### Experience test

| Stimulus | Pass |
|----------|------|
| 5-second glance at World Map | Reads as atlas / game board |
| 5-second glance at 1970s board | Four questions answered without scroll |
| First-time visitor (public) | Museum + discovery, not admin |
| Curator on show night | Next Move + Studio/Stage obvious |

### Anti-patterns (fail)

- Sidebar labeled "Ops"
- Table above the fold on territory board
- More than one orange primary CTA
- "Console," "Dashboard," "Workspace" in hero copy
- Gray metric cards
- Sync status showing Postgres/JSON jargon

---

## Part 8 — Artifact index

| File | Role |
|------|------|
| `reports/retroverse-experience-blueprint.md` | This document |
| `reports/1970s-territory-game-design.md` | Territory board detail spec |
| `reports/1970s-territory-game-mockup.png` | Territory visual reference |
| `reports/1970s-performance-universe-audit.json` | Live 1970s data model |
| `reports/ops-workflow-audit.md` | Workshop workflow source |
| `reports/ops-architecture-audit.md` | Migration inventory |
| `reports/reality-dashboard-feasibility.md` | Two Realities field spec |

---

## Appendix A — 1970's territory reference card

| Field | Value |
|-------|------:|
| Songs Owned | 581 |
| Songs Missing | 779 |
| Coverage (shelf identity) | 43% |
| Exhibit depth (seal) | 65% |
| What I Know | 309 complete · 272 partial |
| Covers | 85% |
| Albums | 77% |
| Commentary | 0% |
| TV / Movies | 0% |
| Active mission | Conquer Rhiannon (37 plays, 25%) |
| Next move | Deploy → Rhiannon · RVTR097615 |

---

## Appendix B — Glossary (curator-facing)

| Term | Meaning |
|------|---------|
| **Territory** | A decade campaign (your VIDEO folder wing) |
| **Owned** | Song file linked to canonical RVTR |
| **Missing** | Song file on shelf, no identity yet |
| **Exhibit depth** | How complete the museum placard is |
| **Campaign** | One enrichment track (Covers, etc.) |
| **Mission** | A specific song worth deploying to next |
| **Discovery** | Something you recently learned or fixed |
| **Studio** | Your desk — local work in progress |
| **Stage** | What visitors see on retroverse.live |
| **Workshop** | Backstage tools (PIN gated) |

---

*Blueprint complete. Implementation starts at Phase A: static `/atlas/1970s` from audit JSON.*
