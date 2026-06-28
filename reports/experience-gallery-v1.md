# Experience Gallery v1

Sprint 3.39 — Retroverse Experience Gallery foundation.

## Purpose

The Experience Gallery is the **public museum lobby** for Retroverse. Studio builds experiences; the Gallery presents them. Patrons and Bob review launch from `/retroverse/experiences` — never from Studio workspaces.

**Route:** `/retroverse/experiences`

---

## Architecture

```
app/retroverse/experiences/page.tsx     → Server page (loads data)
components/retroverse/gallery/          → Client UI (museum layout)
lib/retroverse/gallery/                 → Registry, loaders, evaluation
```

### Separation of concerns

| Layer | Role |
|---|---|
| **Experience Registry** | Declares signature + supporting experiences, status tiers, patron launch paths |
| **Gallery Loaders** | Resolves current song, per-RVTR readiness, library progress |
| **Experience Gallery UI** | Header, navigation, cards, preview, progress — warm museum aesthetic |
| **Studio** | Production only — no links from Gallery launch buttons |

---

## Experience Registry

**File:** `lib/retroverse/gallery/experience-registry.ts`

Experiences register via `registerGalleryExperience()`. The Gallery reads the registry at runtime — **no hardcoded card lists in UI**.

### Signature experiences (primary attractions)

| ID | Title | Status | Launch (patron) |
|---|---|---|---|
| `chart_journey` | Chart Journey | Ready | `/retroverse-2/song/{rvtr}#chart-journey` |
| `song_dna` | Song DNA | Ready | `/experience/{rvtr}` (requires Publisher approval) |
| `recording_journey` | Recording Journey | Coming Soon | — |
| `performance_journey` | Performance Journey | Coming Soon | — |
| `artist_journey` | Artist Journey | Planned | — |
| `album_journey` | Album Journey | Planned | — |
| `legacy_journey` | Legacy Journey | Planned | — |

### Supporting experiences (secondary)

Timeline, Charts, Credits, Discography, Collector Sources, Photo Gallery, Video Library, Historical Documents, Relationships — each with tier `supporting` and launch paths where ready.

### Status tiers

- `ready` — Patron launch available when per-song data passes evaluation
- `in_progress` — Partial data; may link to song page where applicable
- `coming_soon` — Registered, not yet built
- `planned` — Roadmap placeholder

**Future expansion:** New experiences call `registerGalleryExperience()` once; cards, preview, and progress rows appear automatically.

---

## Navigation Model

### Current song resolution

1. `?rvtr=` query param (manual browse)
2. Else VirtualDJ live channel (`resolveActiveLiveRvtr` from Sunday Nights + live control)
3. Else default dev song `RVTR001341`

### Song navigation

Production candidate list (`loadProductionCandidateRows`) provides ordered RVTRs by play count:

- **Previous / Next** — index in candidate list
- **Random** — random candidate
- **Search** — `/search`
- **Quick jump** — RVTR input, Artist/Title/Year links

No typed URLs required for normal browsing.

### Live follow badge

When resolved RVTR matches live channel, Gallery shows “Following VirtualDJ · now playing”.

---

## Browse Model

Browse pills link to existing public discovery routes (not Studio):

| Mode | Destination |
|---|---|
| Current Song | Gallery with active RVTR |
| Artist | `/search?q={artist}` |
| Album | `/search?q={album}` |
| Year | `/rv/{year}` |
| Genre / Playlists | `/search` (future filters) |
| Top 100 | `/charts` |
| Sunday Nights | `/sunday-nights` |
| Favorites | Gallery (future filter) |

Future: gallery-native filters (`?browse=recent`, `?browse=needs_review`) without Studio URLs.

---

## Per-Song Evaluation

**File:** `lib/retroverse/gallery/load-gallery.ts`

`evaluateGalleryExperience(experienceId, rvtr)` uses existing experience builders:

- **Chart Journey** — `buildChartJourneyExperience()` → chapters, creative review score
- **Song DNA** — `buildSongDnaExperience()` → chapters, review + production readiness
- **Planned journeys** — registry status only

Launch href is set only when:

1. Registry defines `launchPath`
2. Experience data is available
3. Song DNA additionally requires `isExperiencePublished(rvtr)`

**Never launches to:** `/ops/studio/experiences/*`, Publisher, Director, Collector workspaces.

---

## Launch Workflow

