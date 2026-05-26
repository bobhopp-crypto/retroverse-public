# Retroverse Operating Board

**Purpose:** Operational truth for RETROVERSE_PUBLIC — what is live, locked, local-only, and next.  
**Updated:** 2026-05-25 (production audit realignment)  
**Source of truth:** Deployed behavior at https://retroverse.live + commit `384765a` on `main`

---

## Live production (verified 2026-05-25)

| Field | Value |
|-------|--------|
| **URL** | https://retroverse.live |
| **Commit** | `384765a` — Stabilize mobile search overlay responsiveness and compositing |
| **Prior search stack** | `b74f32c`–`bc9cbf7` overlay ship · `8420934` search_entities index code · `399f631` track year enrichment timeout fix |
| **Data plane** | Neon Postgres (pooler) + welcome `SEARCH_UPSTREAM_BASE_URL` for `/api/search` only |
| **Homepage** | Poster-first; search **trigger only** (no inline typing on poster) |
| **Mobile search** | Fullscreen overlay drawer — **DONE v1** |

### Production smoke (curl, 2026-05-25)

| Route | HTTP | Notes |
|-------|------|--------|
| `/` | 200 | `home-search-trigger` present; poster shell intact |
| `/api/search/suggestions?q=supremes` | 200 | 30 grouped results; direct entity hrefs |
| `/api/search?q=madonna` | 200 | Monolithic search API (~4s cold-ish) |
| `/artist/the-supremes` | 200 | Artist exhibit |
| `/track/RVTR336241` | 200 | Thriller — healthy control (albums/cover) |
| `/track/RVTR898681` | 200 | Stand By Me — degraded (missing album join class) |
| `/ops`, `/api/events` | 404 | Not deployed (local-only) |
| `/api/healing/album-links` | 403 | Deployed route; disabled without control-center flag |

### Warm latency snapshot (production)

| Route | Typical |
|-------|---------|
| `/api/search/suggestions?q=supremes` | **~0.85–1.0s** (cold spikes ~2.5s) |
| `/api/search?q=madonna` | **~4s** |
| `/track/RVTR*` | **~0.5–1.5s** |
| `/artist/*` | **~2–3s** |

---

## Status board (current reality)

| Workstream | Status |
|------------|--------|
| Navigation integrity — Tier A / B1 / B2 | **DONE** — `e48fee9` → `a6fdf83` |
| Homepage mobile search overlay (drawer) | **DONE v1** — `b74f32c` → `384765a` |
| Overlay search perf/compositing pass | **DONE** — `384765a` |
| Songs section (v1) | **DONE** — locked |
| RV History on `/search` | **DONE** — locked |
| `/search` monolithic page | **LIVE interim** — do not extend |
| Search Intent Interceptor (full 3-step) | **LOCKED** — not built; overlay covers partial Step 1 only |
| Search Results Experience v1 polish | **PAUSED** |
| Album-link recovery audit | **DONE** code (`4c94d19`); healing writes not live on track pages |
| Feedback inbox | **OPS** — verify delivery periodically |
| Ops console / events / workflows | **LOCAL ONLY** — not on `main` |

---

## Locked public architecture (do not drift)

These are **live on production** and locked unless a new board entry explicitly approves change:

| Layer | Rule |
|-------|------|
| **Homepage** | Poster-first; no inline autocomplete on poster |
| **Search entry** | Hidden archive terminal — fullscreen overlay drawer |
| **Overlay search** | Deterministic grouped PG entities; lightweight payloads |
| **Overlay routing** | Direct `/artist`, `/track/RVTR`, `/album/RVAL`, `/rv/year` — **no `/search` handoff** |
| **Hydration split** | Overlay omits `coverUrl`; entity pages hydrate covers/albums/charts |
| **Canonical IDs** | RVTR / RVAL / artist slug routing preserved |
| **Track pages** | RVTR hydration from `canonical_track_display` + chart joins + album links when present |
| **Songs jukebox** | Locked v1 on `/search` |
| **RV History** | Locked on `/search` |

**Do not:** revert to inline homepage dropdown, add command-palette UI, or patch monolithic `/search` interpretation without board approval.

---

## Search architecture (two systems — critical split)

### A. Overlay search — **LIVE** (homepage mobile path)

