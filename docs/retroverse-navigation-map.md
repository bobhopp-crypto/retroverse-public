# Retroverse Navigation Map

**Date:** 2026-06-02  
**Production:** https://retroverse.live  
**Scope:** Deployed application — audit only (no redesign, no route changes)  
**Route count:** **33** Next.js page routes (+ 6 redirect-only behaviors, 1 in-page overlay)  
**Companion:** `docs/PUBLIC_NAVIGATION_MAP.md` (2026-05-27) — overlay interaction detail

---

## Summary

| Category | Count |
|----------|------:|
| Public discovery pages | 18 |
| Redirect pages (still routed) | 4 |
| Ops pages (PIN + `RETROVERSE_OPS=1`) | 9 |
| Dev / internal gates | 2 |
| **Total page files** | **33** |

**Primary route families:** Home · Search · Artist (+5 subroutes) · Album · Track · RV Year/Month/Week · Week Portal · Ops (+ cover review/backfill)

**Canonical entity IDs:** RVAR (artist) · RVAL (album) · RVTR (track)

---

## Phase 1 — Route inventory

### Home

**Route:** `/`  
**Purpose:** Archive directory board; primary entry; opens scoped search overlay (not a route change).  
**Entity:** None (discovery hub).  
**Inbound:** Exhibit footers (Home link); week portal footer; control-center; `/browse/*` redirect.  
**Outbound:** Search overlay → `/artist/*`, `/album/*`, `/track/*`, `/rv/*`; Charts pad → `/rv/1978`; scoped pads (Artists/Albums/Tracks) → overlay only; `/ops` if `RETROVERSE_OPS=1`; mailto feedback.  
**Related pages:** `/search` (parallel full-page search — not linked from home chrome).  
**Redirects:** `/browse/*` → `/`.  
**Dead ends:** Overlay closes → stays on `/` with query lost; no persistent search state on home.  
**Duplicate functionality:** Home overlay and `/search` both resolve entities; overlay is primary, `/search` is secondary.

---

### Search

**Route:** `/search?q=`  
**Purpose:** Full-page search with scoped result panels (artists, albums, songs, charts history).  
**Entity:** Query string (cross-entity).  
**Inbound:** Exhibit footers (all artist/album/track shells); RV chronology chrome; week portal footer; artist explore pills; control-center quick links.  
**Outbound:** `/` (topbar); entity cards → `/artist/*`, `/album/*`, `/track/*`; view-all songs → `/artist/[slug]/songs`; view-all albums → `/artist/[slug]#essential-albums` **(broken — anchor missing)**; charts panel → `/rv/1978` or embedded history; RV year entry → `/rv/1978`.  
**Related pages:** Home overlay (same resolution, different UX).  
**Redirects:** None.  
**Dead ends:** View-all albums lands on artist exhibit without scrolling to albums hub.  
**Duplicate functionality:** Overlaps home overlay entirely; also overlaps artist exhibit inline previews.

---

### Artist (Exhibit)

**Route:** `/artist/[slug]`  
**Purpose:** Primary artist discovery hub — curated singles, essential albums, chart activity, related artists, explore pills.  
**Entity:** RVAR (canonical artist slug).  
**Inbound:** Search results; home overlay; album/track artist links; related artist cards; `/artist/[slug]/tracks` redirect target is `/songs` not exhibit; exhibit footer self-link.  
**Outbound:** Nav pills → `/songs`, `/charts`, `/library`, `/explore`; inline → `/album/*`, `/track/*`, `/artist/[other]`; “All albums →” → `/albums`; view-all → `/related`, `/explore`; sparse state → `/search`, `/inspect`.  
**Related pages:** All artist subroutes share `ArtistExhibitShell` (same topbar + nav + footer).  
**Redirects:** None on exhibit itself.  
**Dead ends:** Sparse exhibit links to `/inspect` (dev-gated in production).  
**Duplicate functionality:** Exhibit previews overlap `/songs`, `/library`, `/albums`, `/charts` content at smaller scale.

---

### Artist Songs

**Route:** `/artist/[slug]/songs`  
**Purpose:** Canonical full song list for artist (performance/chart-sorted).  
**Entity:** RVAR + RVTR list.  
**Inbound:** Nav pill “Songs”; search “View all songs →”; exhibit “All songs →”; `/artist/[slug]/tracks` redirect.  
**Outbound:** `/track/*`; SongActions component → artist, RV year, charts paths (context-dependent).  
**Related pages:** Exhibit singles preview; `/tracks` (legacy alias).  
**Redirects:** `/artist/[slug]/tracks` → `/songs`.  
**Dead ends:** Disabled play/queue buttons (UX dead end, not a route).  
**Duplicate functionality:** Same songs visible on exhibit (truncated) and search jukebox panel.

