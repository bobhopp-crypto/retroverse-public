# Retroverse Consolidation 3.0 — Phase 1 Audit

**Generated:** 2026-06-29  
**Method:** Filesystem scan of `app/`, `data/`, `reports/`, `lib/`, link grep — no AI generation, no code changes.  
**Scope:** Audit only. No refactors, deletions, or redesign in this sprint.

---

## Executive Summary

Retroverse currently has **146 app routes**, **~190 `/api/ops` endpoints**, and **at least 4 distinct visual systems**. The codebase already contains the bones of Consolidation 3.0 (`/local`, Atlas Library, Script Launcher, System Map, site-mode gating) but they sit beside many legacy routes, duplicate homes, and parallel operator surfaces.

### Target architecture (from sprint brief)

| Product | Host | Should contain |
|---|---|---|
| **PUBLIC** | retroverse.live | Home, Search, Song, Artist, Album, Year, Live Experience |
| **LOCAL STUDIO** | localhost | Command Center, Atlas, Database Explorer, Script Launcher, Diagnostics |

### Counts today

| Metric | Count |
|---|---|
| App routes (`page.tsx`) | 146 |
| Public-facing routes (incl. legacy) | ~35 |
| Command Center routes (`/ops/*` excl. atlas/studio) | ~75 |
| Studio pipeline routes (`/ops/studio/*`) | 24 |
| Atlas routes | 7 |
| Local/Diagnostics | 4 (`/local`, `/diagnostics`, `/control-center`, `/inspect`) |
| Routes flagged outside target tree | 2 (`/internal/ops-pin`, auth helpers) |
| Design: dark blue Command Center | ~40 routes |
| Design: generic ops.css (older) | ~67 routes |
| Design: Atlas cream/paper | 4 routes |
| Design: public editorial / RV2 | ~24 routes |

### Top consolidation actions (Phase 2+)

1. **One public home** — merge `/`, `/retroverse-2/live`, `/live`, `/index`.
2. **One operator entry** — `/local` → Command Center; fold `/control-center` into `/diagnostics`.
3. **One Atlas** — keep Library, Scripts, System Map; demote or merge curation world map + workshop.
4. **One Database Explorer** — promote `/inspect` (Graph Inspector) under Diagnostics; do not build a second explorer.
5. **Remove redirect-only legacy routes** after grace period (`/track`, `/charts`, content-creator debug POCs).
6. **Do not duplicate** — Atlas Library already replaces Collector library browsing; System Map replaces manual route hunting.

---

# 1. Duplicate Pages