**User flow:** Tap poster search → `HomeSearchOverlay` → type → grouped results → tap → entity page.

**API:** `GET /api/search/suggestions?q=`

**Pipeline:**

```
loadSuggestionResponse(q)
  → buildRvYearIntentSuggestions (year-only queries)
  → querySearchEntities(q, { mode: "overlay" })   // Neon PG only
  → entitiesToSuggestionGroups()
```

**Characteristics:**

- Deterministic SQL match rank + entity-type ordering (artist → album → track → year)
- Overlay caps (~30 results for `supremes` vs former ~82)
- No `buildSearchNormalization()` on hot path (`384765a`)
- No welcome upstream
- No cover hydration in payload (`coverUrl: null` intentional)
- `AbortSignal` on rapid typing
- Safari compositing fixes (`384765a`): opaque input, `color-scheme: only light` on overlay

**Implementation anchors:**

- `app/components/home-search-input.tsx`
- `app/components/home-search-overlay.tsx`
- `app/api/search/suggestions/route.ts`
- `lib/search/load-suggestion-response.ts`
- `lib/search/query-search-entities.ts`
- `lib/search/search-breadth.ts` (`overlaySearchEntityLimits`)

**Performance target:** ~100–250ms perceived (not consistently met on cold prod; see gaps).

### B. `/search` page — **LIVE interim** (deep dive, not homepage)

**API:** `GET /api/search?q=`

**Pipeline:**

```
buildSearchNormalization() → serial PG artist resolve
  → welcome SEARCH_UPSTREAM_BASE_URL /api/home-search
  → chart history enrichment
  → RV History + Songs panels
```

**Characteristics:**

- Monolithic; slower (~4s production)
- Still uses normalization + upstream
- **Not** part of homepage mobile interaction
- **Do not** add more interpretation/ranking logic here without interceptor approval

**Rule:** Overlay and `/search` are separate products. Document and debug them separately.

---

## Search Intent Interceptor — future lock (not current work)

**Approved architecture for a future phase** — not the same as overlay v1 (which already ships grouped candidates + tap-to-route).

| Step | Overlay v1 | Full interceptor |
|------|------------|------------------|
| 1 Grouped interpretation | **Shipped** | Polish + alias rules |
| 2 Explicit user choice | Partial (tap row) | Dedicated choice UX |
| 3 Immersive contextual results | Routes to entity pages | New results shell |

**Until explicitly approved:** no interceptor expansion, no `/search` monolith patches for alias/chronology fights.

**Chronology rule (entity pages):** first appearance date dominates inside artist/song/album experiences — unchanged.

---

## Known gaps (accurate as of audit)

### Search

- Cold suggestions often **>1s** (target was ~100–250ms perceived)
- **Production `search_entities` matview + `pg_trgm` apply unverified** — code supports matview; Neon apply must be run with real credentials (`npm run search:refresh-entities`)
- Duplicate artist aliases in overlay (e.g. `supremes` + `The Supremes`)
- Song rows show weak artist display strings (not always canonical display name)

### Track / album integrity

- **~56% album-link coverage** (audit class); degraded tracks correlate with missing `canonical_album_tracks`
- **Stand By Me** (`RVTR898681`) — wrong artist label (“David”), no cover; Thriller (`RVTR336241`) healthy control
- Healing API exists but **403 on prod** (control-center gated); no auto-heal on track page load

### Navigation / perf (unchanged)

- `fetchHomeSearch()` serial welcome hop on artist load
- `/artist/[slug]/charts` full payload ~2.5–3s
- B2 URL state client-hydrated only on charts subroute

### Ops

- Feedback inbox delivery path **not verified** (last test not recorded)

---

## Deployed vs local-only

### Deployed on production (`main`)

- Public site: home, artist, track, album, `/search`, `/charts`, `/rv/[year]`
- APIs: `/api/search`, `/api/search/suggestions`, `/api/charts/year`, `/api/healing/album-links` (gated 403)
- Tier A/B1/B2 navigation
- Album-link recovery **audit** code + CLI (`npm run track:audit-album-links`)
- `tools/sql/search_entities.sql` + `npm run search:refresh-entities` (ops apply to Neon)

### Local-only (untracked / not on `origin/main` — do not assume live)