---

### Artist Albums

**Route:** `/artist/[slug]/albums`  
**Purpose:** Full chronological discography grid.  
**Entity:** RVAR + RVAL list.  
**Inbound:** Exhibit footer “All albums →” only — **not in nav pills**.  
**Outbound:** `/album/*`.  
**Related pages:** `/library` (Collected — same album tiles, different framing); exhibit album shelf (truncated).  
**Redirects:** None.  
**Dead ends:** Weak inbound — easy to miss.  
**Duplicate functionality:** Near-duplicate of `/library` album grid; overlaps exhibit album shelf.

---

### Artist Charts

**Route:** `/artist/[slug]/charts`  
**Purpose:** Artist-scoped chart history drill (year → month → week cards).  
**Entity:** RVAR + chart timeline.  
**Inbound:** Nav pill “Charts”; artist chart activity “View all” (when present).  
**Outbound:** Week cards → `/album/*`, `/track/*` (when IDs resolve); `/rv/{y}/{m}/{week}` via embedded `ArtistChartsHistoryClient`; year/month navigation within client.  
**Related pages:** `/years` (display-only decades); RV chronology (global, not artist-scoped).  
**Redirects:** None.  
**Dead ends:** None major — strong outbound to entities.  
**Duplicate functionality:** Overlaps RV month drill UI (`ArtistChartsHistoryClient` reused on `/rv/[year]/[month]`).

---

### Artist Library (Collected)

**Route:** `/artist/[slug]/library`  
**Purpose:** “Collected recordings” — album grid from library ownership data.  
**Entity:** RVAR + owned RVAL set.  
**Inbound:** Nav pill “Collected”.  
**Outbound:** `/album/*`.  
**Related pages:** `/albums` (full discography — often same tiles).  
**Redirects:** None.  
**Dead ends:** Placeholder if no library tracks.  
**Duplicate functionality:** **HIGH overlap with `/albums`** — two album browsers for same artist.

---

### Artist Explore / Related / Years (secondary)

| Route | Purpose | Inbound | Outbound | Notes |
|-------|---------|---------|----------|-------|
| `/artist/[slug]/explore` | Data-driven explore pills | Nav “More”; exhibit view-all | External/data hrefs, `/search`, `/inspect`, `/rv/*` | Orphan content duplicated on exhibit |
| `/artist/[slug]/related` | Related artist cards | Exhibit view-all only | `/artist/[other]` | Not in nav pills |
| `/artist/[slug]/years` | Chart decades bar chart | Exhibit view-all only | **None to `/rv/*`** | Display dead end |

---

### Album

**Route:** `/album/[id]` (RVAL or slug)  
**Purpose:** Album exhibit — cover, tracklist, chart year link.  
**Entity:** RVAL.  
**Inbound:** Artist shelves; search; RV/week chart cards; track “Appears on”; related navigation.  
**Outbound:** `/` (topbar); `/artist/[slug]`; `/track/*` (tracklist); optional `/rv/[year]` (chart year); footer → `/`, `/search`, `/artist/[slug]`.  
**Related pages:** Track pages; artist hubs.  
**Redirects:** None.  
**Dead ends:** Sparse albums have minimal outbound beyond footer.  
**Duplicate functionality:** None major.

---

### Track

**Route:** `/track/[id]` (RVTR or slug)  
**Purpose:** Track exhibit — cover, albums, chart trajectory, related songs.  
**Entity:** RVTR.  
**Inbound:** Artist songs; search; album tracklist; RV/week chart cards; week portal row clicks; related tracks.  
**Outbound:** `/` (topbar); `/artist/[slug]`; `/album/*`; `/track/*` (related); `/rv/[year]` (chart year header); **`/week/[date]`** (chart run rail → neighborhood portal); footer → `/`, `/search`, `/artist/[slug]`.  
**Related pages:** Week portal; artist songs; album tracklist.  
**Redirects:** None.  
**Dead ends:** Sparse tracks — footer only.  
**Duplicate functionality:** Chart history on track overlaps artist charts and RV week views.

---

### RV Year

