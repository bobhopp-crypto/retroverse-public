# Retroverse Operating Board

**Purpose:** Operational truth for RETROVERSE_PUBLIC — what is live, locked, local-only, and next.  
**Updated:** 2026-05-28 (operating board reality alignment)  
**Source of truth:** Deployed behavior at https://retroverse.live + commit on `main`

---

## Product direction (current)

Retroverse is a **navigable music archive** — not a poster-only atmosphere piece.

| Pillar | Direction |
|--------|-----------|
| **Public priority** | **User navigation trust** — search → click → exhibit must work every time |
| **Homepage** | Directory-board archive entry; search-forward; tactile “primary terminal”; mobile-first |
| **Search** | Primary public interaction; deterministic archive narrowing; scoped accelerators on home |
| **Exhibits** | Fail-open mandatory — sparse plate beats redirect or 404 |
| **Chronology** | Charts / years are core navigation; `/rv/1978`-style archive years are strategic (future expansion: `67`, `78`, `92`, …) |
| **Not current focus** | Conceptual atmospheric refinement without navigation impact |

**Repo HEAD (this board):** `d9d770a` — homepage pads as search accelerators; browse starter pages removed.

---

## Live production (verify after each deploy)

| Field | Value |
|-------|--------|
| **URL** | https://retroverse.live |
| **Commit** | Verify `git log -1` on deployed `main` — may lag repo until push |
| **Homepage** | Code-generated **archive directory board** (`HomeDirectory`) — inline search terminal + scoped pads |
| **Search overlay** | Deterministic PG `search_entities` suggestions; scoped groups via pads |
| **Routing integrity** | `e0d4319` → entity href coercion, overlay `<Link>` navigation |
| **Fail-open exhibits** | `0e9582f` — sparse render when enrichment/ping fails |
| **Data plane** | Neon Postgres (pooler) + `search_entities` matview + `pg_trgm` |
| **Deploy gate** | `npm run smoke:public-search` (CI: `.github/workflows/smoke-public-search.yml`) |

### Production smoke (curl + smoke script)

| Check | Requirement |
|-------|-------------|
| `npm run smoke:public-search` | **Required before declaring deploy good** — 10 queries, HTTP 200 + “From the archive” on entity landings |
| `/` | 200 — directory board + search terminal (not poster-only shell) |
| `/api/search/suggestions?q=supremes` | 200 — grouped index; `index.entitySource: matview` |
| `/artist/*`, `/track/RVTR*`, `/album/RVAL*` | 200 — fail-open; no redirect-to-home on missing enrichment |
| `/ops`, `/api/events` | 404 — local-only / gated |
| `/api/healing/album-links` | 403 — gated (control-center) |

### Warm latency snapshot (production — indicative)

| Route | Typical |
|-------|---------|
| `/api/search/suggestions?q=supremes` | **~0.2s** warm |
| `/api/search?q=madonna` | **~4s** (interim `/search` page — frozen) |
| `/track/RVTR*` | **~0.5–1.5s** |
| `/artist/*` | **~2–3s** |

---

## Status board

| Workstream | Status |
|------------|--------|
| Homepage — archive directory board | **DONE** — `d86c7ed` → `d9d770a` (replaces poster-first landing) |
| Homepage search overlay + scoped pads | **DONE** — Artists / Albums / Tracks open scoped overlay; Charts → `/rv/1978` |
| Navigation integrity — routing + overlay links | **DONE** — `e0d4319`, `0dd73ac` |
| Fail-open public exhibits | **DONE** — `0e9582f`; policy locked below |
| Public search smoke governance | **DONE** — `8470566`, `2f85854` |
| Search API + overlay architecture | **LOCKED** — deterministic matview groups; do not fuzzy-broaden |
| Public navigation trust | **ACTIVE** — not “solved”; smoke + manual journeys required each release |
| Artist exhibit continuity | **DONE** — vertical mobile baseline; charts on `/charts` only |
| RV History on `/search` | **DONE** — locked on interim page |
| `/search` monolithic page | **LIVE interim** — frozen; not homepage path |
| Album-link recovery audit | **DONE** code (`4c94d19`); writes not live on track pages |
| Chronology-first year archives (`/rv/*`) | **STRATEGIC** — partial live (`/rv/1978` pad); expand `67` / `78` / `92` style navigation |
| Feedback inbox | **OPS** — verify delivery periodically |
| Ops console / events / workflows | **LOCAL ONLY** — not on `main` |
| Search Intent Interceptor (full) | **DEFERRED** — no current work planned |
| Canonical enrichment healing | **ACTIVE** — parallel to public trust |

