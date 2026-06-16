# Retroverse Ops Architecture Audit

**Date:** 2026-06-15  
**Scope:** `app/ops`, `app/internal`, `app/api/ops` (+ Sunday Nights public surfaces that ops depends on)  
**Method:** Read-only code inspection, `lib/ops/operations-directory.ts`, git last-touch dates, existing reports. No runtime smoke against production ops (gated).  
**Rule:** Evidence over opinions — status labels below cite file paths and observable behavior.

---

## Executive summary

Retroverse Ops is **functionally broad but structurally dishonest**:

1. **37 real page routes** exist under `app/ops/`, plus **1 internal gate** (`/internal/ops-pin`) and **~110 API routes** under `app/api/ops/`.
2. **`lib/ops/operations-directory.ts` lists 6 routes that have no `page.tsx`** (`/ops/hub`, `/ops/infrastructure`, `/ops/recovery`, `/ops/rvbr`, `/ops/continuity`, `/ops/integrity`) and **1 anchor that does not exist** (`/ops/live#certification`).
3. **Sunday Nights** was consolidated to a single state store (`setLiveTrack` / `sunday_nights_state` key `live`) per `reports/live-integration/live-consolidation-plan.md`, but **ops UI still presents 4+ entry points** (Sunday Nights admin, Event Command Center label, Bridge Health page, Event Control, homepage event mode).
4. **Year Workspace** pilot (1967/1978/1992) is **ACTIVE** for video-universe review; a large **Producer timeline UI is implemented but never mounted** (`YearWorkspaceProducerView.tsx` — no imports outside its own file).
5. **Cover pipeline** is the clearest enrichment workflow (Review → Backfill → Fix); **Healing** overlaps graph recovery but is gated/experimental and stale (last page touch 2026-05-26).
6. **Content Creator** is the current credential path; **Creative Lab** is a parallel style/project system (audit in `reports/creative-lab/workstation-consolidation-audit.md`); **Content Creator debug/** is explicitly non-production.

**Before any visual redesign:** fix the directory (remove or implement ghost routes), collapse Sunday Nights ops to one screen, and decide Year Workspace vs RV Tags vs Sorting Board overlap.

---

## Phase 1 — Route inventory

### Gate & auth

| URL | Title | Primary purpose | Last known usage | Component / handler | Data sources | Status | Rec |
|-----|-------|-----------------|------------------|---------------------|--------------|--------|-----|
| `/internal/ops-pin` | (client) | Ops PIN cookie gate | Active gate | `app/internal/ops-pin/page.tsx`, `ops-pin-client.tsx` | `POST /api/internal/ops-auth` | **ACTIVE** | KEEP |
| `/api/internal/ops-auth` | — | Set `retroverse_ops_gate` cookie | Active gate | `app/api/internal/ops-auth/route.ts` | `RETROVERSE_OPS_PIN` | **ACTIVE** | KEEP |

Ops pages require `RETROVERSE_OPS=1` (middleware). Sunday Nights family uses `isOpsEnabled()` → `notFound()` when off.

---

### `app/ops` — all pages

| URL | Title | Primary purpose | Last git touch | Component | Data sources | Status | Rec |
|-----|-------|-----------------|----------------|-----------|--------------|--------|-----|
| `/ops` | Ops Console | Landing: directory + year-match board | 2026-06-07 | `OpsDirectory`, `OpsBoard` | `loadOpsConsoleData()` (PG year-match 1967), `loadSundayNightsState()` | **ACTIVE** | KEEP |
| `/ops/sunday-nights` | Sunday Nights | Go live, match RVTR, event mode, playlist prep | 2026-06-07 | `SundayNightsAdmin` | `/api/ops/sunday-nights`, match, system | **ACTIVE** | KEEP |
| `/ops/live` | Bridge Health | Read-only bridge health + live track | 2026-06-11 | `LiveNowPlayingOps` | `loadSundayNightsState`, bridge manifest, poll `/api/sunday-nights/current` | **PARTIAL** | MERGE → sunday-nights |
| `/ops/event-control` | Event Control | Homepage magazine config | 2026-06-13 | `EventControlWorkspace` | `loadEventControlConfig`, `/api/ops/event-control` | **ACTIVE** | KEEP |
| `/ops/passes` | Pass Generator | Print numbered VIP passes | (with SN stack) | `PassGenerator` | `POST /api/ops/passes` | **ACTIVE** | KEEP |
| `/ops/pass-registrations` | Pass Registrations | Door pass sign-ups | 2026-06-14 | `PassRegistrationsBoard` | Postgres `collector_pass_registrations`, `/api/ops/pass-registrations` | **ACTIVE** | KEEP |
| `/ops/year/[year]` | Review Universe · {year} | Video-universe classify/tag for event years | 2026-06-07 | `OpsYearWorkspace` | `/api/ops/year-workspace`, PG + VDJ paths | **ACTIVE** (pilot 1967/78/92) | KEEP (merge tooling) |
| `/ops/year/[year]/sorting` | Sorting Board | Temporary tag-discovery board | 2026-06-07 | `SortingBoard` | `/api/ops/sorting-board`, rvtags video API | **PARTIAL** — labeled temporary | MERGE or ARCHIVE |
| `/ops/rvtags-review/[year]` | RV Tags {year} | Approve Retroverse Tags before VDJ write | 2026-05-29 | `OpsRvTagsReview` | `/api/ops/rvtags-review` | **ACTIVE** | MERGE with year workspace |
| `/ops/show-builder` | Set Builder | MyList → sets → `.vdjplaylist` | 2026-06-07 | `ShowBuilderWorkspace` | `/api/ops/show-builder`, VDJ folders | **ACTIVE** | KEEP |
| `/ops/crate-builder` | Crate Builder | AI pile experiment for MyLists | 2026-06-07 | `CrateBuilderShell` | `/api/ops/crate-builder` | **PARTIAL** — "Experiment B" | ARCHIVE or DELETE |
| `/ops/crossroads` | Crossroads | Multi-year artist bridge discovery | 2026-06-03 | `CrossroadsWorkspace` | `/api/ops/crossroads`, PG | **PARTIAL** — overlaps year/cross-year views | ARCHIVE |
| `/ops/acquisition` | Acquisition Export | Missing media / YouTube export lists | 2026-05-29 | `OpsAcquisitionBoard` | `loadAcquisitionConsoleData()` (Hot 100 1967) | **ACTIVE** | KEEP |
| `/ops/media-sync` | Media Sync | VDJ VIDEO ↔ R2 reconciliation | 2026-05-29 | `OpsMediaSyncBoard` | `loadMediaSyncConsoleData()` | **ACTIVE** | KEEP |
| `/ops/media-collections` | Media Collections | TV/concert acquisition index | 2026-06-08 | `OpsMediaCollections` | `RETROVERSE_DATA` collection manifests | **ACTIVE** | KEEP |
| `/ops/media-collections/[collection]` | Collection Detail | Per-collection scan/download | 2026-06-08 | `OpsMediaCollectionDetail` | collection state on disk | **ACTIVE** (MS only real) | KEEP |
| `/ops/media-collections/midnight-special/review` | Midnight Special Review | Episode performance review POC | 2026-06-08 | `OpsMidnightSpecialReview` | midnight-special APIs | **PARTIAL** — hardcoded POC episode | MERGE → Media Lab |
| `/ops/media-collections/top-of-the-pops` | (directory only) | TOTP acquisition | — | **No seed collection** — `top_of_the_pops` not in `seed.ts` | — | **BROKEN** — 404 | DELETE from directory |
| `/ops/review/covers` | Cover Review | Human QA integrity + acquire batches | 2026-05-31 | `OpsCoverReviewTabs` | CSV batches, decisions files | **ACTIVE** | KEEP |
| `/ops/covers/backfill` | Cover Backfill | Batch automated cover fill | 2026-06-01 | `OpsCoverBackfillDashboard` | `/api/ops/covers/backfill/*` | **ACTIVE** | KEEP |
| `/ops/covers/corrections` | Cover Fixes | Operator promote repairs | (corrections) | `OpsCoverReviewWorkbench` | repair CSV, hash index | **ACTIVE** | KEEP |
| `/ops/covers/embed` | Discogs Embed | iframe helper for cover workflow | (utility) | inline page | `?url=` Discogs | **ACTIVE** utility | ARCHIVE (support only) |
| `/ops/covers` | — | Redirect | — | → `/ops/review/covers` | — | **DUPLICATE** | ARCHIVE |
| `/ops/covers/train` | — | Redirect | — | → `/ops/review/covers` | — | **DUPLICATE** | ARCHIVE |
| `/ops/media-lab` | Media Lab | Editorial clip / harvest / performances | 2026-06-08 | `MediaLabWorkspace` | extensive `/api/ops/media-lab/*` | **ACTIVE** | KEEP |
| `/ops/media-lab/performances` | — | Redirect | 2026-06-08 | → unified media-lab URL | — | **DUPLICATE** | DELETE (keep redirect) |
| `/ops/content-creator` | Collectible Library | Primary creator home / generations | 2026-06-10 | `MyGenerationsWorkspace` | library + jobs APIs, RVBR profiles | **ACTIVE** | KEEP |
| `/ops/content-creator/create` | New Credential | VNext generate/edit/export | 2026-06-10 | `VNextWorkspace` | vnext + jobs APIs | **ACTIVE** | KEEP |
| `/ops/content-creator/generations` | — | Redirect | 2026-06-10 | → `/ops/content-creator` | — | **DUPLICATE** | ARCHIVE |
| `/ops/content-creator/classic` | — | Redirect | 2026-06-10 | → debug/classic | — | **DUPLICATE** | ARCHIVE |
| `/ops/content-creator/v2-poc` | — | Redirect | 2026-06-10 | → debug/v2-poc | — | **DUPLICATE** | ARCHIVE |
| `/ops/content-creator/rvbr-validation` | — | Redirect | 2026-06-10 | → debug/rvbr-validation | — | **DUPLICATE** | ARCHIVE |
| `/ops/content-creator/debug` | Content Creator Debug | Dev link index | 2026-06-10 | inline links | — | **ACTIVE** dev-only | ARCHIVE |
| `/ops/content-creator/debug/classic` | Classic (Debug) | Superseded workspace | 2026-06-10 | `ContentCreatorWorkspace` | creative-lab + RVBR | **ABANDONED** | ARCHIVE |
| `/ops/content-creator/debug/v2-poc` | v2 POC (Debug) | Artwork experiments | 2026-06-10 | `V2PocWorkspace` | v2-poc API | **ABANDONED** | ARCHIVE |
| `/ops/content-creator/debug/rvbr-validation` | RVBR Validation (Debug) | Prompt validation runs | 2026-06-10 | `RvbrValidationWorkspace` | rvbr-validation API | **PARTIAL** debug | ARCHIVE |
| `/ops/creative-lab` | Creative Lab | Style system + desk + advanced workshop | 2026-06-10 | `CreativeLabWorkspace` | `/api/ops/creative-lab/*` | **PARTIAL** — dual mental models | MERGE with Content Creator |
| `/ops/healing` | Healing Console | Album link recovery / continuity | 2026-05-26 | `OpsHealingPanel` | healing loaders, apply gated | **PARTIAL** — writes off by default | RARE / ARCHIVE |

---

### Directory-listed routes with **no page** (broken inventory)

| URL | Listed in | Evidence | Status | Rec |
|-----|-----------|----------|--------|-----|
| `/ops/hub` | `operations-directory.ts`, quick links | No `app/ops/hub/` | **BROKEN** | DELETE card or REPLACE with `/ops` |
| `/ops/infrastructure` | directory | No page | **BROKEN** | DELETE or build |
| `/ops/recovery` | directory ("Recovery Operations") | No page; healing is separate | **BROKEN** | REPLACE → healing or new dashboard |
| `/ops/rvbr` | directory | RVBR is `lib/ops/rvbr/*` only; embedded in Content Creator | **BROKEN** | DELETE card or REPLACE → content-creator |
| `/ops/continuity` | directory | `loadPublicContinuityReport` used inside `/ops/healing` only | **BROKEN** | MERGE → healing or integrity hub |
| `/ops/integrity` | directory | No page | **BROKEN** | DELETE or build |
| `/ops/live#certification` | directory ("Playlist Certification") | No `#certification` in `LiveNowPlayingOps`; certification lives in `SundayNightsSystemPanel` on sunday-nights | **BROKEN** anchor | MERGE → sunday-nights |

---

### Duplicate / overlapping routes

| Routes | Overlap evidence | Rec |
|--------|------------------|-----|
| `/ops/sunday-nights` + `/ops/live` | Same `sunday_nights_state`; live page read-only subset | MERGE |
| `/ops/event-control` + Sunday Nights **event mode** toggle | Event mode in `SundayNightsAdmin`; homepage hero in Event Control — related but split | MERGE UX (keep both data keys) |
| `/ops/year/{y}` + `/ops/rvtags-review/{y}` + `/ops/year/{y}/sorting` | All patch per-track review state; tags vocabulary shared | MERGE |
| `/ops/review/covers` + `/ops/covers/corrections` | Review vs operator apply tiers | KEEP both, clarify roles |
| `/ops/covers` + `/ops/covers/train` | Redirects to review | ARCHIVE URLs only |
| `/ops/content-creator` + `/ops/creative-lab` | Both generate passes; Creative Lab audit documents duplication | MERGE long-term |
| `/ops/media-lab` + `/ops/media-collections/midnight-special/review` | Same midnight-special APIs; Media Lab has unified browser | MERGE |
| `/live` + `/sunday-nights` (public) | Same API per consolidation plan | KEEP `/sunday-nights`; `/live` is alias surface |
| `/ops` year-match anchor + `/ops/acquisition` | Both Hot 100 ↔ VDJ reconciliation | KEEP; acquisition is export-focused |

---

### `app/api/ops` — route groups (110 handlers)

Grouped by domain for inventory (all require ops cookie via middleware):

| Domain | Example routes | Purpose |
|--------|----------------|---------|
| **Sunday Nights** | `sunday-nights`, `match`, `search`, `system` | Live state, playlist, deploy/validate |
| **Event** | `event-control`, `passes`, `pass-registrations` | Homepage config, passes |
| **Year / curation** | `year-workspace`, `year-match`, `sorting-board`, `rvtags-review`, `show-builder`, `crate-builder`, `crossroads`, `vdj-search` | Reconciliation & show prep |
| **Covers** | `review/covers/*`, `covers/backfill/*`, `covers/train/*`, `covers/rv12/*`, `covers/thumbnail` | Cover QA, backfill, RV12 |
| **Media** | `media-sync`, `acquisition`, `media-collections/*`, `media-lab/*` | Sync, collections, editorial |
| **Content** | `content-creator/*`, `creative-lab/*` | Credentials & styles |
| **Healing** | `healing/review`, `apply`, `rollback` | Graph restoration |
| **Misc** | `candidates`, `match` | Shared matching helpers |

No API routes were found **without** a backing lib implementation; orphan risk is **UI routes pointing nowhere**, not dead APIs.

---

## Phase 2 — Operations Hub audit (`/ops`)

Source: `lib/ops/operations-directory.ts` cards + `app/ops/page.tsx` embedded **Year Match Console** (`#year-match`).

| Card | Route | Works? | Used? | Unique value? | Duplicated? | Recommendation |
|------|-------|--------|-------|---------------|-------------|----------------|
| Operations Hub | `/ops/hub` | **No** (404) | No | — | Duplicates `/ops` intent | **DELETE** card; use `/ops` |
| Library Atlas | `/ops/infrastructure` | **No** | No | — | — | **DELETE** or build |
| Recovery Operations | `/ops/recovery` | **No** | No | — | Overlaps `/ops/healing` | **REPLACE** link → healing |
| Sunday Nights | `/ops/sunday-nights` | Yes | **Yes** — live show 2026-06-15 | Primary live control | — | **KEEP** |
| Event Control | `/ops/event-control` | Yes | Yes — homepage | Homepage story | Event mode on SN admin | **KEEP** |
| Event Command Center | `/ops/live` | Yes | Partial | Bridge health only | Mislabeled; not a command center | **MERGE** into SN admin |
| Playlist Certification | `/ops/live#certification` | **No** anchor | — | Cert in `SundayNightsSystemPanel` | Wrong link | **MERGE** → `/ops/sunday-nights` |
| Pass Generator | `/ops/passes` | Yes | Event use | Print passes | — | **KEEP** |
| Pass Registrations | `/ops/pass-registrations` | Yes | Recent (2026-06-14) | Postgres registrations | — | **KEEP** |
| Year Match Console | `/ops#year-match` | Yes | Focus year 1967 | Chart ↔ VDJ table on hub | `/ops/acquisition` | **KEEP** on hub |
| Year Workspace 1967/78/92 | `/ops/year/{y}` | Yes | Pilot tooling | Video universe review | RV Tags, Sorting | **KEEP**; merge satellites |
| Acquisition | `/ops/acquisition` | Yes | Active pipeline | Export lists | Year match | **KEEP** |
| Media Sync | `/ops/media-sync` | Yes | Active | VDJ↔R2 | — | **KEEP** |
| Media Collections | `/ops/media-collections` | Yes | MS acquiring | Collection control | Media Lab library | **KEEP** |
| Top of the Pops | `/ops/media-collections/top-of-the-pops` | **No** (404) | No | — | TOTP `enabled: false` in Media Lab | **DELETE** card |
| Cover Review / Backfill / Fix | respective routes | Yes | Active scripts + ops | Cover pipeline | — | **KEEP** |
| RV Tags Review | `/ops/rvtags-review/1967` | Yes | Pilot | Tag approval | Year workspace | **MERGE** |
| Set Builder | `/ops/show-builder` | Yes | Show prep | VDJ export | — | **KEEP** |
| Crate Builder | `/ops/crate-builder` | Yes | Experimental | AI piles | Set builder | **ARCHIVE** |
| Sorting Board | `/ops/year/1967/sorting` | Yes | Temporary | Tag discovery | Year workspace | **ARCHIVE** after merge |
| Media Lab | `/ops/media-lab` | Yes | MS / harvest | Editorial video | MS review route | **KEEP** |
| Content Creator | `/ops/content-creator` | Yes | Active dev | Credentials | Creative Lab | **KEEP** |
| Content Creator Debug | `/ops/content-creator/debug` | Yes | Dev only | — | — | **ARCHIVE** |
| Creative Lab | `/ops/creative-lab` | Yes | Partial | Styles/projects | Content Creator | **MERGE** |
| RVBR | `/ops/rvbr` | **No** page | RVBR in lib | Era profiles | In Content Creator | **DELETE** card |
| Crossroads | `/ops/crossroads` | Yes | Low | Multi-year artists | Year workspace | **ARCHIVE** |
| Healing | `/ops/healing` | Yes | Rare | Graph restore | "Recovery" card | **RARE** |
| Covers legacy redirects | `/ops/covers`, `/train` | Redirect | — | URL compat | — | **ARCHIVE** |
| Discogs Embed | `/ops/covers/embed` | Yes | Support | iframe | — | **ARCHIVE** |
| Continuity Audit | `/ops/continuity` | **No** | Data in healing | — | Healing panel | **DELETE** card |
| Graph Integrity | `/ops/integrity` | **No** | — | — | — | **DELETE** or build |

---

## Phase 3 — Year Workspace audit (1967 / 1978 / 1992)

### What exists

| Capability | Evidence | 1967 | 1978 | 1992 |
|------------|----------|------|------|------|
| Review Universe grid | `OpsYearWorkspace` + `/api/ops/year-workspace` | Pilot banner + full UI | Pilot | Pilot |
| Performance class (Fill/Cocktail/Dance/Slow) | `saveClass` in `OpsYearWorkspace.tsx` | Yes | Yes | Yes |
| Retroverse Tags (historical) | `REVIEW_UNIVERSE_1967_TAG_IDS` used for all years in UI | Curated vocab | Uses 1967 vocab | Uses 1967 vocab |
| Video thumbs / play counts | `load-video-universe`, enrichment | Yes | Yes | Yes |
| Sorting board link | `review-pilot.ts` | Link | Link | Link |
| Producer timeline / era segments | `YearWorkspaceProducerView.tsx` (~1000+ LOC) | **Not mounted** | **Not mounted** | **Not mounted** |
| Curated recommendations | `recommendations/providers/1967` only | Rich static lists | **No provider** | **No provider** |
| Show-builder cultural vectors | `cultural-association-{year}.ts` | Yes | Yes | Yes |
| Cross-year navigation | page header links | Yes | Yes | Yes |

### What is missing

- **1978 / 1992 curated recommendation providers** (only 1967 package in `providers/index.ts`).
- **Producer view** never wired — planning/timeline work is dead code.
- **Single-year focus on ops hub** (`OPS_FOCUS_YEAR = 1967`) while three workspaces are promoted equally.
- **RV Tags + Sorting Board** as separate routes instead of tabs on year workspace.

### Usage evidence

- Git cluster **2026-06-07** on year workspace, sorting, sunday-nights, show-builder (event prep sprint).
- `tools/year-review/*` and `tools/producer/test-timeline-migration.ts` indicate offline/CLI usage, not daily UI for producer.
- Operating board (`docs/RETROVERSE_OPERATING_BOARD.md`) does **not** list year workspace as production-critical; ops console **not on production main** historically.

### Recommendation

| Item | Verdict |
|------|---------|
| `/ops/year/1967` | **KEEP** — primary pilot |
| `/ops/year/1978`, `/ops/year/1992` | **KEEP** as year-param shells; same codepath |
| `/ops/year/*/sorting` | **MERGE** into year workspace tab → then **ARCHIVE** route |
| `/ops/rvtags-review/*` | **MERGE** into year workspace tab |
| `YearWorkspaceProducerView` | **ARCHIVE** code (or **REPLACE** year workspace primary view if timeline is still desired) |
| Three separate directory cards | **MERGE** → one "Year Workspace" entry with year selector |

---

## Phase 4 — Sunday Nights consolidation map

### Surfaces

```
                    ┌─────────────────────────────────────┐
                    │     sunday_nights_state (PG)        │
                    │  keys: live, eventMode, (+aliases)  │
                    └─────────────────────────────────────┘
                          ▲                    ▲
          PATCH setTrack  │                    │ setEventMode
                          │                    │
    ┌─────────────────────┴───┐    ┌───────────┴────────────┐
    │ /ops/sunday-nights      │    │ /ops/event-control      │
    │ SundayNightsAdmin       │    │ homepage hero/years     │
    │ - go live / clear       │    │ (public homepage)       │
    │ - event mode toggle     │    └────────────────────────┘
    │ - playlist match        │
    │ - SundayNightsSystemPanel│
    │   (validate/deploy)     │
    └───────────┬─────────────┘
                │ read-only duplicate
    ┌───────────▼─────────────┐
    │ /ops/live               │
    │ Bridge Health           │
    └─────────────────────────┘

    POST /api/sunday-nights/bridge ← tools/live-bridge (VDJ)

    Public read:
    GET /api/sunday-nights/current
    ├─ /sunday-nights (SundayNightsView + register form)
    ├─ /live (alias view)
    └─ homepage redirect if eventMode on
```

### Required (minimum ops screens)

| Function | Required? | Canonical surface today |
|----------|-----------|-------------------------|
| Go live / clear track | **Yes** | `/ops/sunday-nights` |
| Event mode (homepage redirect) | **Yes** | `/ops/sunday-nights` (duplicate concern with event-control) |
| Playlist RVTR match | **Yes** | `/ops/sunday-nights` |
| Pre-show validate / deploy | **Yes** | `SundayNightsSystemPanel` on sunday-nights |
| Bridge health | **Yes** | `/ops/live` (should be panel on sunday-nights) |
| Homepage magazine | **Yes** | `/ops/event-control` |
| Pass print | **Yes** | `/ops/passes` |
| Pass registrations | **Yes** | `/ops/pass-registrations` |
| Public now playing | **Yes** | `/sunday-nights` (not ops) |

### Duplicated (remove from ops IA)

- `/ops/live` as separate "Event Command Center" — **mislabeled**; metadata title is "Bridge Health".
- Directory entry **Playlist Certification** → wrong URL.
- Public `/live` vs `/sunday-nights` — keep one primary public URL (`/sunday-nights`).

### Proposed consolidation (fewest screens)

1. **`/ops/sunday-nights`** — single ops screen: playlist, live, event mode, bridge health, system/certification.
2. **`/ops/event-control`** — homepage/editorial only (no live state).
3. **`/ops/passes`** + **`/ops/pass-registrations`** — keep as two (print vs data).

**Target: 3 ops routes** (+ public `/sunday-nights`).

---

## Phase 5 — Content / Media audit

| Tool | Current state | Usage evidence | Overlap | Recommendation |
|------|---------------|----------------|---------|----------------|
| **Content Creator** (`/`, `/create`) | Active; library + VNext pipeline | Git 2026-06-10+; job queue report | Creative Lab, RVBR lib | **KEEP** as primary |
| **Creative Lab** | Dual desk + advanced workshop | Consolidation audit 2026-06-10 | Content Creator, classic debug | **MERGE** into Content Creator or **ARCHIVE** advanced panels |
| **Media Lab** | Unified workspace; performances redirect | Git 2026-06-08; editorial restoration reports | MS review page, media-collections | **KEEP** |
| **RVBR** | `lib/ops/rvbr/*` — no viewer route | Seeded for Content Creator | Directory card broken | **DELETE** route card; keep lib |
| **Crossroads** | Functional multi-year artist view | Last touch 2026-06-03; in `OPS_LIKELY_ABANDONED_ROUTES` | Year workspace | **ARCHIVE** |
| **Sorting Board** | Temporary tag board | Explicit "temporary" in UI | Year workspace, RV Tags | **ARCHIVE** after merge |
| **Set Builder** | Active clustering + export | Show-builder reports | Crate builder (experiment) | **KEEP** |
| **Crate Builder** | "Experiment B" | Same date as set builder | Set builder | **ARCHIVE** |
| **RV Tags Review** | Active approval UI | Linked from ops directory | Year workspace tags | **MERGE** |

---

## Phase 6 — Data / Enrichment audit

### Tools vs workflow role

| Tool | Graph enrichment | Cover acquisition | Media reconciliation |
|------|------------------|-------------------|----------------------|
| **Year Match** (`/ops#year-match`) | Indirect (chart↔track linkage) | — | **Primary** VDJ↔chart |
| **Year Workspace** | Tags + classification on RVTR | — | Video universe ownership |
| **Acquisition** | — | — | Missing file export |
| **Media Sync** | — | — | **Primary** VDJ↔R2 inventory |
| **Cover Review** | Cover truth on RVAL | **Primary** human QA | — |
| **Cover Backfill** | Fills missing covers | **Primary** automated | — |
| **Cover Fix** | Applies promoted fixes | **Primary** apply step | — |
| **Healing** | **Primary** album-link recovery | Cover continuity signals | — |
| **Recovery Ops** (directory) | — | — | **Does not exist** |
| **Graph Integrity** (directory) | — | — | **Does not exist** |
| **Media Collections** | Episode→performance graph (MS) | — | Archive acquisition |
| **RV Tags Review** | Canonical tag enrichment | — | — |

### Primary workflow (recommended)

```
Media reconciliation:  Media Sync → Year Match → Acquisition export
                              ↓
Graph enrichment:      Year Workspace (classify/tag/link)
                              ↓
Cover pipeline:        Backfill (auto) → Review (human) → Fix (apply)
                              ↓
Graph healing:         Healing (rare, gated) — not daily
```

CLI mirrors ops: `npm run cover:*`, `tools/run-cover-backfill.ts`, `tools/year-review/*`, `npm run healing:review`.

---

## Phase 7 — Classification & proposed Ops structure

### Daily / Weekly / Rare / Archive

| Bucket | Routes |
|--------|--------|
| **DAILY** | `/ops/sunday-nights` (incl. bridge), `/ops/event-control` (when promoting), `/ops/pass-registrations`, `/ops#year-match`, `/ops/media-sync` |
| **WEEKLY** | `/ops/year/{1967\|1978\|1992}`, `/ops/show-builder`, `/ops/review/covers`, `/ops/covers/backfill`, `/ops/acquisition`, `/ops/passes` |
| **RARE** | `/ops/covers/corrections`, `/ops/healing`, `/ops/media-collections`, `/ops/media-lab`, `/ops/content-creator` |
| **ARCHIVE** | `/ops/crate-builder`, `/ops/crossroads`, `/ops/year/*/sorting`, `/ops/content-creator/debug/*`, legacy cover redirects, `/ops/covers/embed`, `/ops/live` (after merge), broken directory targets |

### Proposed future structure (navigation only)

```
OPS
├── TODAY
│   ├── Sunday Nights (merged live + bridge + cert)
│   ├── Event Control (homepage)
│   └── Pass Registrations
├── SYSTEM HEALTH
│   ├── Year Match (hub embed)
│   ├── Media Sync
│   └── Bridge / deploy panel (inside Sunday Nights)
├── GRAPH ENRICHMENT
│   ├── Year Workspace (1967 · 1978 · 1992) [tabs: grid · tags · sorting]
│   ├── Acquisition
│   └── Healing (gated)
├── MEDIA LIBRARY
│   ├── Media Collections
│   ├── Media Lab
│   └── Set Builder
├── CONTENT CREATION
│   ├── Content Creator
│   └── Pass Generator
└── ARCHIVE
    ├── Creative Lab (until merged)
    ├── Crate Builder · Crossroads · Debug routes
    └── Legacy URL redirects
```

### Per-route disposition summary

| Disposition | Count | Examples |
|-------------|-------|----------|
| **KEEP** | ~18 | `/ops`, sunday-nights, event-control, passes, year workspace, show-builder, cover pipeline, media sync, acquisition, media-lab, media-collections, content-creator |
| **MERGE** | ~8 | live→sunday-nights, rvtags/sorting→year workspace, MS review→media-lab, creative-lab→content-creator, recovery/continuity→healing |
| **REPLACE** | 6 | hub, infrastructure, recovery, rvbr, continuity, integrity directory entries |
| **ARCHIVE** | ~12 | debug/*, crate-builder, crossroads, sorting, embed, healing (optional) |
| **DELETE** | ~3 | top-of-the-pops card, duplicate public `/live` (optional), producer view if abandoned |

---

## Appendix A — Public Sunday Nights routes (ops-adjacent)

| URL | Purpose | Status |
|-----|---------|--------|
| `/sunday-nights` | Landing + now playing + pass register | **ACTIVE** |
| `/live` | Now playing alias | **DUPLICATE** of SN |
| `/api/sunday-nights/current` | Public poll | **ACTIVE** |
| `/api/sunday-nights/bridge` | VDJ bridge write | **ACTIVE** |
| `/api/sunday-nights/register` | Pass registration | **ACTIVE** |
| `/api/live-now-playing` | Read alias | **ACTIVE** per consolidation plan |

---

## Appendix B — Evidence files

| Topic | Path |
|-------|------|
| Ops directory (cards + abandoned list) | `lib/ops/operations-directory.ts` |
| Live state consolidation | `reports/live-integration/live-consolidation-plan.md` |
| Creative Lab duplication | `reports/creative-lab/workstation-consolidation-audit.md` |
| Media collections seed (no TOTP) | `lib/ops/media-collections/seed.ts` |
| Producer view orphan | `components/ops/year-workspace/YearWorkspaceProducerView.tsx` (zero imports) |
| Pilot years | `lib/ops/year-workspace/review-pilot.ts` |
| Ops focus year | `lib/ops/ops-focus-year.ts` |
| Operating priorities | `docs/RETROVERSE_OPERATING_BOARD.md` |

---

## Appendix C — Immediate cleanup (no redesign required)

1. Remove or fix **6 broken directory cards** and **TOTP** entry.
2. Rename **Event Command Center** → **Bridge Health** or merge into Sunday Nights.
3. Point **Playlist Certification** to `/ops/sunday-nights` (system panel).
4. Add **year selector** instead of three workspace cards.
5. Do **not** invest in `/ops/hub` until scope is defined — `/ops` already is the hub.

*End of audit — no code was modified.*