**Route:** `/rv/[year]`  
**Purpose:** Canonical public chronology — year overview, month cards, notable chart weeks.  
**Entity:** Calendar year (Billboard chart universe).  
**Inbound:** Home Charts pad (`/rv/1978`); home overlay year queries; search RV panels; `/charts` redirect; album/track chart year links; week portal “{year} chronicle”; control-center year links.  
**Outbound:** `/rv/[year±1]` (year nav); `/rv/[year]/[month]`; `/rv/[year]/[month]/[week]`; footer → `/`, `/search?q=[year]`.  
**Related pages:** Artist charts (artist-scoped); week portal.  
**Redirects:** `/charts?year=` → matching `/rv/...` (default `/rv/1978`).  
**Dead ends:** None — hub for chronology.  
**Duplicate functionality:** Global chronology vs artist `/charts` — same drill component, different scope.

---

### RV Month

**Route:** `/rv/[year]/[month]`  
**Purpose:** Month drill within year — `ArtistChartsHistoryClient` with month pre-selected.  
**Entity:** Year + month index.  
**Inbound:** RV year month cards; `/charts?year=&month=` redirect; year nav within chronology chrome.  
**Outbound:** `/rv/[year]/[other-month]` (month pills); week cards → `/album/*`, `/track/*`; `/rv/[year]/[month]/[week]`; shared chrome → `/`, `/search`.  
**Related pages:** Artist `/charts`; RV week.  
**Redirects:** Via `/charts` legacy query.  
**Dead ends:** None major.  
**Duplicate functionality:** Same UI component as artist charts page.

---

### RV Week

**Route:** `/rv/[year]/[month]/[week]` where `week` = `YYYY-MM-DD`  
**Purpose:** Deep-linked chart week within RV chronology (highlight date).  
**Entity:** Chart issue date.  
**Inbound:** RV year notable rows; month week cards; `/charts?year=&month=&week=` redirect; week portal “Open full week →”.  
**Outbound:** Same drill UI → `/album/*`, `/track/*`; chronology chrome navigation.  
**Related pages:** `/week/[date]` portal (parallel).  
**Redirects:** Legacy `/charts` query.  
**Dead ends:** Invalid week/month → 404.  
**Duplicate functionality:** **Parallel to `/week/[date]`** — full chronology vs focused neighborhood.

---

### Week Portal

**Route:** `/week/[date]?focus=&rank=`  
**Purpose:** Chart neighborhood portal — “what surrounded this song?” focused slice around one chart position.  
**Entity:** Chart issue date + focus track (RVTR).  
**Inbound:** **Only** track chart-run rail (`TrackChartRunRail` → `chartWeekPortalHref`).  
**Outbound:** `/` (topbar + footer); `/search`; `/track/*` (“Back to song”); `/rv/[year]` (“{year} chronicle”); **`/rv/[year]/[month]/[date]`** (“Open full week →”); in-page refocus (same route, new query).  
**Related pages:** RV week; track exhibit.  
**Redirects:** None.  
**Dead ends:** No inbound from RV chronology (one-way bridge).  
**Duplicate functionality:** Week content overlaps `/rv/.../week` but UX is narrower (neighborhood vs full chronology shell).

---

### Ops

**Route:** `/ops`  
**Purpose:** Internal operations hub — year match, acquisition, refresh dashboards.  
**Entity:** Ops year workspace (default year from data).  
**Inbound:** Home “Archive Ops” link (when `RETROVERSE_OPS=1`); direct URL.  
**Outbound:** `/ops/media-sync`, `/ops/year/[year]`, `/ops/rvtags-review/[year]`, `/ops/acquisition`, `/ops/healing`, `/ops/review/covers`, `/ops/covers/backfill`, `/ops/covers/corrections`.  
**Related pages:** All `/ops/*`; `/internal/ops-pin` gate.  
**Redirects:** Unauthed `/ops/*` → `/internal/ops-pin?next=...`; **`RETROVERSE_OPS≠1` → middleware 404 on production**.  
**Dead ends:** `/ops/covers/embed` exists but not linked from hub.  
**Duplicate functionality:** None.

---

### Cover Review

**Route:** `/ops/review/covers?tab=integrity|acquire`  
**Purpose:** Cover integrity review workbench + acquire training batch tabs.  
**Entity:** RVAL batch rows.  
**Inbound:** Ops hub “cover review”; redirects from `/ops/covers`, `/ops/covers/train`.  
**Outbound:** `/ops` (implicit via chrome); corrections cross-tab; API routes for retrain/advance-batch.  
**Related pages:** `/ops/covers/corrections`; `/ops/covers/backfill`.  
**Redirects:** `/ops/covers` → here; `/ops/covers/train` → here.  
**Dead ends:** None within ops loop.  
**Duplicate functionality:** Absorbed former `/ops/covers/train` route.

---

### Cover Backfill