| Page A | Page B | Verdict | Why |
|---|---|---|---|
| `/` (Retroverse Live) | `/retroverse-2/live` | **MERGE** | Same component (`LiveAttractTourPage`), same metadata title. Two public live homes. |
| `/` | `/index` | **MERGE** | `/index` re-exports `/page.tsx`. |
| `/live` | `/retroverse-2/live` | **MERGE** | Both “now playing” surfaces; `/live` marked legacy in source. |
| `/track/:id` | `/retroverse-2/song/:rvtr` | **MERGE** | Track route is legacy redirect to canonical Song Experience. |
| `/experience/:rvtr` | `/retroverse-2/song/:rvtr` | **KEEP both (for now)** | Patron museum vs RV2 song page serve different UX; converge later to one song surface. |
| `/charts` | `/retroverse-2/charts` | **MERGE** | `/charts` is legacy hub redirect into `/rv` chronology. |
| `/charts` | `/rv/:year` | **MERGE** | Year/chart discovery split across RV chronology and RV2 charts. |
| `/ops` Command Center | `/control-center` | **MERGE** | Both are operator launchpads. Control Center is dev-only (`/control-center`). Fold into Diagnostics or Command Center. |
| `/ops` | `/diagnostics` | **KEEP both** | Diagnostics is a thin launcher; Command Center is full hub. Merge Control Center **into** Diagnostics, not into `/ops` nav directly. |
| `/ops/studio` Mission Control | `/ops/browser-plus-2` | **MERGE** | Both are “studio operations center” with queue/rail overlap. |
| `/ops/studio/collector` | `/ops/atlas/library` | **MERGE** | Atlas Library is filesystem-first collector browser; Collector library is department UI duplicate. **KEEP Atlas Library** for browsing; **KEEP Collector** for editing only. |
| `/ops/intelligence` | `/ops/studio/collector` | **MERGE** | Research Center vs Collector department — same songs, different JSON era. Intelligence = legacy packages; Studio = current pipeline. |
| `/ops/atlas/library` | `/ops/studio/collector` | **KEEP Atlas / MERGE Collector view** | Atlas Library is the consolidation target for read-only browse. |
| `/ops/map` | `/ops/atlas/system` | **MERGE** | System Map supersedes Retroverse Map for architecture visibility. |
| `/ops/live-control` | `/ops/live` | **MERGE** | Live Control Center vs Bridge Health — same show-prep domain. |
| `/ops/live-control` | `/ops/event-control` | **KEEP both** | Event Control = homepage cover story; Live Control = show runtime. Related but not duplicate. |
| `/ops/content-creator/*` debug POCs | `/ops/content-creator` | **REMOVE** | Debug/v2-poc/classic routes are prototypes; main library page exists. |
| `/ops/allstar/*` (13 routes) | `/ops` hub | **KEEP satellite** | Separate product (baseball archive) — not music Retroverse core. Flag as **optional satellite** under Command Center, not part of 3.0 core. |
| `/ops/finance/*` (15 routes) | `/ops` | **KEEP satellite** | Personal finance ops — valid but outside music core. |
| `/retroverse-2/song/:rvtr/data` | `/ops/studio/*` | **REMOVE** | Song Control Center on public URL pattern — legacy redirect; operator tools belong in Studio/Atlas. |
| `/search` | home search overlay | **KEEP** | Single public search; overlay is component not duplicate page. |
| Command Center vs “Control Center” copy | Live Control, Event Control, Song Control Center | **UNKNOWN** | Naming collision only — rename in Phase 2, not separate products. |

---

# 2. Color Audit

Design systems found (from layout/CSS class scan):

| System | CSS / classes | Intended use |
|---|---|---|
| **New — dark blue Command Center** | `ops-command`, `ops-page ops-command`, `rs-studio-*` | Studio Mission Control, Atlas Library/Scripts/System, `/local`, Diagnostics |
| **Old — generic ops** | `ops-page` without `ops-command` | ~67 ops routes (finance, intelligence, live, content-creator, etc.) |
| **Old — Atlas cream/paper** | `atlas-root`, `atlas-app`, `atlas.css` | `/ops/atlas`, `/ops/atlas/1970s`, `/ops/atlas/workshop`, `/ops/atlas/mission/*` |
| **Old — VDJ Browser+** | `browser-plus-page`, `browser-plus.css` | `/ops/browser-plus` |
| **Public — RV2 / editorial** | `rv2-*`, cream mobile width, poster layouts | Public song, live, artist, search |
| **Legacy — RV chronology** | `RvPublicMasthead`, `rv-chronology` | `/rv/*`, older chart week surfaces |
| **Inspect — standalone** | `inspect-page`, `inspect.css` | `/inspect` Graph Inspector |

### Pages not using dark blue Command Center (sample — full ops set ~107 routes)

| Route | Purpose | Old/New | Recommendation |
|---|---|---|---|
| `/ops/atlas` | Curation world map | Old (Atlas cream) | Keep cream for “Performance Universe” **or** migrate to Atlas dark sub-brand in Phase 2 |
| `/ops/atlas/1970s` | 1970s territory board | Old (Atlas cream) | Same |
| `/ops/atlas/workshop` | Atlas workshop | Old (Atlas cream) | Same |
| `/ops/atlas/mission/:rvtr` | Mission card | Old (Atlas cream) | Same |
| `/ops/atlas/library` | Collected songs | **New (dark blue)** | **Permanent Atlas browse surface** |
| `/ops/atlas/scripts` | Script launcher | **New (dark blue)** | **Permanent** |
| `/ops/atlas/system` | System map | **New (dark blue)** | **Permanent** |
| `/ops/browser-plus` | VDJ library utility | Old (VDJ red/black) | **KEEP separate design** per `retroverse-ops-surfaces.mdc` — do not paint blue |
| `/ops/finance/*` | Finance ops | Old (generic ops) | Migrate to dark blue when touched |
| `/ops/intelligence/*` | Research Center | Old (generic ops) | Merge into Atlas/Studio; migrate styling |
| `/ops/content-creator/*` | Pass/poster tooling | Old (generic ops) | Satellite — migrate later |
| `/ops/allstar/*` | Baseball archive | Mixed | Satellite product |
| `/inspect` | Postgres graph explorer | Old (inspect.css) | Promote as Database Explorer; restyle to dark blue |
| `/control-center` | Dev launchpad | Old (generic ops) | Remove after merge to Diagnostics |
| `/`, `/retroverse-2/*`, `/artist/*`, `/search` | Public discovery | Public editorial | **Never** apply Command Center blue |
| `/experience/:rvtr` | Patron museum | Immersive patron | **Never** apply ops blue |

