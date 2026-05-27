# Retroverse Operating Board

**Purpose:** Operational truth for RETROVERSE_PUBLIC — what is live, locked, local-only, and next.  
**Updated:** 2026-05-27 (artist exhibit baseline)  
**Source of truth:** Deployed behavior at https://retroverse.live + commit on `main`

---

## Live production (verified 2026-05-25)

| Field | Value |
|-------|--------|
| **URL** | https://retroverse.live |
| **Commit** | `3c00d6f` — Polish overlay search trust: index typography, calm ranking, drawer feel |
| **Search stabilization** | `384765a` → `d65931f` → `3c00d6f` — **COMPLETE v1** |
| **Data plane** | Neon Postgres (pooler) + `search_entities` matview + `pg_trgm` |
| **Homepage** | Poster-first; search trigger opens fullscreen drawer |
| **Mobile search** | Fullscreen overlay — **DONE v1, stabilized** |

### Production smoke (curl, 2026-05-25)

| Route | HTTP | Notes |
|-------|------|--------|
| `/` | 200 | Poster shell + `home-search-trigger` |
| `/api/search/suggestions?q=supremes` | 200 | Grouped index; `index.entitySource: matview` |
| `/api/search?q=madonna` | 200 | Monolithic deep-dive page API (~4s) |
| `/artist/the-supremes` | 200 | Artist exhibit |
| `/track/RVTR336241` | 200 | Thriller — healthy control |
| `/track/RVTR898681` | 200 | Stand By Me — degraded (missing album join) |
| `/ops`, `/api/events` | 404 | Local-only |
| `/api/healing/album-links` | 403 | Gated (control-center) |

### Warm latency snapshot (production)

| Route | Typical |
|-------|---------|
| `/api/search/suggestions?q=supremes` | **~0.21s** warm |
| `/api/search?q=madonna` | **~4s** |
| `/track/RVTR*` | **~0.5–1.5s** |
| `/artist/*` | **~2–3s** |

---

## Status board

| Workstream | Status |
|------------|--------|
| Navigation integrity — Tier A / B1 / B2 | **DONE** — `e48fee9` → `a6fdf83` |
| Homepage search overlay v1 | **DONE** — `b74f32c` → `3c00d6f` |
| Songs section (v1) | **DONE** — locked |
| Artist exhibit continuity | **DONE** — vertical mobile baseline; charts explorer on `/charts` only |
| RV History on `/search` | **DONE** — locked |
| `/search` monolithic page | **LIVE interim** — frozen; do not extend |
| Album-link recovery audit | **DONE** code (`4c94d19`); writes not live on track pages |
| Feedback inbox | **OPS** — verify delivery periodically |
| Ops console / events / workflows | **LOCAL ONLY** — not on `main` |
| Search Intent Interceptor (full) | **DEFERRED** — no current work planned |
| Canonical enrichment healing | **ACTIVE** — see below |

---

## Locked public architecture (do not drift)

| Layer | Rule |
|-------|------|
| **Homepage** | Poster-first; fullscreen search drawer only |
| **Overlay search** | Deterministic grouped PG entities; lightweight payloads; direct RVTR/RVAL routing |
| **Hydration** | Overlay omits covers; entity pages hydrate albums/charts/covers |
| **Canonical IDs** | RVTR / RVAL / artist slug routing preserved |
| **Songs + RV History** | Locked on `/search` interim page |
| **`/search` page** | Deep-dive interim only — not homepage path; frozen |

**Do not:** revert overlay, add command-palette UI, or extend monolithic `/search` without a new board entry.

---

## Search architecture (reference — stabilized)

### A. Overlay search — **LIVE** (homepage)

`GET /api/search/suggestions?q=` → `querySearchEntities(overlay)` → grouped artists / songs / albums / years → direct entity navigation.

Anchors: `home-search-overlay.tsx`, `load-suggestion-response.ts`, `query-search-entities.ts`, `refine-overlay-entities.ts`

### B. `/search` page — **LIVE interim** (not homepage)

