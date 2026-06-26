# Retroverse 2.0 — Consolidation Audit

**Date:** 2026-06-23  
**Role:** Product Architect (audit only — no routes built, nothing deleted)  
**Question answered:** *If Retroverse were rebuilt from scratch today using only what exists already, which pages would survive?*

---

## Executive Summary

Retroverse currently runs **four parallel public song experiences** (`/retroverse-2/song`, `/track`, `/rvtr/.../song-sheet`, `/rvtr/.../deck`) and **three live entry surfaces** (`/live`, `/sunday-nights`, `/retroverse-2/live`) that collapse to one when the channel is active. The canonical graph and RVTR identity are sound; the patron-facing product is fragmented by route age, not by data.

**Recommended canon (5 public surfaces):**

| Surface | Route | Status today |
|---------|-------|--------------|
| Home / browse | `/` | Exists — HomeDirectory |
| Song | `/retroverse-2/song/[rvtr]` | Exists — best mobile UX, YouTube CTA, live follower |
| Live (active) | Same song route + auto-advance | Partially wired — redirect works locally, prod needs deploy + Start Live |
| Search | `/search` | Exists — but song results still land on `/track/` |
| Artist | `/artist/[slug]` | Exists — strong exhibit, links out to legacy track routes |
| Year | `/rv/[year]` (+ month/week) | Exists — chart chronology hub |

**Everything else public should be treated as legacy** until redirects are updated: `/track/`, `/rvtr/.../song-sheet`, `/rvtr/.../deck`, cream `/live`, editorial `/sunday-nights`, and the RV2 live hub when it is not the active channel.

Top blocker: **search and entity-routes still resolve songs to `/track/`**, so the canonical song experience is bypassed on the most common discovery path.

---

## 1. Route Inventory

Classification key:

- **CANON** — should remain the official public experience
- **LEGACY** — superseded duplicate; keep running, mark for redirect
- **OPS** — internal tooling (PIN-gated when `RETROVERSE_OPS=1`)
- **UNKNOWN** — public but dev-gated or ambiguous role

### Public discovery & graph

| Route | Class | Notes |
|-------|-------|-------|
| `/` | **CANON** | HomeDirectory browse; redirects to live song when channel active |
| `/search` | **CANON** | Full search UI; song hrefs resolve to `/track/` (legacy leak) |
| `/artist/[slug]` | **CANON** | Primary artist exhibit |
| `/artist/[slug]/songs` | **CANON** | Charted songs list |
| `/artist/[slug]/albums` | **CANON** | Album shelf |
| `/artist/[slug]/years` | **CANON** | Decade/year activity |
| `/artist/[slug]/charts` | **CANON** | Chart history deep view |
| `/artist/[slug]/related` | **CANON** | Related artists |
| `/artist/[slug]/library` | **CANON** | Collected recordings (sparse data OK) |
| `/artist/[slug]/explore` | **CANON** | External/archive links |
| `/artist/[slug]/tracks` | **LEGACY** | Redirects → `/artist/[slug]/songs` |
| `/album/[id]` | **CANON** | Album page (RVAL or slug) |
| `/rv/[year]` | **CANON** | Year destination / chart context |
| `/rv/[year]/[month]` | **CANON** | Month chronology |
| `/rv/[year]/[month]/[week]` | **CANON** | Week chronology |
| `/week/[date]` | **CANON** | Chart week portal |
| `/charts` | **LEGACY** | Redirect only → `/rv/...` |

### Song experiences (duplicates)

| Route | Class | Notes |
|-------|-------|-------|
| `/retroverse-2/song/[rvtr]` | **CANON** | Song Experience — tabs, hero, YouTube, live follower |
| `/retroverse-2/song/[rvtr]/data` | **OPS** | Song Control Center; UI link ops-gated, route is public |
| `/retroverse-2/song/[rvtr]/data/cover` | **OPS** | Redirect → `/data` |
| `/track/[id]` | **LEGACY** | Chart/journey page; LiveExperienceShell; own nav chrome |
| `/rvtr/[rvtr]/song-sheet` | **LEGACY** | Package story page; cream editorial layout |
| `/rvtr/[rvtr]/deck` | **LEGACY** | Performance deck swipe UI; separate chrome |

### Live surfaces