| Path | Purpose |
|------|---------|
| `app/ops/`, `app/api/ops/*` | Ops console, year-match, media-sync |
| `app/api/internal/ops-auth`, `app/internal/ops-pin` | PIN gate |
| `components/ops/*` | Ops UI |
| `lib/ops/*` | Ops loaders, reconciliation |
| `middleware.ts` | Ops route protection (`RETROVERSE_OPS=1`) |
| `app/api/events/*`, `lib/events/*` | Historical events ingest |
| `lib/workflows/schema.sql` | Workflow tables draft (manual apply) |

**Production `/ops` returns 404.** Treat ops/events as parallel experiments until explicitly merged and deployed.

### Dev-gated on production (route exists, feature off)

| Route | Gate |
|-------|------|
| `/inspect` | `RETROVERSE_INSPECT=1` |
| `/control-center` | `RETROVERSE_CONTROL_CENTER=1` |
| `/api/healing/album-links` | `isControlCenterEnabled()` |

---

## Navigation integrity — Tier A / B1 / B2

| Tier | Status | Commit |
|------|--------|--------|
| **A** — loading shells, prefetch, RV session memory, song actions v1 | **DONE** | `e48fee9` |
| **B1** — persistent artist exhibit shell | **DONE** | `a2e1689` |
| **B2** — URL-addressable chart exhibit state | **DONE** | `a6fdf83` |

**B2 scope:** `/artist/[slug]/charts` only — `year`, `month`, `decade` query params. Main artist page chart preview remains session-only.

**Remaining continuity gaps:** B1 hero from PG not welcome; B2 no SSR pre-selection; mode nav pills incomplete; charts route still heavy.

---

## Production deployment — artist/track perf (`6dd8054`)

Historical pass — still relevant:

- React `cache()` on artist/track loaders
- Artist chart preview cap (400 on exhibit, 2000 on charts)
- `unstable_cache` on weekly chart rows
- Neon SSL in `lib/inspect/pg.ts`

| Asset | Result |
|-------|--------|
| `/artist/elton-john` HTML | ~74% smaller vs pre-pass |

---

## Songs stabilization — DONE (v1 locked)

Do **not** redesign Songs unless track pages, playlists, and mobile search are all stable (mobile search overlay v1 now shipped).

**Anchors:** `search-songs-jukebox-panel.tsx`, `songs-jukebox-reel.tsx`, `songs-jukebox.css`, `search.css`

---

## RV History on search — DONE (do not restyle)

Month-first, year modes, snapshots, Hot 100 / Album 200 sections — locked on `/search` only.

---

## Feedback inbox

**Address:** feedback@retroverse.live  
**UI:** poster hotspot mailto in `home-poster-frame.tsx`

| Field | Status |
|-------|--------|
| Last delivery test | _not recorded_ |
| Confirmed destination | _TBD_ |

---

## Next real priorities (single track)

**No redesign. No new search architecture. No interceptor expansion until explicitly approved.**

1. **Production search speed** — verify Neon `search_entities` + `pg_trgm` applied; measure cold/warm suggestions after apply
2. **iPhone Safari verification** — overlay compositing, typing, stale-fetch behavior (`384765a`)
3. **Album-link healing workflow** — use audit pipeline for degraded track class (Stand By Me); human-approved writes only
4. **Artist alias cleanup** — overlay dedupe/canonical display (`supremes` → `The Supremes`)
5. **Board + ops hygiene** — decide commit/deploy fate of local-only `/ops` and events (merge or shelve)

**Explicitly not next:** Search Intent Interceptor v2, `/search` monolith growth, command palette, AI systems, homepage redesign.

---

## Do not (current phase)

- Redesign homepage poster or overlay visual identity
- Reintroduce inline homepage autocomplete
- Add logic to monolithic `/search` without interceptor approval
- Touch Songs or RV History architecture/styling
- Assume `/ops` or `/api/events` are live
- Treat operating board as speculative memory — **update it when production changes**

---

## Related docs

- [RETROVERSE_PROJECT_CONTEXT.md](./RETROVERSE_PROJECT_CONTEXT.md)
- `.cursor/rules/retroverse-design.mdc`
- `.cursor/rules/retroverse-data.mdc`