**Route:** `/ops/covers/backfill`  
**Purpose:** Safe cover acquisition backfill dashboard (queue state, run controls).  
**Entity:** RVAL acquisition queue.  
**Inbound:** Ops hub “cover backfill”.  
**Outbound:** `/ops`; polls `/api/ops/covers/backfill/status`.  
**Related pages:** Cover review (acquire tab).  
**Redirects:** None.  
**Dead ends:** None.  
**Duplicate functionality:** Acquire tab in review vs backfill dashboard — related but distinct ops surfaces.

---

## Secondary routes (appendix)

| Route | Purpose | Notes |
|-------|---------|-------|
| `/artist/[slug]/tracks` | Redirect | → `/songs` |
| `/charts` | Redirect | → `/rv/*` via query |
| `/browse/*` | Redirect | → `/` (next.config) |
| `/ops/covers` | Redirect | → `/ops/review/covers` |
| `/ops/covers/train` | Redirect | → `/ops/review/covers` |
| `/ops/covers/corrections` | Cover fix workbench | Links to stale `/ops/covers/train` |
| `/ops/covers/embed` | Iframe embed | Unlinked from hub |
| `/ops/healing` | Healing review | Linked from ops |
| `/ops/acquisition` | Acquisition console | Linked from ops |
| `/ops/media-sync` | Media sync review | Linked from ops |
| `/ops/year/[year]` | Year workspace | Linked from ops |
| `/ops/rvtags-review/[year]` | RV tags review | Linked from ops |
| `/internal/ops-pin` | PIN gate | Middleware redirect target |
| `/inspect` | Graph inspect | Dev / `RETROVERSE_INSPECT` |
| `/control-center` | Route catalog dev tool | Dev / `RETROVERSE_CONTROL_CENTER` |

---

## Redirects summary

| From | To | Mechanism |
|------|-----|-----------|
| `/browse/*` | `/` | next.config redirects |
| `/charts?year&month&week` | `/rv/...` | page redirect |
| `/artist/[slug]/tracks` | `/artist/[slug]/songs` | page redirect |
| `/ops/covers` | `/ops/review/covers` | page redirect |
| `/ops/covers/train` | `/ops/review/covers` | page redirect |
| `/ops/*` (no PIN) | `/internal/ops-pin?next=` | middleware |
| `/ops/*` (ops disabled) | 404 | middleware |

---

## Phase 2 — Visual map

See **`docs/retroverse-navigation-map.svg`**

Shows hierarchical route tree, directional flows, return loops (Home ↔ Search ↔ Entity), and multi-entry nodes (Artist, RV Year, Search reachable from 4+ surfaces).

---

## Phase 3 — Navigation problems

### HIGH

| # | Problem | Evidence |
|---|---------|----------|
| H1 | **Home bypasses `/search`** | Primary discovery is overlay; `/search` only in footers |
| H2 | **Broken “View all albums” anchor** | `#essential-albums` in `search-view-all-hrefs.ts`; artist page uses `#artist-albums-hub` |
| H3 | **Library vs Albums duplicate** | Two nav-adjacent album browsers; `/albums` not in pills |
| H4 | **Dual week routes** | `/week/[date]` portal vs `/rv/.../week`; one-way link (portal → RV only) |
| H5 | **Orphan artist subroutes** | `/albums`, `/related`, `/years` lack nav pills |

### MEDIUM

| # | Problem | Evidence |
|---|---------|----------|
| M1 | **Inconsistent “All” buttons** | Exhibit “All albums →” goes to route; search view-all albums goes to broken hash; charts “View all” varies |
| M2 | **Search replaces browsing** | Home pads open overlay instead of artist/album browse surfaces (removed `/browse/*`) |
| M3 | **Artist charts vs RV chronology** | Same component, two contexts — user may not know which is “canonical” for weeks |
| M4 | **Legacy `/charts` shell** | Redirect-only page; dead UI artifacts in codebase |
| M5 | **Ops corrections stale link** | Points to `/ops/covers/train` → redirect to review |
| M6 | **`/years` dead end** | Chart decades with no link to `/rv/[year]` or `/charts` |

### LOW

| # | Problem | Evidence |
|---|---------|----------|
| L1 | **`/tracks` naming persistence** | Redirect exists but “tracks” label in home pad vs “songs” route |
| L2 | **`/browse/*` bookmarks** | Redirect home with no explanation |
| L3 | **Disabled play buttons** | SongActions dead-end affordance |
| L4 | **Dev routes in sparse paths** | `/inspect` linked from empty artist exhibit |
| L5 | **Ops embed unlinked** | `/ops/covers/embed` orphan |

---

## Phase 4 — Entity flow analysis

### Track flow

