# Retroverse Project Context

**Purpose:** Onboarding and alignment for humans and AI agents working on Retroverse.  
**Scope:** Grounded in the current repo layout (May 2026). Do not treat this file as a product spec for unbuilt features.

**Related guidance:** `.cursor/rules/retroverse-design.mdc`, `.cursor/rules/retroverse-data.mdc`  
**Live priorities:** [RETROVERSE_OPERATING_BOARD.md](./RETROVERSE_OPERATING_BOARD.md)

---

## 1. What Retroverse Is

Retroverse is a **music discovery experience** built on a **canonical music graph**—not a generic streaming catalog or admin database.

It connects:

- **Historical chart truth** (Hot 100, Billboard 200 context)
- **Canonical artist / album / track identity** (stable Retroverse IDs)
- **Operational DJ reality** (VirtualDJ library, cues, play history, local media paths)
- **Editorial surfaces** (album dossiers, RetroScope, track deck, illustrated landing)

The public site ([retroverse.live](https://retroverse.live)) should feel like exploring a **collectible, poster-like world** of music history. The full application lives in a separate, heavier codebase that owns data, graph tooling, and most routes.

**Bob’s operational truth (workflow):** VirtualDJ tags, the VDJ database, and local MP4/media tags are what you actually play. The website is a **view and experience layer** driven by exports, Postgres graph tables, dossier JSON, and curated pipelines—not a replacement for the DJ library.

---

## 2. Current Architecture

### Two-repo split (intentional)

| Layer | Repo / app | Role |
|-------|------------|------|
| **Public face** | `RETROVERSE_PUBLIC` (`retroverse-public`) | Thin Next.js 15 app: illustrated homepage, `/search` UI, search API **proxy** |
| **Canonical app + data** | `retroverse-welcome` under `RETROVERSE_v2/apps/` | Full Next.js 16 app: entity pages, home-search API, RetroScope, track-deck, integrity console, ingest scripts, local Postgres + Supabase |

There is **no monorepo** tying them at the filesystem root; they coordinate via HTTP and shared conventions (canonical IDs, panel-shaped search JSON).

### RETROVERSE_PUBLIC (this repo)

- **Stack:** Next.js 15, React 19, TypeScript—minimal dependencies.
- **Routes today:** `/` (poster landing), `/search` (discovery UI), `/api/search` (proxy).
- **Home:** Single illustrated poster (`public/retroverse-home.png`) with hotspot overlays; live search input routes into search flow.
- **Search path:** Browser → `GET /api/search?q=…` → upstream `GET /api/home-search?q=…` on `retroverse-welcome` → `mapHomeSearchToPanels` → horizontal panel UI.
- **Config:** `SEARCH_UPSTREAM_BASE_URL` (see `.env.example`) points at the welcome dev server (default `http://localhost:3000`).
- **Deploy:** README describes Vercel deploy of this repo for the public domain.

### retroverse-welcome (canonical app)

- **Stack:** Next.js 16, React 19, Tailwind 4, Postgres (`pg`, `better-sqlite3`), Supabase client, large `scripts/` and `integrity_console/sql/` surface.
- **Data sources (home-search, documented in `docs/search_local_infra.md`):**
  - **Local Postgres** (`retroverse` DB, `RETROVERSE_PG_*`): preferred for **track** corpus via `canonical_track_display` and graph expansion.
  - **Supabase REST:** artists and albums panels; optional RVTR fallback when graph paths are thin.
  - **Dossier / universe JSON:** album and artist fallbacks and enrichment.
  - **Hot 100 exports:** chart-week and track panels merged with corpus results.
- **Search API:** `lib/home-search` → `app/api/home-search/route.ts`.
- **Entity routes:** `/artists/[RVAR…]`, `/albums/[RVAL…]`, `/tracks/[RVTR…]` (with legacy slug fallbacks in `lib/retroverse-routes.ts`).
- **Product areas (non-exhaustive):** RetroScope (`/album-retroscope`), track-deck / charts, album dossiers, portal/curator ops (internal), integrity viewer, VDJ ingest scripts.

### Identity layers (welcome / integrity console)

Documented in `integrity_console/README.md`:

| Layer | Authority |
|-------|-----------|
| Canonical graph (Postgres) | What the song **is** in history—tracks, families, albums, charts |
| VirtualDJ `database.xml` | What you **play**—paths, cues, last played—not canonical identity |
| R2 / thumbnails | Presentation and edge delivery |
| YouTube links | Enrichment only—never replaces canonical tracks |

Linkage tables bridge layers; they do not merge operational files into canonical rows casually.

---

## 3. RETROVERSE_PUBLIC vs retroverse-welcome

| | **RETROVERSE_PUBLIC** | **retroverse-welcome** |
|---|----------------------|------------------------|
| **Audience** | Internet landing + search entry | Full Retroverse product and ops |
| **Size** | Small (~35 source files) | Large (routes, scripts, SQL, data assets) |
| **Search logic** | Proxy + **panel mapping** only (`lib/search/map-home-search.ts`, ordering, display format) | **Resolution, ranking, expansion** (`lib/home-search/*`) |
| **Database** | None in-repo | Local Postgres + Supabase + file exports |
| **Entity pages** | Links out via `href` from search results (to welcome URLs when upstream returns canonical hrefs) | Owns dossiers, graphs, RetroScope, playback resolve APIs |
| **Visual system** | Poster homepage + search CSS tuned for public discovery | Broader app chrome, dossiers, retroscope, ops UIs |
| **When developing search end-to-end** | Run **both**: welcome on :3000 (or set upstream URL), public on another port with `SEARCH_UPSTREAM_BASE_URL` | Required for real results; mock panels exist in public for offline UI only |

**Rule of thumb:** If it changes *what* is found or *how* the graph expands, it belongs in **welcome**. If it changes *how the public site looks* or *how panels are framed*, it belongs in **PUBLIC**—but avoid duplicating ranking or corpus logic in PUBLIC.

---

## 4. Canonical Entity System (RVAR / RVAL / RVTR)

Retroverse uses **six-digit suffix** external keys (assigned deterministically in pipelines—see welcome scripts such as `repair_missing_album_external_keys.ts`):

| Prefix | Entity | Typical route |
|--------|--------|----------------|
| **RVAR** | Artist | `/artists/RVAR######` |
| **RVAL** | Album | `/albums/RVAL######` |
| **RVTR** | Track | `/tracks/RVTR######` |

**Regex in app code:** `^RVAR\d{6}$`, `^RVAL\d{6}$`, `^RVTR\d{6}$` (case-insensitive), enforced in `lib/retroverse-routes.ts` on the welcome side.

**Rules:**

- Once resolved in search or navigation, **do not discard** canonical IDs for display-only slugs.
- Legacy **title/name slugs** remain fallbacks when an ID is missing—prefer migrating links to canonical hrefs.
- Artwork and storage paths often namespace under `retroverse/covers/RVAL…/` (see welcome `supabase/ARTWORK_ARCHITECTURE.md`).

Search results should emit `href` values that use these IDs when the upstream payload includes them (home-search builds hrefs via `hrefForArtist`, `hrefForAlbum`, `hrefForTrack`).

---

## 5. Search Philosophy

Search is **graph-first discovery**, not keyword soup.

### Resolution order (welcome `lib/home-search`)

1. **Resolve a canonical anchor** when the query looks artist-first or matches a primary artist/album (corpus filters, `pickPrimaryCanonicalArtist`, exact Supabase artist match).
2. **Expand the connected universe**—albums, tracks, chart weeks, Hot 100 rows, dossier fallbacks (`expand-artist-universe.ts`, graph track loaders).
3. **Merge and rank** with deterministic scores (`textMatchScore`, chart peak, album rank helpers)—then **panel limits** (`HOME_SEARCH_PANEL_LIMIT`).
4. **Degrade gracefully:** `incomplete: true` when Supabase or a loader fails; tracks can still serve from **local graph** while PostgREST is unhealthy (`supabase-gate`, `search_local_infra.md`).

### PUBLIC search layer

- Does **not** implement corpus logic.
- Normalizes upstream JSON (`normalizeHomeSearchPayload`), orders panels (`order-panels`), formats display strings, assigns accent colors for cards.
- Client: debounced fetch with abort (`use-search-query`, `fetch-search.ts`).

### What search should feel like

Immediate, rich, horizontal **shelves** of artists, albums, tracks, and chart context—like flipping through a record store wall, not running SQL.

### What to avoid

Broad fuzzy scans, duplicate entities in panels, orphaned tracks with no graph link, alphabetical-only ordering for “best” results, blocking the UI on a single dead upstream.

---

## 6. Visual Identity

Retroverse is **not** modern SaaS UI. See `.cursor/rules/retroverse-design.mdc` for agent-enforced rules.

**Should feel:** tactile, playful, illustrated, colorful, editorial, collectible, poster-like, retro-futurist, hand-crafted.

**Palette cues (observed in public search mapping):** teal (`#0d6e7a`), orange/red highlights (`#e85d1a`, `#b83d2a`), warm accents on cream/paper backgrounds.

**Components:** fixed-geometry cards, thick visual edges, oversized artwork, horizontal scrolling panels (“collectible shelves”), large readable type, strong section separation.

**Avoid:** gray dashboards, glassmorphism, tiny metadata captions, generic Tailwind admin layouts, layout jump, heavy animation.

The **PUBLIC homepage** is literally an interactive poster image with hotspots—not a component grid landing page.

---

## 7. Mobile-First Philosophy

Retroverse is browsed on phones as much as desktops.

**Prioritize:**

- Thumb-friendly hotspots and search input on the poster
- Horizontal panel scroll on search (one hand, discoverable overflow)
- Large touch targets and readable type without zoom
- Stable layout (no reflow jumps when results load)

**Avoid:** hover-only affordances, dense tables, microcopy-only navigation.

---

## 8. Current Priorities

Derived from active work in both repos (May 2026)—priorities shift; verify `git status` and recent docs in welcome.

**RETROVERSE_PUBLIC**

- Wire **live search** on the public poster through to `/search` and upstream home-search.
- Polish **search panel UX** (discover cards, header, ordering, empty states) without reimplementing corpus logic.
- Keep the **poster landing** stable while search matures.
- Placeholder hotspots (e.g. charts, browse albums) are not full product routes yet—do not assume they are implemented on PUBLIC alone.

**retroverse-welcome**

- **Home-search reliability:** local graph first, Supabase gate, artist universe expansion, cover URL attachment.
- **VDJ track instances / cues** (migrations and ingest scripts in flight).
- **RetroScope and track-deck** stabilization (recovery docs under `docs/retroscope_*`).
- **Graph integrity:** canonical album sequences, RVTR backfills, bridge RVAL dossiers to Postgres (`integrity_console/sql`).

**Cross-cutting**

- Run welcome locally when testing PUBLIC search (`curl` smoke test in `search_local_infra.md`).
- Preserve canonical hrefs end-to-end from search → entity pages on welcome.

---

## 9. Things Retroverse Should NEVER Become

- A **generic music database admin** or CRUD console for casual editing of canonical rows
- A **keyword search engine** that returns unrelated metadata matches
- A **Spotify clone** optimized for infinite gray scroll and algorithmic feeds
- **SaaS dashboard UI** (glass cards, monochrome enterprise chrome, fintech minimalism)
- A system where **VirtualDJ paths** overwrite canonical `track_id` or chart facts
- A product that **blocks discovery** on Supabase uptime when local graph can answer
- **Duplicate entity soup** (same song three ways with no `RVTR`)
- **Silent graph mutation**—ranking hacks, unreviewed merges, or overwriting chart history

---

## 10. Current Known Strengths

- **Clear canonical ID scheme** (RVAR/RVAL/RVTR) wired into routes and search hrefs on welcome.
- **Artist-first expansion** when the query resolves to a canonical artist—albums, tracks, and charts fan out from one anchor.
- **Layered search stack:** local Postgres track display + Supabase + dossier/Hot100 fallbacks with merge/dedupe patterns.
- **Separation of concerns:** PUBLIC can iterate on poster + panel UX without forking graph logic.
- **Integrity and ingest tooling** in welcome (SQL phases, VDJ parse/ingest scripts, review flags)—supports explainable pipelines.
- **Emotional landing:** illustrated poster sets tone immediately; search accents align with retro palette.
- **Operational clarity** in docs (`search_local_infra.md`, structural audit) about which app and DB to use.

---

## 11. Current Known Weak Spots

- **Two-repo coordination:** PUBLIC search is empty or 502 if welcome is not running or `SEARCH_UPSTREAM_BASE_URL` is wrong.
- **Dual corpora:** local Postgres album/track counts vs Supabase dossier universe—not always 1:1 (see welcome `docs/retroverse_album_coverage_audit.md`).
- **Partial search:** `incomplete` flag when Supabase PostgREST or a loader fails—artists/albums may thin out while tracks persist.
- **PUBLIC placeholders:** chart/browse hotspots on the poster are not full routed features in this repo alone.
- **Legacy slugs:** still exist alongside canonical IDs; mixed hrefs can confuse deep links until backfill completes.
- **Repo clutter in RETROVERSE_v2:** stale `retroverse-welcome-clean*` clones—use **only** `apps/retroverse-welcome` for canonical dev (per structural audit).
- **Weight of welcome:** large `node_modules`, data folders, and script surface—higher barrier for agents that only open PUBLIC.

---

## 12. Long-Term Vision

Retroverse aims to be the **definitive exploratory front door** to Bob’s music universe:

- You search **one name** and walk through **albums, tracks, chart moments, and media ownership** as one connected story.
- Every surface reinforces **canonical identity** while respecting **what you actually DJ** (VDJ) as operational truth.
- The **public site** stays fast, emotional, and mobile-native; the **welcome app** stays the deep graph, tooling, and playback bridge.
- Enrichment is **additive and traceable**—better artwork, sequences, cues, thumbnails—without rewriting chart history or splintering IDs.
- RetroScope, track-deck, and dossiers mature into a coherent **“time is not a list—it’s a place”** experience, not a feature checklist.

This vision is implemented incrementally through small components, stable visual systems, and graph pipelines—not big-bang rewrites.

---

## Quick Reference for AI Agents

| Task | Where to work |
|------|----------------|
| Ranking, artist expansion, Supabase/Postgres queries | `retroverse-welcome/lib/home-search/` |
| Public search UI / poster / panel layout | `RETROVERSE_PUBLIC/app/`, `RETROVERSE_PUBLIC/lib/search/` (mapping only) |
| Canonical routes / href builders | `retroverse-welcome/lib/retroverse-routes.ts` |
| Local search smoke test | welcome: `curl localhost:3000/api/home-search?q=…` |
| Design constraints | `.cursor/rules/retroverse-design.mdc` |
| Data constraints | `.cursor/rules/retroverse-data.mdc` |
| Status / priorities / Songs v1 lock | `docs/RETROVERSE_OPERATING_BOARD.md` |

**Do not invent** APIs, tables, or deploy pipelines not present in the repo. Read `package.json`, `app/api/*`, and welcome `docs/search_local_infra.md` before changing behavior.