---

## Locked public architecture (do not drift)

| Layer | Rule |
|-------|------|
| **Homepage** | Directory board — **search-forward**; primary terminal always visible; pads are **scope accelerators**, not category mini-sites |
| **Directory pads** | Artists / Albums / Tracks → open overlay with `artists` / `albums` / `songs` scope; **no** `/browse/*` starter pages |
| **Charts pad** | Chronology entry (e.g. `/rv/1978`) — year/archive navigation, not search replacement |
| **Overlay search** | Deterministic grouped PG entities; lightweight payloads; direct RVTR/RVAL/slug routing |
| **Hydration** | Overlay omits covers; entity pages hydrate albums/charts/covers |
| **Canonical IDs** | RVTR / RVAL / artist slug routing preserved end-to-end |
| **Fail-open entities** | If a canonical entity exists, render the exhibit (sparse allowed). Never redirect to home; never 404 due to enrichment/ping failure alone |
| **Sparse exhibit** | Honest “still indexing” plates — never fake richness; never `notFound()` for resolvable IDs |
| **Songs + RV History** | Locked on `/search` interim page only |
| **`/search` page** | Deep-dive interim — not homepage path; frozen |

**Do not:** revert to poster-only home without board entry; add `/browse/*` category silos; extend monolithic `/search`; add command-palette or AI search; treat atmosphere work as higher priority than navigation trust.

---

## Homepage architecture (current)

| Element | Behavior | Anchors |
|---------|----------|---------|
| **Board shell** | Code-generated directory — tactile pads, cream/teal/orange retro framing | `app/page.tsx`, `home-directory.tsx`, `home-directory.css` |
| **Primary terminal** | Inline `HomeSearchInput` — full archive scope (`all`) | `home-search-input.tsx` |
| **Scoped pads** | Button → overlay with filtered suggestion groups | `lib/search/home-search-scope.ts`, `home-search-overlay.tsx` |
| **Charts pad** | Link to year archive (`/rv/1978` today) | `home-directory.tsx` |
| **Ops utility** | `Archive Ops` bottom-right when `RETROVERSE_OPS=1` only | `lib/ops/ops-gate.ts` |
| **Removed** | Poster image homepage; `/browse/artists|albums|tracks` starter routes | — |

**Philosophy:** Fast public usability and immediate search — not “tap poster to discover search.”

---

## Public usability philosophy

| Principle | Meaning |
|-----------|---------|
| **Archive, not brochure** | User should narrow and land on real entities in few taps |
| **Search-first** | Home terminal + overlay are the main front door; atmosphere serves legibility, not replacement |
| **Mobile-first** | Touch targets, overlay as fullscreen drawer, `<Link>` rows for stable Safari navigation |
| **Trust over polish** | A sparse honest exhibit beats a redirect, 404, or homepage flash |
| **Ongoing, not done** | Routing fixes shipped; latency, cold starts, and graph gaps remain |

---

## Fail-open rendering policy

**Mandatory on all public entity routes.**

| Situation | Required behavior |
|-----------|-------------------|
| PG ping / loader partial failure | Render exhibit shell with available fields |
| Missing album join / cover | Show sparse plate; keep canonical RVTR/RVAL on page |
| Unknown slug pattern only | May 404 — not “enrichment failed” |
| Bad suggestion href | Coerce or block in overlay — never `router.push('/')` |