| Route | Class | Notes |
|-------|-------|-------|
| `/retroverse-2/song/[rvtr]` (channel active) | **CANON** | Effective live experience via redirect + LiveChannelFollower |
| `/retroverse-2/live` | **LEGACY** | RV2 dark hub; redirects when channel active; fallback when not |
| `/live` | **LEGACY** | Cream “Now Playing” v1; redirects when channel active |
| `/sunday-nights` | **LEGACY** | Event landing + pass registration + TrackPageEmbed; redirects when channel active |

### Dev / internal public

| Route | Class | Notes |
|-------|-------|-------|
| `/control-center` | **UNKNOWN** | Dev gate (`RETROVERSE_CONTROL_CENTER=1`) |
| `/inspect` | **UNKNOWN** | Graph inspector; local dev gate |
| `/internal/ops-pin` | **OPS** | PIN entry for ops middleware |

### Ops (representative — all `/ops/*`)

| Route | Class |
|-------|-------|
| `/ops` | **OPS** — launchpad |
| `/ops/live-control` | **OPS** — channel start/stop, queue config |
| `/ops/sunday-nights` | **OPS** — bridge admin, manual live |
| `/ops/live`, `/ops/live-companion` | **OPS** — bridge health, DJ companion |
| `/ops/intelligence/*` | **OPS** — package/deck factory |
| `/ops/event-control` | **OPS** — homepage hero, featured years |
| `/ops/finance/*`, `/ops/covers/*`, `/ops/media-*`, etc. | **OPS** |

~60 ops page routes total; middleware returns 404 when ops disabled, PIN when enabled without cookie.

### Public API (patron-relevant)

| Route | Class | Notes |
|-------|-------|-------|
| `/api/sunday-nights/current` | **CANON** | Live payload + lazy channel advance |
| `/api/playback/[rvtr]` | **CANON** | Playback resolve (YouTube / media) |
| `/api/sunday-nights/register` | **LEGACY** | Collector pass — tied to `/sunday-nights` event page |
| `/api/ops/*` | **OPS** | Middleware protected |

---

## 2. Canon Recommendations

### Canon homepage — `/`

**Rationale:** HomeDirectory is the only purpose-built browse entry: featured years, scoped search pads, archive cards. When live channel is inactive, this is the correct “open the museum” moment. When live is active, `getPublicLiveRedirectUrl()` should send visitors straight to the current song (implemented locally in `lib/live-control/public-entry.ts`; production still needs deploy + Start Live).

### Canon song experience — `/retroverse-2/song/[rvtr]`

**Rationale:** Only route that combines canonical track data, editorial tabs (overview/story/artist/culture/media/timeline), large mobile hero, **Play on YouTube** (`resolveTrackPlayback`), ops cover workflow hook, and **LiveChannelFollower** auto-navigation. Replaces the functional overlap of `/track/`, song-sheet, and deck primary CTAs for patrons.

### Canon live experience — `/retroverse-2/song/[rvtr]` (when channel active)

**Rationale:** Live is not a separate page type anymore — it is “the current song experience that advances.” `/`, `/live`, `/sunday-nights`, and `/retroverse-2/live` all call the same redirect helper. The RV2 song page polls `/api/sunday-nights/current` and `router.replace`s on track change. Standalone live pages become **fallback shells only** when no RVTR is resolved.

### Canon search — `/search`

**Rationale:** Richest discovery UI: panels for albums, songs, artists, chart history, RV year context. Mobile layout exists but is desktop-first. **Gap:** `lib/search/entity-routes.ts` still emits `/track/` for songs — canon search UI, legacy song destination.

### Canon artist — `/artist/[slug]`

**Rationale:** Mature exhibit shell (hero, songs, albums, chart activity, related artists). Sub-routes (`/songs`, `/albums`, `/years`, `/charts`) extend without duplicating identity. Song links from artist lists still point at `/track/` or search — legacy leak.

### Canon year — `/rv/[year]` (and `/rv/.../month`, `/week/...`)

**Rationale:** Deterministic chart chronology aligned with Retroverse’s graph philosophy. `/charts` already redirects here. Year pages feed song discovery but outbound song links vary by caller (RV2 song vs `/track/`).

---

## 3. Redirect Audit

Every known patron path that still sends users to legacy or duplicate experiences:

| Source | Current destination | Recommended destination |
|--------|--------------------|-------------------------|
| `lib/search/entity-routes.ts` — `trackPageHref`, song normalize | `/track/[rvtr]` | `/retroverse-2/song/[rvtr]` |
| Search results / DiscoverCard | `/track/`, `/artist/`, `/album/` | Keep artist/album; **songs → RV2 song** |
| `lib/live-experience/shell-model.ts` — Story tab | `/rvtr/[rvtr]/song-sheet` | `/retroverse-2/song/[rvtr]` |
| `lib/live-experience/shell-model.ts` — Deck tab | `/rvtr/[rvtr]/deck` | `/retroverse-2/song/[rvtr]` (or Media tab anchor) |
| `lib/live-experience/shell-model.ts` — Chart tab | `/track/[rvtr]` | `/retroverse-2/song/[rvtr]` |
| `lib/live-experience/shell-model.ts` — primary CTA | deck / song-sheet / track | `/retroverse-2/song/[rvtr]` |
| `app/live/live-now-playing.tsx` — Story fallback | `/rvtr/.../song-sheet` | `/retroverse-2/song/[rvtr]` |
| `app/live/live-now-playing.tsx` — Deck | `/rvtr/.../deck` | `/retroverse-2/song/[rvtr]` |
| `app/live/live-now-playing.tsx` — Chart | `/track/[rvtr]` | `/retroverse-2/song/[rvtr]` |
| `LiveExperienceShell` brand / back | `/live` | `/` when live off; current song when live on |
| `app/track/[id]/track-page-view.tsx` nav | `/sunday-nights` | `/` (or remove — event mode decoupled from home) |
| `app/track/[id]/track-page-view.tsx` nav | `/charts` | `/rv/[year]` or featured year from track |
| `components/rvtr/SongSheetView.tsx` | `/track/[rvtr]` journey link | `/retroverse-2/song/[rvtr]` |
| `components/rvtr/performance-deck/*` | `/track/`, `/rvtr/.../song-sheet`, `/rvtr/.../deck` | RV2 song for cross-links |
| `app/retroverse-2/song/[rvtr]/page.tsx` — hardcoded American Pie items | `/track/RVTR891825` | `/retroverse-2/song/RVTR891825` |
| `app/components/home-directory.tsx` — Charts card | `/rv/1978` | **OK** (canon year) |
| `lib/ops/operations-directory.ts` — external link | `/sunday-nights` | `/` or current live song |
| `/charts?year=...` | redirect → `/rv/...` | **OK** |
| `/artist/[slug]/tracks` | redirect → `/songs` | **OK** |
| `/` `/live` `/sunday-nights` `/retroverse-2/live` (channel active) | `/retroverse-2/song/[rvtr]` | **OK** (local; prod pending) |
| QR / collector pass landing | `/sunday-nights` | Keep for registration **or** `/` with pass modal — event-specific |
| Ops Browser Plus / intelligence tools | `/rvtr/.../deck`, `/song-sheet` | **OPS OK** — internal workflows |

**Navigation menus (RV2 song topbar):**

| Link | Current | Recommended |
|------|---------|-------------|
| Live | `/retroverse-2/live` | `/` when inactive; stay on song when active |
| Search | `/search` | **OK** |
| Years | `/rv/[year]` | **OK** |

---

## 4. Live Experience Audit

### Current public entry points

| URL | Behavior (channel inactive) | Behavior (channel active, Phase 2 local) |
|-----|----------------------------|------------------------------------------|
| `retroverse.live` / `/` | HomeDirectory browse | 307 → `/retroverse-2/song/[current RVTR]` |
| `/live` | Cream Now Playing v1 | 307 → song experience |
| `/sunday-nights` | Editorial event + embed + pass form | 307 → song experience |
| `/retroverse-2/live` | RV2 dark live hub | 307 → song experience |

### Current live entry point (technical)

- State: Postgres `sunday_nights_state` + `live-control` keys
- Advance: lazy via `/api/sunday-nights/current` poll (no background cron)
- Resolver: `lib/live-control/public-entry.ts` → `getPublicLiveRedirectUrl()`
- Follower: `components/live-channel/LiveChannelFollower.tsx` on song page (3s poll, `router.replace`)

### Current song experience entry point

- **Canonical URL:** `/retroverse-2/song/[rvtr]`
- **Reached via:** live redirect, direct link, ops tools, some RV2 internal links
- **Not reached via:** search song results, LiveExperienceShell tabs, most artist song lists, track page

### What should happen when a user visits retroverse.live?

**Recommended (single rule):**

1. **Live channel running + valid RVTR** → open **current Song Experience** (`/retroverse-2/song/[rvtr]`). User hears/sees the on-air song, page auto-advances with the channel.
2. **Live inactive** → open **HomeDirectory** (`/`): featured years, search, browse. No forced redirect to Sunday Nights or cream live.