`GET /api/search?q=` → normalization + welcome upstream + RV History / Songs panels. Slower; frozen.

---

## Search Intent Interceptor — deferred

Overlay v1 already ships grouped entity lookup + tap-to-route (partial Step 1).

Full interceptor (dedicated choice UX + immersive results shell) is **deferred**. No implementation work is planned. Search v1 is considered production-stable.

Do not extend monolithic `/search` to compensate.

---

## Known gaps

### Archive integrity (active concern)

- **~56% album-link coverage** — degraded tracks correlate with missing `canonical_album_tracks`
- **Stand By Me** (`RVTR898681`) — wrong artist label, no cover (Thriller `RVTR336241` = healthy control)
- Duplicate RVTR / duplicate title rows in graph (e.g. two “Baby Love” entries)
- Healing API deployed but gated; no auto-heal on track page load

### Search (residual — not blocking)

- Cold serverless first hit may spike >1s
- Residual graph noise on broad title queries (e.g. multiple “Stand By Me” artists)

### Navigation / perf

- `fetchHomeSearch()` serial welcome hop on artist load
- `/artist/[slug]/charts` full payload ~2.5–3s

### Ops

- Feedback inbox delivery path not verified

---

## Deployed vs local-only

### Deployed (`main`)

Public site, overlay search API, `/search` interim page, album-link audit code + CLI (`npm run track:audit-album-links`), matview refresh script (`npm run search:refresh-entities`).

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

Remaining: charts route still heavy (~2.5–3s); exhibit nav Library pill may land on honest empty state when no VDJ media.

---

## Artist exhibit continuity (DONE)

| Change | Notes |
|--------|--------|
| Main exhibit | Vertical one-column flow; no horizontal album/library rails |
| Chart explorer | Moved off main exhibit → `/artist/[slug]/charts` only |
| Chart highlights | Stats panel on main + link to charts sub-route |
| Dominant years | Suppressed on main when no Hot 100 year data |
| Related artists | Vertical cards + PG co-chart fallback |
| Placeholder sub-routes | Honest empty copy (no “coming soon”) when section has no data |
| CSS | Restored `.artist-footer-nav` selector |

Anchors: `app/artist/[slug]/page.tsx`, `artist-page.css`, `load-artist-page.ts`, `load-related-artists.ts`

---

## Songs + RV History (DONE — locked)

Songs jukebox v1 and RV History on `/search` — do not restyle or rebuild without new board entry.

Anchors: `search-songs-jukebox-panel.tsx`, `songs-jukebox-reel.tsx`, `search.css`

---

## Feedback inbox

**feedback@retroverse.live** — poster mailto hotspot. Delivery path not verified.

---

## Current active priority

### Canonical enrichment healing

Search v1 is stabilized. The project now focuses on **archive integrity**.

| Focus | Notes |
|-------|--------|
| Album-link recovery | Audit + **review workflow** (`npm run healing:review`, `/ops/healing` local) |
| Degraded track enrichment | Stand By Me cluster (≤20); Ben E. King needs album ingest before high-confidence link |
| Duplicate RVTR cleanup | Graph dedupe where safe |
| Cover enrichment | `auditCoverForRvtr` → curator pipeline preview; no auto-approve |
| Healing approval workflow | POST `/api/ops/healing/apply` gated by `RETROVERSE_HEALING_APPLY=1`; JSONL audit log |

**Local ops tooling** (`/ops`, media-sync) may support this phase once merged and deployed — currently local-only.

---

## Do not (current phase)

- Redesign homepage, overlay, or Songs / RV History
- Reopen search architecture or extend monolithic `/search`
- Build interceptor Step 2/3, command palette, or AI search
- Assume `/ops` or `/api/events` are live on production
- Auto-heal canonical graph without approved workflow

---

## Related docs

- [RETROVERSE_PROJECT_CONTEXT.md](./RETROVERSE_PROJECT_CONTEXT.md)
- `.cursor/rules/retroverse-design.mdc`
- `.cursor/rules/retroverse-data.mdc`