**Rule for 3.0:** Public = editorial cream/teal. Local Studio = dark blue. VDJ Browser+ = utility red/black. Atlas curation map = cream **or** unify under Atlas dark chrome (decision needed).

---

# 3. Navigation Audit

### Target tree (where everything should live)

```
PUBLIC (retroverse.live)
├── Home                    → /
├── Search                  → /search
├── Song                    → /retroverse-2/song/:rvtr  (+ /experience/:rvtr patron)
├── Artist                  → /artist/:slug/*
├── Album                   → /album/:id
├── Year                    → /rv/:year  (or unified /year/:year public)
└── Live Experience         → /retroverse-2/live, /live

LOCAL (localhost)
├── Local Studio Launcher   → /local
├── Command Center          → /ops
├── Atlas                   → /ops/atlas/*
├── Database Explorer       → /inspect  (promote; no separate route today)
├── Script Launcher         → /ops/atlas/scripts
└── Diagnostics             → /diagnostics (+ /control-center merge)

COMMAND CENTER (/ops hub — folds into Local Studio)
├── Studio / Mission Control → /ops/studio
├── Live / Shows             → /ops/live-control, /ops/sunday-nights, /ops/event-control
├── Library / Queue          → /ops/browser-plus-2, /ops/browser-plus
├── Research (legacy)        → /ops/intelligence  ⚠ merge into Atlas/Studio
├── Create                   → /ops/content-creator
├── Finance (satellite)      → /ops/finance/*
├── All-Star (satellite)     → /ops/allstar/*
└── Other tools (details)    → see §6

ATLAS (/ops/atlas)
├── Library (keep)           → /ops/atlas/library
├── Script Launcher (keep)   → /ops/atlas/scripts
├── System Map (keep)        → /ops/atlas/system
├── World / 1970s / Workshop → curation prototypes — review for merge/remove
└── Mission cards            → /ops/atlas/mission/:rvtr

DATABASE (no dedicated nav today)
└── Graph Inspector          → /inspect  (via Diagnostics)

DIAGNOSTICS
├── Diagnostics hub          → /diagnostics
├── Control Center (merge)   → /control-center
└── Graph Inspector          → /inspect
```

### Flagged — outside target categories (~40 routes)

| Route group | Issue | Recommendation |
|---|---|---|
| `/rv/*`, `/week/*` | Public year/chart chronology — overlaps “Year” | **KEEP** as public Year until unified year route |
| `/retroverse/experiences` | Experience gallery | **KEEP** public or merge into song discovery |
| `/ops/automation-factory`, `/ops/crate-builder`, `/ops/show-builder` | DJ/show tooling | Fold under Command Center “Run a Show” |
| `/ops/healing`, `/ops/crossroads`, `/ops/media-*` | Maintenance / media ops | Fold under Command Center “Keep Things Safe” or Atlas |
| `/ops/experience-director-pilot` | Ollama pilot | **REMOVE** after review or move to Diagnostics |
| `/ops/year/:year/*` | Review universe / sorting board | Fold under Atlas or Studio |
| `/internal/ops-pin` | Auth gate | **KEEP** infrastructure (not nav) |
| `/ops/studio/training`, `/ops/studio/experience-lab` | Training/pilot | Fold under Studio; not top-level 3.0 nav |
| 13× `/ops/allstar/*` | Separate domain | Satellite — exclude from core 3.0 nav |
| 15× `/ops/finance/*` | Personal finance | Satellite — exclude from core 3.0 nav |

---