Production gap (2026-06-22 audit): channel was stopped; home still behaved as pre-Phase-2 on deployed build.

### What should happen when a live channel is active?

1. `/`, `/live`, `/sunday-nights`, `/retroverse-2/live` → **307 to current song**
2. Song page **LiveChannelFollower** keeps user on the rotating experience
3. **Play on YouTube** is the primary listen action (no in-app player required for canon)
4. Ops controls live at `/ops/live-control` only — never linked in public nav for patrons

---

## 5. Mobile Audit

| Page | Mobile status | Evidence / notes |
|------|---------------|------------------|
| `/retroverse-2/song/[rvtr]` | **Mobile friendly** (Phase 1 polish) | `reports/song-experience-polish/02-mobile-after.png` — large cover, YouTube CTA, single-column stats |
| `/` HomeDirectory | **Mobile friendly** (2026-06 fix) | `reports/homepage-mobile-after.png` — full-width board |
| `/search` | **Desktop compressed** | `search.css` only adds layout at `min-width: 768px`; panels dense on phone |
| `/live` | **Acceptable but legacy** | Small card layout; disconnected from RV2 visual system |
| `/sunday-nights` | **Mixed** | Editorial readable; live embed uses TrackPageEmbed (track chrome) |
| `/retroverse-2/live` | **Desktop-first** | Command-center density; `reports/retroverse-2-live-phase-a-mobile.png` |
| `/track/[id]` | **Desktop compressed** | Full exhibit nav + chart modules; not RV2 mobile pass |
| `/rvtr/.../song-sheet` | **Readable** | Cream editorial; no shared RV2 header |
| `/rvtr/.../deck` | **Deck-native** | Horizontal swipe works on phone; different product feel |
| `/artist/[slug]` | **Mostly friendly** | `@media (max-width: 767px)` in artist CSS |
| `/rv/[year]` | **Mostly friendly** | `@media (max-width: 767px)` in rv-year.css |
| `/album/[id]` | **UNKNOWN / likely compressed** | No dedicated mobile pass audited |
| LiveExperienceShell pages | **Tab bar cramped** | Shared shell; small tab labels on mobile |

**Screenshots on file:**

- Song before/after: `reports/song-experience-polish/01-mobile-before.png`, `02-mobile-after.png`
- Live redirect: `reports/live-channel-audit/01-home-redirect-mobile.png`, `02-song-experience-mobile.png`
- Home: `reports/homepage-mobile-before.png`, `homepage-mobile-after.png`
- RV2 live hub: `reports/retroverse-2-live-phase-a-mobile.png`
- Song iterations: `reports/retroverse-2-song-experience-revision-mobile.png`, `retroverse-2-song-mobile-pass.png`

**Responsive fixes needed (canon surfaces only):**

1. `/search` — mobile panel stacking, larger tap targets (canon discovery)
2. `/artist/[slug]` — verify song list links and touch targets post-consolidation
3. `/album/[id]` — audit pass (canon but unverified)

---

## 6. Experience Map

```
Visitor arrives
       ↓
   ┌─── Live active? ───→ /retroverse-2/song/[rvtr] ──→ Listen (YouTube CTA)
   │                              ↓
   └── No ──→ / (HomeDirectory) ──→ Pick year / search / artist
                    ↓                        ↓
              /rv/[year]              /search?q=...
                    ↓                        ↓
              defining songs            song result ──→ /track/ ❌ BREAK
                    ↓                        ↓
              /artist/[slug] ←──────────────┘ (artist OK)
                    ↓
              song link ──→ /track/ ❌ BREAK
                    ↓
         /retroverse-2/song/[rvtr] ✓ CANON (if user finds it)
                    ↓
              Explore tabs (story, artist, culture, year)
                    ↓
              Listen ──→ YouTube ✓ (RV2 only today)
                    ↓
         Live channel advances ──→ next song ✓ (RV2 + follower)
                    ↓
              Continue journey ──→ artist, year, related songs
```

### Where the flow breaks today

