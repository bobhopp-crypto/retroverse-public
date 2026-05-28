# Retroverse Operating Board

**Purpose:** Operational truth for RETROVERSE_PUBLIC — what is live, locked, local-only, and next.  
**Updated:** 2026-05-28 (source-of-truth audit)  
**Also known as:** “Operating Board Live” — same document; no separate live file exists in this repo.

---

## Governance — single source of truth

| Item | Value |
|------|--------|
| **Authoritative path** | `/Users/bobhopp/RETROVERSE_PUBLIC/docs/RETROVERSE_OPERATING_BOARD.md` |
| **Duplicates in repo** | **None** — only this file |
| **Not authoritative** | Cursor Canvas exports, chat summaries, GitHub `origin/main` if behind local `main`, any copy dated before `a042518` |
| **Board doc commits** | `f78a9c1` (archive-first alignment) → `a042518` (homepage + public-search reality) |
| **Related product commits** | Homepage pads `d9d770a`; browse redirect guard `03d8d82` |
| **Verify you have current board** | File must contain sections: *Pads / search accelerator policy*, *Fail-open rendering policy*, *Public reliability governance*, and the line **Search “complete” / “v1 done” \| FALSE** |

**Sync check:**

```bash
git log -1 --oneline -- docs/RETROVERSE_OPERATING_BOARD.md
# expect: a042518 or later

grep -c "directory board" docs/RETROVERSE_OPERATING_BOARD.md
# expect: >= 1
```

If you still see **poster-first homepage** or **Search stabilization COMPLETE v1**, you are on a **stale branch, unpushed remote, or a non-repo copy** — not this file.

**Production runtime truth:** https://retroverse.live + deployed SHA (may lag git until push).

---

## Product direction (current)

Retroverse is a **navigable music archive**. Public behavior is judged on **production**, not local dev alone.

### Operating priorities (ranked)

| Rank | Priority | Success looks like |
|------|----------|-------------------|
| **#1** | **Public user reliability** | QR scan → homepage → search → click → exhibit — every time, on mobile, on production |
| **#2** | **Operator / DJ workflow** | Ops surfaces support acquisition, media workflow, healing, and DJ career work — gated, never polluting public nav |
| **—** | Everything else | Subordinate to #1 and #2 |

**Not current focus:** poster/atmosphere passes, patina/stillness refinement, or declaring search “done.”

**Board commit (docs):** `a042518` on local `main` — push to update `origin/main` and Canvas/GitHub views.

---

## Live production reality

| Field | Value |
|-------|--------|
| **URL** | https://retroverse.live |
| **Deployed commit** | `3496036` — RV chronology consolidation (verify Vercel if redeployed since) |
| **Homepage** | Code-generated **archive directory board** — inline primary search terminal + four pads |
| **Search** | Overlay = primary public interaction; deterministic matview groups; scoped pads narrow scope |
| **Public trust** | **ACTIVE** — architecture locked; behavior governed by smoke + fail-open policy |
| **Fail-open exhibits** | Sparse render mandatory when enrichment is partial (`0e9582f` baseline) |
| **Data plane** | Neon Postgres + `search_entities` matview + `pg_trgm` |
| **Deploy gate** | `npm run smoke:public-search` against production **before** calling deploy good |

### Post-deploy checks