```
User selects experience card
  → Preview panel (duration, scenes, scores, updated)
  → "Launch Experience" → patron route only

Chart Journey  → /retroverse-2/song/{rvtr}#chart-journey
Song DNA       → /experience/{rvtr} (Publisher gate on destination)
Supporting     → /retroverse-2/song/{rvtr} or section anchor where defined
```

The `/experience/[rvtr]` page already enforces publication via `resolveExperiencePublicationBlock`.

---

## Library Progress

**File:** `loadGalleryLibraryProgress()`

Scans `data/ops/intelligence/research-department/{RVTR}/`:

- Chart Journey complete ≈ collector packages with `charts.peakHot100`
- Song DNA complete ≈ directories with `song-dna.json`
- Future journeys — placeholder counts until dedicated builders exist

Displayed as “Library Growth” — living roadmap of Retroverse coverage.

---

## UI Sections

1. **Header** — Retroverse Experience Gallery title + live badge
2. **Current Song** — artwork, title, artist, year, album, RVTR, availability summary
3. **Song Navigation** — prev / search / random / next
4. **Quick Jump** — RVTR, artist, title, year
5. **Browse Modes** — discovery pills
6. **Signature Experiences** — large selectable cards with stars + status
7. **Experience Preview** — hero art, metadata, Launch button
8. **Supporting Experiences** — secondary grid
9. **Library Growth** — progress counts per journey type

**Design:** Cream/paper background, teal + orange accents, thick outlines, large artwork — museum lobby, not Mission Control.

---

## Verification (RVTR001341)

Default song when no live channel:

- Chart Journey: builder returns chapters + review score → Launch to song page
- Song DNA: builder returns 9 chapters → Launch only if published
- Navigation: prev/next within production candidate list
- No Studio links in launch CTAs

---

## Future Expansion Strategy

1. **Register** new experience in `experience-registry.ts` with tier, status, `launchPath`
2. **Evaluate** in `evaluateGalleryExperience()` when per-RVTR readiness logic exists
3. **Count** in `loadGalleryLibraryProgress()` when completion criteria are defined
4. **Optional:** Patron-facing browse filters on Gallery query params
5. **Optional:** `/api/retroverse/gallery/nav` for client-only navigation without full reload

Studio remains the factory. Gallery remains the destination.

---

## Files

| Created | Path |
|---|---|
| ✓ | `app/retroverse/experiences/page.tsx` |
| ✓ | `components/retroverse/gallery/ExperienceGallery.tsx` |
| ✓ | `components/retroverse/gallery/experience-gallery.css` |
| ✓ | `lib/retroverse/gallery/experience-registry.ts` |
| ✓ | `lib/retroverse/gallery/load-gallery.ts` |
| ✓ | `lib/retroverse/gallery/load-gallery-page.ts` |
| ✓ | `lib/retroverse/gallery/index.ts` |
| ✓ | `reports/experience-gallery-v1.md` |

---

## Execution State

**COMPLETE** — Gallery route, registry, loaders, UI, and architecture report delivered. Typecheck pass. Runtime browser test recommended on `/retroverse/experiences?rvtr=RVTR001341`.

---

## Sprint 3.39a — Recursion Fix

### Root cause

The Gallery passed **raw registry objects** (`GalleryExperienceDefinition`) from the server into the client `ExperienceGallery`. Each entry includes a `launchPath` **function**.

When React Flight serialized props for the client boundary, the serializer recursively walked those function objects → `RangeError: Maximum call stack size exceeded at Set.has`.

The client also called `exp.launchPath(rvtr)` at render — functions cannot exist on the client.

Not a circular import (verified with madge). Not registry bootstrap recursion. **Non-serializable props crossing the RSC/client boundary.**

### Fix

| File | Change |
|---|---|
| `gallery-types.ts` | Client-safe types; `launchHref` string instead of `launchPath` function |
| `serialize-gallery-page.ts` | Resolves launch URLs on server; strips functions |
| `load-gallery-page.ts` | Returns serialized `GalleryPageData` only |
| `ExperienceGallery.tsx` | Imports `gallery-types.ts`; uses `launchHref` |
| `page.tsx` | Direct server import; JSON clone at RSC boundary |

Registry, readiness builders, navigation, and preview panel unchanged.

### Verification

- `loadGalleryPageData('RVTR001341')` — no circular refs; `JSON.stringify` OK; no function properties
- `GET /retroverse/experiences?rvtr=RVTR001341` — HTTP 200
- Typecheck — Pass

**Execution State:** COMPLETE