1. **Search → song** lands on `/track/`, not Song Experience — breaks visual and listen continuity.
2. **Artist song lists → `/track/`** — same break.
3. **Live inactive:** three competing live URLs (`/live`, `/sunday-nights`, `/retroverse-2/live`) — user confusion.
4. **LiveExperienceShell** still advertises Story/Deck/Chart as separate apps — breaks “one song, one page.”
5. **Sunday Nights pass QR** → editorial page, not song experience — breaks for live-first product.
6. **Chart depth** lives on `/track/` and `/rv/` but canon song tabs don’t replace chart-run rail — partial duplication, not broken graph.
7. **Deck / song-sheet** remain reachable from ops and shell — patron detour into legacy UX.

---

## 7. Top 10 Cleanup Opportunities

Ranked by impact; all achievable with **redirects + href updates only** (no new systems):

1. **Point `entity-routes` song hrefs at `/retroverse-2/song/[rvtr]`** — fixes search, cards, and most programmatic links in one place.
2. **Update `LiveExperienceShell` action set** — Story/Deck/Chart → RV2 song (shell becomes legacy wrapper or thin redirect).
3. **HTTP redirect `/track/[rvtr]` → RV2 song** — preserve `/track/` slug URLs during transition (or 302 by RVTR detection).
4. **HTTP redirect `/rvtr/[rvtr]/song-sheet` and `/deck` → RV2 song** — preserve QR/bookmarks.
5. **Deploy Phase 2 live routing to production** + document Start Live ops runbook.
6. **Remove `/sunday-nights` from track page nav** — replace with Home or Search.
7. **Fix hardcoded `/track/` links inside RV2 song page** (American Pie demo content).
8. **Collapse public live fallbacks** — document one patron URL (`/live` → redirect to `/` when inactive, not a third UI).
9. **Search mobile pass** — single-column panels (canon discovery surface).
10. **Gate `/retroverse-2/song/[rvtr]/data` behind ops middleware** — route is public today though button is hidden.

---

## The Rebuild Answer

> **If Retroverse were rebuilt from scratch today using only what exists already, which pages would survive?**

### Survive (official Retroverse)

| Page | Why it survives |
|------|-----------------|
| **`/`** | Browse hub; year cards; entry to graph |
| **`/search`** | Discovery engine (after song href fix) |
| **`/retroverse-2/song/[rvtr]`** | The product — one song, all context, listen, live |
| **`/artist/[slug]`** (+ songs, albums, years, charts) | Artist graph exhibit |
| **`/album/[id]`** | Album graph view |
| **`/rv/[year]`** (+ month, week) | Time travel / chart chronology |
| **`/week/[date]`** | Chart week portal |

### Survive as redirect targets only (legacy URLs, no standalone UX)

| Page | Fate |
|------|------|
| `/track/[rvtr]` | 302 → RV2 song (chart content merged into song tabs over time) |
| `/rvtr/[rvtr]/song-sheet` | 302 → RV2 song |
| `/rvtr/[rvtr]/deck` | 302 → RV2 song (deck content = media tab) |
| `/live`, `/sunday-nights`, `/retroverse-2/live` | Redirect when live on; `/live` → `/` when off |
| `/charts` | Already redirects → `/rv/...` |

### Do not survive as patron pages

- Cream Live v1 UI (`/live` body)
- Sunday Nights editorial microsite (except pass registration — move or modal)
- RV2 Live Command Center hub as public page (`/retroverse-2/live` body)
- Performance Deck full-screen swipe chrome (patron-facing)
- Song Sheet cream standalone layout
- Track page as separate journey (duplicate of song tabs + chart rail)

### Survive backstage only (OPS)

Everything under `/ops/*`, `/internal/ops-pin`, Song Control Center (`/data`), control-center, inspect, intelligence factory, live-control, finance, covers, media-lab.

---

## Appendix — File References

| Concern | Primary files |
|---------|---------------|
| Live redirect | `lib/live-control/public-entry.ts`, `app/page.tsx` |
| Song experience | `app/retroverse-2/song/[rvtr]/page.tsx` |
| Live follower | `components/live-channel/LiveChannelFollower.tsx` |
| Legacy shell nav | `lib/live-experience/shell-model.ts`, `components/live-experience/LiveExperienceShell.tsx` |
| Search hrefs | `lib/search/entity-routes.ts` |
| Live payload | `lib/sunday-nights/live-payload.ts` |
| Prior live audit | `reports/live-experience-audit.md` |
| Prior live channel audit | `reports/live-channel-audit/LIVE-CHANNEL-PHASE2-AUDIT.md` |
| Song mobile polish | `reports/song-experience-polish/PHASE1-AUDIT.md` |

---

*Audit complete. No routes modified. No files deleted.*