| Check | Requirement |
|-------|-------------|
| `npm run smoke:public-search` | **Required** — see [Public reliability governance](#public-reliability-governance) |
| `/` | 200 — directory board + search terminal (no poster-only shell) |
| `/charts?…` | 307 → canonical `/rv/...` (no legacy charts shell) |
| `/rv/1967/11/1967-11-04` | 200 — week drill under RV chrome |
| `/api/search/suggestions?q=supremes` | 200 — grouped suggestions |
| Entity routes from smoke | HTTP 200, body contains **“From the archive”**, no redirect to `/` |
| `/ops` (no ops env) | 404 or gated — not a public nav destination |
| `/api/healing/album-links` | 403 on production (control-center gated) |

### Warm latency (indicative — not a deploy gate)

| Route | Typical |
|-------|---------|
| `/api/search/suggestions?q=supremes` | ~0.2s warm |
| `/api/search?q=madonna` | ~4s (interim `/search` only — frozen) |
| `/track/RVTR*` | ~0.5–1.5s |
| `/artist/*` | ~2–3s |

---

## Status board

| Workstream | Status |
|------------|--------|
| **#1 Public navigation trust** | **ACTIVE** — smoke-governed each release; not solved |
| Homepage — archive directory board | **DONE** — `d86c7ed` → `d9d770a`; poster landing retired |
| Homepage pads (4) + scoped overlay | **DONE** — accelerators only; Charts → `/rv/1978` |
| Fail-open exhibits + routing integrity | **DONE** — `0e9582f`, `e0d4319`, `0dd73ac` |
| Public search smoke + CI | **DONE** — `8470566`, `2f85854` |
| Search overlay architecture | **LOCKED** — deterministic groups; no public fuzzy scan |
| **#2 Ops / DJ workflow** | **ACTIVE (secondary)** — local tooling on branch; env-gated on production |
| Artist exhibit continuity | **DONE** — vertical baseline; artist charts on `/artist/[slug]/charts` |
| Public chronology (`/rv/*`) | **DONE** — `3496036`; `/charts` → redirect only |
| `/search` interim page | **LIVE, frozen** — not homepage path |
| RV History + Songs on `/search` | **DONE, locked** |
| Canonical enrichment healing | **ACTIVE (parallel)** — not priority #1 |
| Chronology year archives (`/rv/*`) | **DONE** — `/rv/[year]/[month]/[week]`; legacy `/charts` redirects |
| Search Intent Interceptor (full) | **DEFERRED** |
| Atmosphere / patina / stillness passes | **NOT ACTIVE** — do not prioritize over #1 |

---

## Locked public architecture (do not drift)

| Layer | Rule |
|-------|------|
| **Homepage** | Directory board; **search-forward**; primary terminal always visible |
| **Four pads** | Artists · Albums · Tracks · Charts — see [Pads / search accelerator policy](#pads--search-accelerator-policy) |
| **No browse silos** | No `/browse/*` starter pages; legacy URLs redirect home (`03d8d82` `next.config.js`) |
| **Overlay search** | Deterministic grouped PG entities; scoped filter when opened from a pad |
| **Hydration** | Overlay lightweight; exhibits hydrate covers/charts/albums |
| **Canonical IDs** | RVTR / RVAL / artist slug end-to-end |
| **Fail-open** | Canonical entity → page renders (sparse allowed) |
| **Production truth** | Ship behavior verified on https://retroverse.live, not localhost alone |
| **`/search` page** | Interim deep-dive only — frozen |

**Do not:** restore poster-first home; imply search is finished; put healing or atmosphere ahead of public trust; expose ops in public IA except gated operator link.

---

## Homepage architecture (current)

| Element | Behavior |
|---------|----------|
| **Board** | Code-generated archive directory — tactile retro framing, mobile-first |
| **Primary terminal** | Inline search input — full archive scope (`all`) |
| **Artists pad** | Opens overlay scoped to `artists` |
| **Albums pad** | Opens overlay scoped to `albums` |
| **Tracks pad** | Opens overlay scoped to `songs` |
| **Charts pad** | Links to RV chronology (`/rv/1978` today) — not a search replacement |
| **Feedback** | Footer mailto `feedback@retroverse.live` (not a poster hotspot) |
| **Ops link** | `Archive Ops` only when `RETROVERSE_OPS=1` — corner utility, not public IA |

**Removed / obsolete:** poster image landing; cinematic “tap to search” shell; `/browse/artists|albums|tracks`.

Anchors: `app/page.tsx`, `home-directory.tsx`, `home-search-input.tsx`, `home-search-overlay.tsx`, `lib/search/home-search-scope.ts`

---

## Pads / search accelerator policy

**Intended flow:**

```text
Homepage → search terminal OR scoped pad → overlay (filtered) → existing exhibit route
```

**Not allowed:**

```text
Homepage → fake category page → starter list → exhibit
```

| Pad | Role |
|-----|------|
| Artists / Albums / Tracks | **Accelerators** — pre-filter suggestion groups; same overlay, narrower scope |
| Charts | **Chronology entry** — year/archive route; complements search |

Pads are **filters and entry points**, not separate mini-sites or indexes.

---

## Fail-open rendering policy

If a **canonical entity exists**, the public route **must render**:

| Route | Requirement |
|-------|-------------|
| `/artist/[slug]` | Render — even with partial PG / ping failure |
| `/album/[id]` | Render — even without cover or full track list |
| `/track/[id]` | Render — even with missing album link or artwork |

**Allowed thin data:** missing artwork, missing album links, incomplete charts, partial enrichment.

**Required UX:** sparse exhibit, placeholder plate, quiet honest archive copy (e.g. still indexing).

**Forbidden:**

- Redirect to `/` or home after a valid search click
- `notFound()` solely because enrichment or secondary data failed
- Collapsing the page because optional modules are empty

Anchors: `load-artist-page.ts`, `load-artist-exhibit-shell.ts`, `app/track/[id]/page.tsx`, `app/album/[id]/page.tsx`  
Detail: [REAL_USER_RELIABILITY.md](./REAL_USER_RELIABILITY.md)

---

## Sparse exhibit fallback policy

| Surface | When thin |
|---------|-----------|
| Track | Stub + indexing plate — keep RVTR visible |
| Album | Stub + indexing plate — keep RVAL visible |
| Artist | Slug-derived identity; omit empty sections — no fake charts/albums |

No “coming soon” marketing filler; no auto-heal on page load.

---

## Public reliability governance

### Required before deploy

```bash
RETROVERSE_BASE=https://retroverse.live npm run smoke:public-search
```

Default base is production. **Do not** ship routing/search changes without a green smoke on production.

### Required live queries (10)

Script: `tools/smoke-public-search.mjs`

| Query |
|-------|
| aretha franklin |
| elton john |
| madonna |
| bee gees |
| fleetwood mac |
| thriller |
| stand by me |
| supremes |
| donna summer |
| eagles |

### Required result (per query)

1. `GET /api/search/suggestions?q=…` resolves grouped suggestions  
2. First artist (and track; album if shown) `href` fetches with **HTTP 200**  
3. Response body contains **“From the archive”**  
4. No redirect to home  
5. **Two passes** per query (`repeatOk`) — simulates search-again stability  

### CI

`.github/workflows/smoke-public-search.yml` runs `npm run smoke:public-search` on **push to `main`** and on **pull_request**.

### Regression watchlist

- Homepage flash after overlay click  
- 404 on valid PG artist slug  
- `href` coercion dropping to `/`  
- Production-only failures (local green, prod red)

Also: [SEARCH_ROUTING_INTEGRITY.md](./SEARCH_ROUTING_INTEGRITY.md), [DEV_STABILITY.md](./DEV_STABILITY.md)

---

## Search stabilization status

| Statement | Truth |
|-----------|--------|
| Search architecture | **Locked** — deterministic matview groups, scoped overlay, no public fuzzy soup |
| Search “complete” / “v1 done” | **FALSE** — do not use this language |
| Public search trust | **ACTIVE** — ongoing smoke + manual QR journey |
| Primary interaction | Search (terminal + overlay) — not atmosphere |
| `/search` page | Frozen interim — slower upstream path |

Search stabilization means **frozen architecture + active reliability governance**, not closed work.

---

## Search architecture (reference)

### A. Overlay — **LIVE** (homepage)

`GET /api/search/suggestions?q=` → grouped artists / songs / albums / years → pad scope via `home-search-scope` → `<Link>` to exhibits.

### B. `/search` — **LIVE interim**

`GET /api/search?q=` → welcome upstream + Songs + RV History. Not the homepage path.

---

## Ops priority (secondary)

| Rule | Detail |
|------|--------|
| **Rank** | #2 — important, never overrides #1 public trust |
| **Routes** | `/ops` and related APIs are **operator-only** |
| **Gate** | `RETROVERSE_OPS=1` — homepage shows small `Archive Ops` link only when set |
| **Purpose** | Acquisition, media sync, healing review, DJ career support, restoration tooling |
| **Public IA** | Must not leak into discovery paths except gated operator utility |
| **Production** | Much ops code still **local-only** on branch — do not assume live until merged and env set |

Healing and restoration run **in parallel** with public reliability; they do **not** replace smoke or fail-open work.

---

## Chronology (canonical — locked)

| Route | Role |
|-------|------|
| `/rv/[year]` | Year chronicle entry |
| `/rv/[year]/[month]` | Month drill |
| `/rv/[year]/[month]/[week]` | Week deep link (`YYYY-MM-DD`) |
| `/charts` | **Compatibility redirect only** → matching `/rv/...` path |
| Charts pad (home) | `/rv/1978` |
| `/artist/[slug]/charts` | Artist-scoped chart history (separate shell) |

Future (board entry required): two-digit shortcuts (`67` → `/rv/1967`), richer year IA — do not reopen `/charts` public shell.

---

## Known gaps

### Public trust (priority #1 residuals)

- Cold serverless latency spikes  
- Broad title queries still noisy in graph  
- Overlay → exhibit must stay smoke-clean each release  

### Archive integrity (parallel — healing)

- ~56% album-link coverage; degraded tracks (e.g. Stand By Me `RVTR898681`)  
- Duplicate RVTR rows; gated healing API — no auto-heal on load  

### Ops

- Feedback mailto delivery not verified  
- Full ops console not on production `main` yet  

---

## Deployed vs local-only

### Deployed on `main` (typical)

Directory homepage, overlay suggestions API, fail-open exhibits, interim `/search`, smoke script + CI, healing audit CLI, matview refresh.

### Local-only (until merged)

`app/ops/*`, `app/api/ops/*`, `app/api/events/*`, `lib/ops/*`, `lib/events/*`, much of workflows stack.

### Production-gated

`/inspect`, `/control-center`, `/api/healing/album-links`

---

## Artist exhibit continuity — DONE

Vertical mobile exhibit; full chart explorer on `/artist/[slug]/charts` only. Do not re-embed chart wizard on main exhibit without board entry.

---

## Songs + RV History — DONE (locked)

On interim `/search` only. No restyle without board entry.

---

## Feedback inbox

**feedback@retroverse.live** — mailto in directory footer (`home-directory.tsx`).  
Not a poster hotspot. Delivery path not verified.

---

## Current active priority

### 1. Public user reliability (mandatory)

**Journey:** QR → `/` → search terminal or pad → overlay → click → exhibit (200, “From the archive”) → back → repeat.

| Gate | Action |
|------|--------|
| Every deploy | `npm run smoke:public-search` on production |
| Routing change | `SEARCH_ROUTING_INTEGRITY` + manual mobile overlay tap |
| Entity loaders | Preserve fail-open — no new enrichment-gated `notFound()` |

### 2. Operator / DJ workflow (secondary)

Ops tooling for acquisition, media, healing, restoration — ship only with `RETROVERSE_OPS` gating and without regressing #1.

### 3. Canonical enrichment healing (parallel, not #1)

Album-link recovery, cover pipeline, duplicate RVTR review — via gated apply workflow (`healing:review`, `/ops/healing` local).  
Does **not** excuse public smoke failures.

---

## Do not (current phase)

- Say search is “done,” “complete,” or “stable enough” without a green production smoke  
- Treat public usability as solved  
- Prioritize atmosphere/patina/stillness over navigation trust  
- Restore poster-first homepage or poster hotspot feedback UX  
- Add `/browse/*` or pad destinations that bypass overlay → exhibit model  
- Put archive restoration/healing ahead of smoke failures  
- Extend monolithic `/search`, interceptor, command palette, or AI search without board entry  
- Expose ops in public navigation (except `RETROVERSE_OPS=1` corner link)  
- Deploy entity/routing changes without production smoke  
- Assume localhost behavior matches production  

---

## Related docs

- [REAL_USER_RELIABILITY.md](./REAL_USER_RELIABILITY.md)
- [SEARCH_ROUTING_INTEGRITY.md](./SEARCH_ROUTING_INTEGRITY.md)
- [DEV_STABILITY.md](./DEV_STABILITY.md)
- [RETROVERSE_PROJECT_CONTEXT.md](./RETROVERSE_PROJECT_CONTEXT.md)
- `.cursor/rules/retroverse-design.mdc`
- `.cursor/rules/retroverse-data.mdc`