**Forbidden:** `notFound()` when slug/ID is recognizable; redirect to `/` after search click; silent drop to home on enrichment error.

Anchors: `load-artist-page.ts`, `load-artist-exhibit-shell.ts`, `app/track/[id]/page.tsx`, `app/album/[id]/page.tsx`  
Doc: [REAL_USER_RELIABILITY.md](./REAL_USER_RELIABILITY.md)

---

## Sparse exhibit fallback policy

When enrichment is thin but the entity is real:

| Surface | User sees |
|---------|-----------|
| **Track** | Title/artist stub + “still being indexed” plate |
| **Album** | Album stub + same honest messaging |
| **Artist** | Slug-derived name + links to search/inspect; sections omit empty modules |

**Do not:** invent chart rows, covers, or albums; use “coming soon” marketing copy; auto-heal graph on page load.

---

## Public reliability governance

| Control | Rule |
|---------|--------|
| **Pre-deploy smoke** | Run `npm run smoke:public-search` against production URL after deploy |
| **CI** | `smoke-public-search` workflow on `main` |
| **Routing changes** | Require [SEARCH_ROUTING_INTEGRITY.md](./SEARCH_ROUTING_INTEGRITY.md) checklist |
| **Regression class** | Search → click → homepage flash, 404 on valid artist, `/` from overlay |
| **Dev stability** | `npm run dev` clears stale `.next` — see [DEV_STABILITY.md](./DEV_STABILITY.md) |

Public usability is **governed**, not assumed complete after any single pass.

---

## Search stabilization status

| Layer | Status | Notes |
|-------|--------|-------|
| **Overlay API + matview groups** | **Architecture locked** | Deterministic narrowing; no fuzzy public scan |
| **Routing / href coercion** | **Shipped** | `e0d4319` → `SEARCH_ROUTING_INTEGRITY.md` |
| **Overlay UX (Link nav, scope pads)** | **Shipped** | Home directory integration `d9d770a` |
| **Public trust / fail-open** | **Shipped, ongoing governance** | Smoke required each release |
| **“Search is done”** | **FALSE** | Residual latency, graph noise, cold starts remain |
| **Monolithic `/search` page** | **Frozen interim** | Slower upstream path; not homepage |

Search is **primary public interaction** — not secondary to atmosphere. Stabilization means **locked architecture + enforced reliability**, not “no more search work.”

---

## Search architecture (reference)

### A. Overlay search — **LIVE** (homepage)

`GET /api/search/suggestions?q=` → `querySearchEntities(overlay)` → grouped artists / songs / albums / years → scoped by `home-search-scope` when opened from pads → direct entity navigation.

Anchors: `home-search-overlay.tsx`, `load-suggestion-response.ts`, `query-search-entities.ts`, `refine-overlay-entities.ts`

### B. `/search` page — **LIVE interim** (not homepage)

`GET /api/search?q=` → normalization + welcome upstream + RV History / Songs panels. Slower; frozen.

---

## Search Intent Interceptor — deferred

Overlay ships grouped entity lookup + tap-to-route. Full interceptor (dedicated choice UX + immersive results shell) is **deferred**. Do not extend monolithic `/search` to compensate.

---

## Chronology & history vision

| Item | Status |
|------|--------|
| **Strategic direction** | Chronology-first exploration — years and charts as first-class archive navigation |
| **Live today** | Charts pad → `/rv/1978`; RV History panel on interim `/search` |
| **Future** | Expand year surfaces (`67`, `78`, `92`, …) as navigable archive rooms — not separate search products |
| **Rule** | Year/chart routes complement search; they do not replace entity resolution |

---

## Known gaps

### Archive integrity (active concern)

- **~56% album-link coverage** — degraded tracks correlate with missing `canonical_album_tracks`
- **Stand By Me** (`RVTR898681`) — wrong artist label, no cover (Thriller `RVTR336241` = healthy control)
- Duplicate RVTR / duplicate title rows in graph
- Healing API deployed but gated; no auto-heal on track page load