```
/track/[id]
  → /artist/[slug]          (hero artist link, footer)
  → /album/[id]             (“Appears on”)
  → /track/[other]          (related recordings)
  → /rv/[year]              (chart year header link)
  → /week/[date]?focus=     (chart run rail — neighborhood portal)
       → /week/[date]       (refocus other rows — in-page loop)
       → /rv/y/m/date       (“Open full week”)
       → /track/[id]        (“Back to song”)
       → /album/[id]        (row links when resolved)
       → /track/[id]        (row links — re-entry loop)
```

### Artist flow

```
/artist/[slug]  (exhibit)
  → /artist/[slug]/songs    (nav · “All songs” · search view-all)
       → /track/[id]
  → /artist/[slug]/albums   (exhibit footer only)
       → /album/[id]
  → /artist/[slug]/library  (nav “Collected”)
       → /album/[id]        (duplicate path to same albums)
  → /artist/[slug]/charts   (nav)
       → /album/[id] | /track/[id] | /rv/y/m/w
  → /artist/[other]         (related cards)
```

### Chronology flow

```
/  or  /search  or  /charts?...
  → /rv/[year]
       → /rv/[year]/[month]
            → /rv/[year]/[month]/[week-date]
                 → /album/[id] | /track/[id]

Parallel entry (track only):
/track/[id] → /week/[date] → /rv/.../week → /album | /track
```

### Ops flow

```
/ops  (PIN gate via /internal/ops-pin)
  → /ops/review/covers      (integrity + acquire tabs)
  → /ops/covers/backfill    (acquisition queue dashboard)
  → /ops/covers/corrections (links back to train → review redirect)
  → /ops/healing | /ops/acquisition | /ops/media-sync | /ops/year/* | /ops/rvtags-review/*
```

### Search loop (discovery core)

```
/  → overlay → entity → footer Search → /search?q= → entity → footer Home → /
                     ↑__________________________________________|
                              (repeat loop)
```

---

## Phase 5 — Recommendations (do not implement)

### 1. What is confusing?

- Two search surfaces (overlay vs `/search`) with no explicit relationship on home.
- Two album browsers per artist (Collected vs full Albums page).
- Two week experiences (`/week` portal vs `/rv/.../week`) without reciprocal linking.
- Nav pills hide `/albums`, `/related`, `/years` but exhibit still links to them.
- “Tracks” language on home vs “Songs” in routes.

### 2. What duplicates exist?

| Duplicate | Routes / surfaces |
|-----------|-------------------|
| Search | Home overlay + `/search` |
| Artist songs | Exhibit singles + `/songs` + search jukebox |
| Artist albums | Exhibit shelf + `/albums` + `/library` |
| Chart week | `/week/[date]` + `/rv/.../week` + artist `/charts` week cards |
| Chart drill UI | Artist `/charts` + RV `/[year]/[month]` |
| Cover ops | Review acquire tab + backfill dashboard |

### 3. Primary route family

**Entity exhibits:** `/artist` · `/album` · `/track` — canonical graph nodes (RVAR/RVAL/RVTR).

### 4. Secondary route family

**RV chronology:** `/rv/[year]/...` — canonical time navigation; should absorb legacy `/charts` and eventually clarify relationship to `/week` portal.

### 5. What can be simplified?

| Priority | Recommendation |
|----------|----------------|
| **P0** | Fix search view-all albums anchor (`#artist-albums-hub`) |
| **P1** | Merge or clearly label Library vs Albums (one discography route) |
| **P2** | Unify week UX: cross-link RV week ↔ portal, or deprecate portal |
| **P3** | Nav pills: expose Albums OR drop `/albums` route in favor of library |
| **P4** | Fold `/years` into Charts or link decades → `/rv/[year]` |
| **P5** | Home: acknowledge `/search` explicitly or document overlay-only model |
| **P6** | Ops: corrections → `/ops/review/covers` directly |
| **P7** | Remove dead `/charts` UI code; keep redirect |

---

## Multi-entry nodes (reachable from many places)

| Page | Entry count | Sources |
|------|------------:|---------|
| `/artist/[slug]` | 6+ | Search, overlay, album, track, related, footer |
| `/search` | 5+ | All exhibit footers, RV chrome, week portal, explore |
| `/rv/[year]` | 5+ | Home pad, overlay, search, `/charts`, track/album chart links |
| `/album/[id]` | 5+ | Artist shelves, search, track, RV/week cards |
| `/track/[id]` | 5+ | Artist songs, search, album, RV/week, related |
| `/` | 4+ | Footers, week portal, redirects, topbars |

---

*Audit complete. No routes, UI, or code changed.*