# 4. Route Inventory

**Scan date:** 2026-06-29 · **Total routes:** 146  
**Linked?** = referenced from `app/` or `components/` href strings (grep). “Weak” = no direct link found.

| Route | Purpose | Zone | Modified | Linked | Duplicate | Recommendation |
|---|---|---|---|---|---|---|
| `/` | Retroverse Live (attract tour home) | PUBLIC | 2026-06-29 | Yes | Yes | **KEEP** — canonical public home |
| `/search` | Public search | PUBLIC | 2026-06-25 | Yes | No | **KEEP** |
| `/retroverse-2/live` | Retroverse Live | PUBLIC | 2026-06-28 | Yes | Yes | **MERGE → /** |
| `/retroverse-2/song/:rvtr` | Canonical song page | PUBLIC | 2026-06-28 | Yes | No | **KEEP** |
| `/retroverse-2/charts` | Charts | PUBLIC | 2026-06-28 | Yes | No | **KEEP** |
| `/experience/:rvtr` | Patron museum experience | PUBLIC | 2026-06-28 | Weak | No | **KEEP** |
| `/artist/:slug` (+ 7 subroutes) | Artist discovery | PUBLIC | 2026-05–06 | Yes | Partial | **KEEP** |
| `/album/:id` | Album page | PUBLIC | 2026-06-29 | Weak | No | **KEEP** |
| `/rv/:year` (+ month/week) | Year chronology | PUBLIC legacy | 2026-06-29 | Yes | Partial | **KEEP** until public Year unified |
| `/week/:date` | Chart week | PUBLIC legacy | 2026-06-28 | Weak | No | **MERGE → /rv/** |
| `/track/:id` | Legacy → song | PUBLIC legacy | 2026-06-29 | Weak | Yes | **REMOVE** (redirect exists) |
| `/charts` | Legacy chart hub | PUBLIC legacy | 2026-06-28 | Weak | Yes | **REMOVE** |
| `/live` | Legacy live | PUBLIC | 2026-06-25 | Yes | Yes | **MERGE → /retroverse-2/live or /** |
| `/index` | Re-export home | PUBLIC legacy | 2026-06-28 | Weak | Yes | **REMOVE** |
| `/sunday-nights` | Legacy redirect | PUBLIC | 2026-06-25 | Yes | Yes | **KEEP redirect** |
| `/retroverse/experiences` | Experience gallery | PUBLIC | 2026-06-28 | Yes | No | **KEEP** |
| `/local` | Local Studio Launcher | LOCAL | 2026-06-29 | Weak | No | **KEEP** — localhost entry |
| `/diagnostics` | Diagnostics hub | DIAGNOSTICS | 2026-06-28 | Weak | No | **KEEP** |
| `/control-center` | Dev launchpad | DIAGNOSTICS | 2026-05-22 | Yes | Yes | **MERGE → /diagnostics** |
| `/inspect` | Graph Inspector (Postgres) | DIAGNOSTICS | 2026-05-22 | Yes | Yes | **KEEP** — becomes Database Explorer |
| `/ops` | Command Center hub | COMMAND CENTER | 2026-06-29 | Yes | No | **KEEP** |
| `/ops/studio` (+ 23 subroutes) | Mission Control + pipeline | STUDIO/CC | 2026-06-28 | Yes | Partial | **KEEP** core; merge satellites |
| `/ops/atlas` | Curation world map | ATLAS | 2026-06-16 | Yes | No | **UNKNOWN** — review vs Library |
| `/ops/atlas/library` | Collected songs browser | ATLAS | 2026-06-29 | Yes | No | **KEEP** |
| `/ops/atlas/scripts` | npm Script Launcher | ATLAS | 2026-06-29 | Yes | No | **KEEP** |
| `/ops/atlas/system` | Architecture System Map | ATLAS | 2026-06-29 | Yes | No | **KEEP** |
| `/ops/atlas/1970s` | 1970s territory | ATLAS | 2026-06-16 | Yes | No | **UNKNOWN** |
| `/ops/atlas/workshop` | Atlas workshop | ATLAS | 2026-06-16 | Yes | No | **UNKNOWN** |
| `/ops/atlas/mission/:rvtr` | Mission card | ATLAS | 2026-06-16 | Yes | No | **UNKNOWN** |
| `/ops/browser-plus` | VDJ Browser+ | COMMAND CENTER | 2026-06-25 | Yes | No | **KEEP** (separate design) |
| `/ops/browser-plus-2` | Studio ops center | COMMAND CENTER | 2026-06-28 | Yes | No | **MERGE** with Mission Control nav |
| `/ops/intelligence` (+ 5) | Legacy research packages | COMMAND CENTER | 2026-06-28 | Yes | Yes | **MERGE** into Atlas/Studio |
| `/ops/live-control` | Live show control | COMMAND CENTER | 2026-06-25 | Yes | No | **KEEP** |
| `/ops/live` | Bridge health | COMMAND CENTER | 2026-06-14 | Yes | Partial | **MERGE** with live-control |
| `/ops/map` | Retroverse map | COMMAND CENTER | 2026-06-25 | Yes | Yes | **MERGE → /ops/atlas/system** |
| `/ops/content-creator` (+ 8) | Pass/poster tooling | COMMAND CENTER | 2026-06-10–14 | Yes | Partial | **KEEP** main; **REMOVE** debug POCs |
| `/ops/finance/*` (15 routes) | Personal finance | COMMAND CENTER | 2026-06-25 | Yes | Partial | **KEEP** satellite |
| `/ops/allstar/*` (13 routes) | Baseball archive | COMMAND CENTER | 2026-06-28 | Yes | No | **KEEP** satellite |
| `/ops/experience-director-pilot` | Ollama exhibit pilot | COMMAND CENTER | 2026-06-28 | Yes | No | **REMOVE** or Diagnostics-only |
| `/ops/year/:year/*` | Review universe / sorting | COMMAND CENTER | 2026-06-29 | Yes | No | **MERGE** under Atlas |
| *…remaining ~60 `/ops/*` maintenance routes* | Covers, media, healing, passes, etc. | COMMAND CENTER | 2026-05–06 | Mixed | No | **KEEP** under CC sections; prune unused |

*Full machine-generated table (all 146 rows) available in repo scan output; abbreviated here for readability. Every route was scanned; none omitted from classification logic.*

### Unlinked ops routes (35 with weak/no inbound links — cleanup candidates)

Examples: `/ops/acquisition`, `/ops/covers/embed`, `/ops/creative-lab`, `/ops/crossroads`, `/ops/healing`, `/ops/media-sync`, `/ops/show-builder`, `/ops/studio/audio-analysis`, `/ops/studio/quality-control`, `/ops/studio/visual-analysis`, `/ops/experience-director-pilot`.

**Recommendation:** Hide from Command Center nav until linked or delete in Phase 2.

---

# 5. Atlas Audit

| Route | Purpose | Useful? | Duplicate? | Should move? | Should remove? |
|---|---|---|---|---|---|
| `/ops/atlas/library` | Browse 5,217 collector packages from disk | **Yes** | Duplicates `/ops/studio/collector` browse | **No** — this is the 3.0 Atlas browse surface | **No** |
| `/ops/atlas/scripts` | npm script catalog + safe launcher | **Yes** | None | **No** | **No** |
| `/ops/atlas/system` | Filesystem architecture map | **Yes** | Duplicates `/ops/map` concept | **No** | **No** |
| `/ops/atlas` | Performance Universe world map | Partial | Overlaps System Map “routes” section | Merge into System Map **or** keep as curated “museum map” | **UNKNOWN** |
| `/ops/atlas/1970s` | 1970s territory curation | Partial | Niche curation prototype | Fold under world map or remove | **UNKNOWN** |
| `/ops/atlas/workshop` | Atlas workshop / backups entry | Partial | Linked as “Backups” from CC | Rename/clarify or merge into System Map reports section | **UNKNOWN** |
| `/ops/atlas/mission/:rvtr` | One-screen mission card | Partial | Overlaps Collector + Editor workspace | Move workflow into Studio; keep only if curation game stays | **UNKNOWN** |

### Permanent Atlas (recommended)

1. **Library** — read-only collector browse  
2. **Script Launcher** — operator commands  
3. **System Map** — architecture truth  

### Review / demote

- World map, 1970s, workshop, mission cards — creative prototypes from Atlas Phase A–D; not required for “Operate Retroverse.”

---

# 6. Command Center Audit

**Hub:** `/ops` — links to ~50 tools across 8 sections.

### Keep (core 3.0 operator)

| Route | Role |
|---|---|
| `/ops` | Command Center hub |
| `/ops/studio` | Mission Control |
| `/ops/studio/collector`, `/editor`, `/director`, `/publisher` | Pipeline departments (edit surfaces) |
| `/ops/browser-plus-2` | Library & queue (merge nav with Studio) |
| `/ops/live-control` | Run a show |
| `/ops/sunday-nights` | Event prep |
| `/ops/event-control` | Homepage cover editor |
| `/ops/intelligence` | **Keep temporarily** — legacy package viewer until Atlas Library covers all reads |

### Merge

| Route | Into |
|---|---|
| `/ops/map` | `/ops/atlas/system` |
| `/ops/live` | `/ops/live-control` |
| `/ops/browser-plus-2` nav | `/ops/studio` Mission Control |
| `/ops/studio/collector` (browse mode) | `/ops/atlas/library` |
| `/control-center` | `/diagnostics` |
| Finance redirect stubs (`/ops/finance/ledger`, etc.) | Canonical finance routes |

### Delete (after grace)

| Route | Reason |
|---|---|
| `/ops/content-creator/debug/*` | Debug/POC |
| `/ops/content-creator/v2-poc`, `/classic`, `/generations` | Redirects to debug or library |
| `/ops/experience-director-pilot` | Ollama pilot — not production ops |
| `/ops/media-lab/performances` | Legacy redirect |
| `/ops/intelligence/:rvtr` | Legacy redirect to package viewer |
| `/ops/passes` | Legacy redirect |

### Satellites (keep but exclude from core 3.0 nav)

- `/ops/allstar/*` — baseball product  
- `/ops/finance/*` — personal finance  
- `/ops/content-creator` — event passes (Sunday Nights)  

---

# 7. Database Audit

**No storage changes recommended — documentation only.**

### Where data actually lives

| Store | Location | Size (approx) | Purpose |
|---|---|---|---|
| **Postgres graph** | localhost `retroverse` DB (`RETROVERSE_PG_*` / `DATABASE_URL`) | n/a | Canonical artists, albums, tracks, chart graph — queried by public search, song pages, `/inspect` |
| **RETROVERSE_DATA** (authoritative external) | `../RETROVERSE_DATA` | **~47 GB** | Intelligence packages, research vault, live state, canonical mirrors |
| **Bundled repo data** | `data/` | **~1.6 GB** | Partial mirrors, ops artifacts, Sunday Nights state, finance imports |
| **Studio pipeline JSON** | `data/ops/intelligence/research-department/{RVTR}/` | 5,217 packages | Collector, Editor, Director, Publisher artifacts per song |
| **Intelligence legacy packages** | `RETROVERSE_DATA/ops/intelligence/packages/*.json` | ~1,351 files | Pre-Studio Ollama packages (still referenced by Research Center) |
| **Publisher store** | JSON on disk (via `lib/ops/studio/publisher/store`) | — | Publish decisions |
| **Search index** | Generated files (see `tools/verify-search-index.ts`) | — | Public search |
| **Reports** | `reports/` | ~978 files | Audits, studio batch logs, generated markdown/json |
| **Atlas caches** | `data/ops/atlas/system-map-cache.json` | Generated | System Map scan cache |
| **Finance imports** | `data/finance-imports/` (gitignored) | — | Bank CSV staging |
| **Cover/healing artifacts** | `reports/cover_integrity/`, `data/` subsets | — | Cover repair pipelines |
| **VirtualDJ / media** | External paths via env; referenced in collector `virtualDj` | — | Media file paths, not in repo |
| **Environment variables** | `.env.local` | — | Secrets, `RETROVERSE_OPS`, DB hosts, Ollama — names documented in System Map |

### Authority rules (existing, do not change)

1. **Studio pipeline** → `research-department/{RVTR}/` on disk  
2. **Intelligence legacy** → `RETROVERSE_DATA` first, bundled `data/` fallback  
3. **Public graph** → Postgres  
4. **Patron experiences** → published artifacts + graph reads  

### Database Explorer gap

**Target 3.0 calls for “Database Explorer.”** Today that role is filled by **`/inspect` (Graph Inspector)** — Postgres read-only explorer. No separate route exists. **Recommendation:** Rename/promote `/inspect` under Diagnostics → “Database Explorer” in Phase 2; do not build a second explorer.

---

# 8. Dead Features

Found via source grep: `legacy`, `deprecated`, `redirect`, `debug`, `poc`, `pilot`, `prototype`, `coming soon`, `Uncharted`, `experimental`.

| Route / area | Signal | Recommendation |
|---|---|---|
| `/ops/content-creator/debug/*` | Debug, POC in title | **REMOVE** |
| `/ops/content-creator/v2-poc`, `/classic` | Redirect to debug | **REMOVE** |
| `/ops/experience-director-pilot` | Pilot in path + Ollama | **REMOVE** after artifact review |
| `/ops/studio/experience-lab/:rvtr` | Lab / experimental | **MERGE** into Studio or remove |
| `/ops/studio/training` | Training batch pilot | **KEEP** internal; hide from top nav |
| `/ops/year/:year` | “Review pilot” badges | **KEEP** if sorting board active; else remove |
| `/ops/media-lab` | Legacy redirect | **REMOVE** route file after grace |
| `/ops/intelligence/:rvtr` | Legacy redirect | **REMOVE** |
| `/track/:id`, `/charts`, `/rvtr/*/deck` | Legacy redirects | **REMOVE** route files |
| `/retroverse-2/song/:rvtr/data` | Song Control Center — legacy | **REMOVE** |
| Atlas rail “50s–00s” pills | `Uncharted` muted | **REMOVE** or implement |
| `app/components/song-actions.tsx` | “coming soon” queue button | **REMOVE** UI or implement |
| `/ops/map` | Superseded by System Map | **REMOVE** after link migration |
| `/ops/infrastructure` | Listed in operations-directory — **404** | **REMOVE** dead link |
| Content Creator “Ollama (placeholder)” options | UI placeholder | **REMOVE** or wire to rule-based only |

---

# 9. AI Dependency Audit

### Pages/surfaces that invoke AI at runtime

| Surface | AI used | Could be filesystem/cache only? | Recommendation |
|---|---|---|---|
| `/ops/atlas/library` | **No** | Yes — already disk-only | **KEEP — no AI** |
| `/ops/atlas/scripts` | **No** | Yes | **KEEP — no AI** |
| `/ops/atlas/system` | **No** | Yes — scan + cache | **KEEP — no AI** |
| `/local` | **No** (checks Ollama availability only) | Yes | **KEEP** |
| `/ops/studio/collector` view | **No** for read; AI on **run** | View = yes | **KEEP view; AI only on explicit run** |
| `/ops/studio/editor` | Ollama/OpenAI on rewrite actions | Partial — read packages without AI | **KEEP AI for rewrite; not for browse** |
| `/ops/intelligence/*` | Ollama package generation | Legacy packages already on disk | **MERGE to read-only; stop new Ollama here** |
| `/ops/experience-director-pilot` | Ollama director | No — pilot output | **REMOVE** |
| `/ops/content-creator/*` generate APIs | Image/prompt generation | Partial | **KEEP for creative; not core 3.0** |
| Studio workers (`requestStudioAi`) | Ollama default | Pipeline production — out of 3.0 scope | **No change in Phase 1** |
| Public song/search/experience pages | **No live AI** | Yes — graph + JSON | **KEEP — no AI** |

### Principle for 3.0

| Use AI | Do not use AI |
|---|---|
| Explicit “run department” actions Bob triggers | Browsing, navigation, audits, maps, launchers |
| Editor rewrite (optional) | Atlas Library, System Map, Script Launcher, `/local` |
| Content Creator poster generation | Public discovery pages |

**Highest-impact AI removal:** retire `/ops/intelligence` **generation** paths and `/ops/experience-director-pilot`; keep disk-backed viewers (Atlas Library, package pages).

---

# Appendix A — Permanent Architecture (recommended)

```
retroverse.live (PUBLIC)
  /                     Home (single live attract tour)
  /search               Search
  /retroverse-2/song/*  Song (+ chart journey)
  /experience/*         Patron museum (until merged)
  /artist/*             Artist
  /album/*              Album
  /rv/:year/*           Year (until unified /year)
  /retroverse-2/live    Live (merge into /)

localhost (LOCAL STUDIO)
  /local                Launcher (bookmark + .command)
  /ops                  Command Center
  /ops/atlas/library    Atlas — collected songs
  /ops/atlas/scripts    Atlas — script launcher
  /ops/atlas/system     Atlas — system map
  /inspect              Database Explorer (rename in UI)
  /diagnostics          Diagnostics (+ merged control-center)
  /ops/studio/*         Pipeline edit surfaces (not browse)
```

---

# Appendix B — What not to do in Phase 2

- Do not build Atlas v2 beside Atlas Library.  
- Do not build a second System Map or Route Explorer.  
- Do not add AI to audits, maps, or launchers.  
- Do not expose `/local` or `/ops` on retroverse.live (site-mode gate already exists).  
- Do not migrate data stores without explicit sprint.  

---

**End of Phase 1 audit.** This report is the blueprint input for Retroverse Consolidation 3.0 Phase 2 (navigation merge + deletions).

---

# Phase 2 Complete

**Completed:** 2026-06-29  
**Scope:** Navigation consolidation, naming unification, Atlas encyclopedia structure, Architecture documentation page, Database Explorer rename, legacy demotion — no Studio/Live/Collector/Publisher logic changes, no deletions.

## Pages merged

| From | To | Method |
|---|---|---|
| `/control-center` | `/ops` (Command Center) | Redirect — dev launchpad retired |
| `/ops/map` | `/ops/atlas/system` | Redirect — System Map is canonical |
| `/inspect` | `/database-explorer` | Redirect — same functionality, new name |

## Routes redirected

- `/control-center` → `/ops`
- `/control-center/*` → `/ops`
- `/ops/map` → `/ops/atlas/system`
- `/inspect` → `/database-explorer` (query string preserved)

## Legacy pages hidden

Removed from main Atlas encyclopedia nav and Command Center primary sections; moved to `/ops/atlas/legacy`:

- `/ops/atlas` — Performance Universe world map
- `/ops/atlas/1970s` — 1970s territory board
- `/ops/atlas/workshop` — Atlas workshop
- `/ops/atlas/mission/:rvtr` — mission cards
- `/ops/map` — Retroverse map (redirects to System Map)

Legacy pages retain cream Atlas chrome, show a Legacy banner, and use `AtlasLegacyNav` instead of the encyclopedia rail.

## Navigation simplified

**Public nav** (global header): Home, Search, Song, Artist, Album, Year, Live — all other public routes hidden from nav.

**Command Center** (`/ops`): Top actions and library section point to Atlas encyclopedia surfaces; legacy atlas links demoted to Other Tools → Atlas Legacy.

**Atlas encyclopedia nav** (dark blue): Library, Script Launcher, System Map, Architecture, Legacy.

**Diagnostics** (`/diagnostics`): Database Explorer + Command Center only — Control Center card removed.

**Admin gear menu:** Research Studio, Command Center, Diagnostics (unchanged ops-gated access).

## Architecture page added

- Route: `/ops/atlas/architecture`
- Static content: `lib/atlas/architecture-content.ts`
- Sections: Current Product Architecture, Pipeline, Database, Storage Locations, Naming Rules, Current Sprint/Milestone/Phase/Philosophy
- Styled with Command Center dark blue (`ops-command`)

## Database Explorer renamed

- Canonical route: `/database-explorer`
- UI title: Database Explorer (was Graph Inspector)
- Old route `/inspect` redirects with query preservation
- Restyled to Command Center dark blue theme
- Links updated in Diagnostics, Command Center, Local Studio launcher, song actions

## Color consolidation (internal)

- Database Explorer: cream `inspect.css` → Command Center dark blue
- Atlas encyclopedia pages: unified `AtlasEncyclopediaNav` chrome on Library, Scripts, System Map, Architecture, Legacy index
- Public pages: unchanged (editorial cream/teal)
- Legacy cream Atlas pages: unchanged body theme; legacy banner added

## Execution state

**COMPLETE** — Phase 2 consolidation deliverables implemented. Typecheck: Pass (`tsc --noEmit`). Runtime verification: not run (local dev server not started in this session).