### Search & navigation (residual)

- Cold serverless first hit may spike >1s
- Residual graph noise on broad title queries
- `fetchHomeSearch()` serial welcome hop on artist load
- `/artist/[slug]/charts` full payload ~2.5–3s

### Ops

- Feedback inbox delivery path not verified

---

## Deployed vs local-only

### Deployed (`main`)

Public site, directory homepage, overlay search API, `/search` interim page, fail-open exhibits, smoke script + CI, album-link audit CLI, matview refresh script.

### Local-only (not on production)

`app/ops/*`, `app/api/ops/*`, `app/api/events/*`, `lib/ops/*`, `lib/events/*`, `middleware.ts`, `lib/workflows/schema.sql`

### Dev-gated on production

`/inspect`, `/control-center`, `/api/healing/album-links`

---

## Navigation integrity — Tier A / B1 / B2 (DONE)

| Tier | Commit |
|------|--------|
| A — loading shells, prefetch, song actions | `e48fee9` |
| B1 — persistent artist exhibit shell | `a2e1689` |
| B2 — URL-addressable chart state (`/artist/[slug]/charts`) | `a6fdf83` |

---

## Artist exhibit continuity stabilization — DONE

**Baseline:** vertical mobile exhibit; chart explorer on `/artist/[slug]/charts` only.

**Do not:** reopen main exhibit layout or re-embed chart wizard on `/artist/[slug]` without board entry.

Anchors: `app/artist/[slug]/page.tsx`, `artist-page.css`, `load-artist-page.ts`

---

## Songs + RV History (DONE — locked)

Songs jukebox v1 and RV History on `/search` — do not restyle or rebuild without new board entry.

---

## Feedback inbox

**feedback@retroverse.live** — mailto from directory footer. Delivery path not verified.

---

## Current active priority

### 1. User navigation trust (top public priority)

Every release must preserve: **search → click → correct exhibit → back** without homepage flash, spurious 404, or redirect home.

| Requirement | Action |
|-------------|--------|
| Pre-deploy | `npm run smoke:public-search` |
| Routing changes | Manual overlay + `/search` panel checks per `REAL_USER_RELIABILITY.md` |
| Fail-open | No new `notFound()` gates on resolvable entities |

### 2. Canonical enrichment healing (parallel)

Search **architecture** is locked; **graph quality** work continues.

| Focus | Notes |
|-------|--------|
| Album-link recovery | Audit + review workflow (`npm run healing:review`, `/ops/healing` local) |
| Degraded track enrichment | Stand By Me cluster; Ben E. King album ingest |
| Duplicate RVTR cleanup | Graph dedupe where safe |
| Cover enrichment | Curator pipeline; no auto-approve |
| Healing approval | POST `/api/ops/healing/apply` gated; JSONL audit log |

**Local ops tooling** may support healing once merged — currently local-only.

---

## Do not (current phase)

- Treat public usability or search as “finished”
- Redesign homepage back to poster-only or atmosphere-first without board entry
- Add `/browse/*` category mini-sites or pad links that bypass search scope model
- Reopen overlay architecture, extend monolithic `/search`, or build interceptor / command palette / AI search
- Prioritize conceptual atmospheric passes over navigation trust failures
- Assume `/ops` or `/api/events` are live on production
- Auto-heal canonical graph without approved workflow
- Deploy without smoke pass when entity routing changed

---

## Related docs

- [RETROVERSE_PROJECT_CONTEXT.md](./RETROVERSE_PROJECT_CONTEXT.md)
- [REAL_USER_RELIABILITY.md](./REAL_USER_RELIABILITY.md)
- [SEARCH_ROUTING_INTEGRITY.md](./SEARCH_ROUTING_INTEGRITY.md)
- [DEV_STABILITY.md](./DEV_STABILITY.md)
- `.cursor/rules/retroverse-design.mdc`
- `.cursor/rules/retroverse-data.mdc`
