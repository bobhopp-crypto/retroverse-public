# Retroverse Public Core — Full Architecture and Reality Audit

**Audit date:** 2026-07-11  
**Branch inspected:** `main` @ `8165724e4`  
**Auditor mode:** Read-only (no source, data, branch, or service mutations)  
**Runtime services:** Not running on `127.0.0.1:3000` or `127.0.0.1:3100` at audit time (connection refused). Local state files and code inspection used instead.

---

# 1. Executive Reality Summary

## What exists

- A **canonical public entity graph** is implemented and largely production-ready:
  - Song: `/retroverse-2/song/[rvtr]` → `PublicSongExperience`
  - Artist: `/artist/[slug]` → `ArtistPageView`
  - Album: `/album/[id]` → `AlbumPageView`
  - Year: `/rv/[year]` → `RvYearView`
  - Chart week: `/week/[date]` → `ChartWeekPortalClient`
  - Search: `/search`
- A **VDJ → bridge → Sunday Nights → playhead** pipeline exists and can update live state locally.
- An **approved Live homepage UI** (`RetroverseLive2View`) still exists in source but is **unreachable** — its route redirects to `/`.
- The **homepage (`/`)** is owned by the **Broadcast Mixer playhead renderer** (`BroadcastViewer` → `PresentationStage` → `BroadcastAssetComposerView` or stage fallbacks).

## What works

- VDJ OSC bridge can POST to `/api/sunday-nights/bridge` and update `RETROVERSE_DATA/ops/sunday-nights/state.json` (proven by current state file: artist/title/filepath present, `source: "bridge"`).
- `buildPlayheadPayload()` can override queue items with VDJ track when `autoFollowVdj` is true in the **broadcast snapshot** (`broadcast.json` has `autoFollowVdj: true`).
- Canonical Song/Artist/Album/Year/Chart Week pages load from Postgres + bundled JSON on Vercel (pages exist, typecheck passes for `apps/live`).
- Production redirects legacy live routes (`/live`, `/retroverse-2/live`, etc.) to `/` via `next.config.js`.

## What is broken

- **Homepage does not render the approved public journey.** It renders a broadcast asset card (often initials fallback) with **no entity navigation**.
- **Unresolved VDJ tracks** (`resolution: "unresolved"`, `rvtr: null`) still reach the playhead as title/artist but cannot link into Song/Artist/Album/Year/Charts.
- **Bridge process reliability:** `RETROVERSE_DATA/live/processes.json` records bridge PID `25294` as running; `kill -0 25294` fails — **dead PID, stale manifest** (matches venue observation).
- **`presentation/state.json` has `autoFollowVdj: false`** while **`broadcast.json` has `autoFollowVdj: true`** — confusing operator state; snapshot wins at runtime but local files disagree.
- **Double navigation chrome** on homepage: `RetroverseGlobalNav` (layout) + `Rv2PublicShell` topbar — contributes to mobile clipping.

## What is merely hidden or disconnected

- `RetroverseLive2View` — full Live homepage with Explore Song/Artist/Year actions — lives in `apps/live/app/retroverse-2/live/retroverse-live-2-view.tsx`, wired only through `live-attract-tour-page.tsx`, but `/retroverse-2/live` redirects to `/`.
- `LiveNowPlayingView` — earlier live page with exploration shell — still in `apps/live/app/live/live-now-playing.tsx`, but `/live` redirects to `/`.
- `live-home.css` defines `.bac__portal` explorer navigation styles — **no matching JSX** in current `BroadcastAssetComposerView.tsx` (CSS without component).
- Rescue branch (`rescue/post-pass-debug-2026-07-10`) contains enhanced BAC pipeline + portals — rolled back on `main` by `51feb57c0`.

## What is misleadingly named

- **`CANONICAL_AUDIENCE_HREF = "/"`** — implies `/` is the canonical live experience; in practice `/` is the **broadcast mixer mirror**, not the exploration homepage.
- **`getPublicLiveRedirectUrl()`** — name suggests conditional live redirect; implementation **always returns `"/"`** since `9ed1b6304`.
- **`Sunday Nights`** — operator/event naming; public product is simply Live current song + exploration.
- **`PresentationStage` comment** ("The one renderer for Retroverse Live") — true for broadcast surfaces, **false** for the approved public entity journey.
- **`463bee06b` theme audit PASS for Live home** — marked PASS on Explorer-styled **broadcast composer**, not on exploration navigation.

## Actual primary blocker

**Homepage ownership was reassigned from the exploration Live UI to the Broadcast Mixer playhead renderer, and the exploration Live UI routes were disconnected.** The VDJ chain can deliver correct song identity to the playhead, but the homepage renderer (`BroadcastAssetComposerView`) is a non-navigable now-playing card (initials fallback when unresolved/no cover) — not the approved Song → Artist → Album → Year → Charts journey.

---

# 2. Approved Product Contract

## In scope (fixed)

| State | Behavior |
|-------|----------|
| **LIVE** | Show song Bob is currently playing in VirtualDJ |
| **OFF AIR** | Show one Bob-selected recommended song |
| **Exploration** | Song → Artist → Album → Year → Charts / chart week |
| **Data** | Existing Retroverse data only (Postgres, bundled JSON, VDJ index, runtime state) |
| **Entry** | One permanent QR → `https://retroverse.live` |

## Explicitly out of scope

- AI-generated public content
- Generated packages as a **required** dependency
- BroadcastAssetComposer themes as the **primary** public renderer
- Presentation packages / RVBA queue rotation as the **primary** homepage
- "Up Next" / next-song guessing
- Event-specific public page types as primary entry
- BobOS / marketplace / bingo / BTV / finances as part of the public core journey

---

# 3. Current System Map

```mermaid
flowchart TB
  subgraph entry [Public Entry]
    QR[Permanent QR] --> RL[https://retroverse.live/]
    RL --> GN[RetroverseGlobalNav layout.tsx]
    GN --> HP[page.tsx HomePage]
  end

  subgraph homepage [Homepage Render Path]
    HP --> RPS[Rv2PublicShell rv2-live-home]
    RPS --> BV[BroadcastViewer client]
    BV -->|SSR initial| BPP[buildPlayheadPayload store.ts]
    BV -->|poll 2s| API_PH[/api/retroverse-live/playhead]
    API_PH --> BPP
    BPP --> NPP[normalizePlayheadPayload]
    NPP --> PS[PresentationStage]
    PS --> RBA[resolveBroadcastAsset]
    PS -->|now-playing + meta| BAC[BroadcastAssetComposerView]
    PS -->|announcement/image/etc| STG[rv-stage fallback cards]
    BAC -->|optional RVTR| PKG_API[/api/retroverse-live/now-playing-package]
  end

  subgraph vdj [VDJ Chain - parallel]
    VDJ[VirtualDJ OSC] --> BR[tools/live-bridge/index.ts]
    BR -->|POST| BR_API[/api/sunday-nights/bridge]
    BR_API --> ABL[applyBridgeLiveUpdate]
    ABL --> SN_STATE[sunday-nights/state.json or Postgres]
    ABL --> VDJ_TO[vdj-takeover handleVdjPlaybackStarted]
    SN_STATE --> BPP
  end

  subgraph entities [Canonical Pages - reachable only via direct URL]
    SONG[/retroverse-2/song/rvtr]
    ART[/artist/slug]
    ALB[/album/id]
    YR[/rv/year]
    WK[/week/date]
  end

  BAC -.->|no nav links in main| entities
  RPS -.->|shell nav only| entities
```

---

# 4. Intended System Map

```mermaid
flowchart TB
  subgraph entry [Public Entry]
    QR[Permanent QR] --> RL[https://retroverse.live/]
  end

  subgraph live [Live State]
    VDJ[VirtualDJ OSC] --> BR[live-bridge]
    BR --> SN[Sunday Nights state]
    OFF[Bob recommended song] --> SN
    SN -->|LIVE overrides OFF| CUR[Current RVTR + metadata]
  end

  subgraph homepage [Approved Homepage]
    RL --> LIVE_UI[RetroverseLive2View or equivalent]
    LIVE_UI -->|poll| SN_API[/api/sunday-nights/current]
    SN_API --> CUR
    LIVE_UI --> NAV[Explore Song / Artist / Year]
  end

  subgraph journey [Canonical Exploration]
    NAV --> SONG[Song page]
    SONG --> ART[Artist page]
    SONG --> ALB[Album page]
    SONG --> YR[Year page]
    SONG --> WK[Chart week]
  end

  subgraph data [Data Sources]
    PG[(Postgres)]
    BUNDLE[bundled JSON]
    VDJIDX[vdj-rvtr-index.json]
    XML[database.xml local only]
  end

  CUR --> PG
  CUR --> VDJIDX
  SONG --> PG
  SONG --> BUNDLE
```

---

# 5. Route and Component Inventory

| Route | Page component | Data loader / API | Canonical ID | Renders correctly | Linked from public | Production-ready | Competing versions |
|-------|----------------|-------------------|--------------|-------------------|-------------------|------------------|-------------------|
| **`/` Live homepage** | `HomePage` → `BroadcastViewer` → `PresentationStage` | `buildPlayheadPayload()` + poll `/api/retroverse-live/playhead` | RVTR or `vdj:{hash}` in playhead item | **Partial** — shows title/artist; often initials card; **no explore nav** | QR, all legacy live redirects | **Deployed** but **wrong UX** | `RetroverseLive2View` (orphaned), `LiveNowPlayingView` (orphaned), `home-broadcast` layout (pass page) |
| **`/retroverse-2/live`** | `redirect("/")` | `getPublicLiveRedirectUrl()` | — | N/A | Was live entry | Redirect only | `LiveAttractTourPage` → `RetroverseLive2View` (dead code path) |
| **`/live`** | `redirect("/")` | same | — | N/A | Legacy | Redirect | `LiveNowPlayingView` (orphaned) |
| **`/sunday-nights`** | `redirect("/")` | same | — | N/A | Legacy | Redirect | `sunday-nights-live.tsx` |
| **`/retroverse-live`** | `redirect` or player | varies | — | N/A | Legacy | Redirect | `retroverse-live/player.tsx` |
| **Song** `/retroverse-2/song/[rvtr]` | `Retroverse2SongPage` → `PublicSongExperience` | `resolveCanonicalSongExperience`, `loadTrackPage` | **RVTR** | **Yes** (graph tier) | Shell nav, entity cross-links | **Yes** | `/song/[rvtr]` redirects here; `/song/vdj/[key]`; `/experience/[rvtr]` (showcase) |
| **Artist** `/artist/[slug]` | `ArtistPageView` | `loadArtistPage` | **slug** | **Yes** | Song rows, search | **Yes** | `/track/[id]` legacy |
| **Album** `/album/[id]` | `AlbumPageView` | `loadAlbumPage`, `resolveAlbumRvalParam` | **RVAL** or slug resolve | **Yes** | Song, artist pages | **Yes** | — |
| **Year** `/rv/[year]` | `RvYearView` in `Rv2ChronologyFrame` | `loadRvYearChartHistory`, editorial | **year int** | **Yes** | Chronology drill | **Yes** | `/rv/[year]/[month]`, `/rv/[year]/[month]/[week]` |
| **Charts hub** `/retroverse-2/charts` | `charts-hub-client` | bundled + API | — | Yes | Shell | Yes | — |
| **Chart week** `/week/[date]` | `ChartWeekPortalClient` | `loadChartWeekContext` | **YYYY-MM-DD** | **Yes** | Song chart journey | **Yes** | RV chronology week pages |
| **Search** `/search` | `search-client` | search index API | query | **Yes** | Shell, all pages | **Yes** | — |
| **Experience** `/experience/[rvtr]` | `ExperiencePlayer` | publisher gate | RVTR | Yes when published | Secondary | Yes | Redirects to song when not ready |
| **Pass** `/pass/[serial]` | `BroadcastViewer` + overlay | playhead + pass store | RVSN serial | Broadcast under pass | Event QR | Yes | Not primary entry |

### Homepage call graph (precise)

```
HTTP GET /
  → apps/live/app/page.tsx HomePage() [SSR, force-dynamic]
    → buildPlayheadPayload() [packages/shared/lib/bobos/presentation/store.ts:327]
      → maybeResumeBroadcastAfterVdjIdle()
      → loadBroadcastSnapshot() + loadSundayNightsState()
      → resolvePlayhead() + applyVdjPresentationItem() [vdj-takeover.ts:61]
      → normalizePlayheadPayload() [current-broadcast.ts derive + rvba]
    → normalizePlayheadPayload(initial)
    → <Rv2PublicShell className="rv2-live-home">
        → <BroadcastViewer initial={...} />
          → [client] useState(normalizePlayheadPayload(initial))
          → [client] setInterval 2000ms → fetch /api/retroverse-live/playhead
          → <PresentationStage rvba broadcast />
            → resolveBroadcastAsset(rvba, broadcast) [resolve-broadcast-asset.ts:96]
            → if broadcast-asset: composeBroadcastAsset → <BroadcastAssetComposerView />
            → else: rv-stage card (off-air, announcement, image, …)
```

---

# 6. Data Source Inventory

| Source | Path / access | Used for | Authoritative for | Production access |
|--------|---------------|----------|-------------------|-------------------|
| **VirtualDJ OSC** | UDP localhost | live artist, title, filepath, deck, crossfader | real-time playback | **No** (local bridge only) |
| **VirtualDJ database.xml** | `~/Library/Application Support/VirtualDJ/database.xml` | artist, title, album, year, label (RVTR), playCount | VDJ library facts | **No** — bundled `data/ops/vdj-rvtr-index.json` |
| **Postgres** | `inspectQuery` / pg | RVTR, track, artist, album, charts, covers | canonical graph | **Yes** on Vercel |
| **Sunday Nights state** | `RETROVERSE_DATA/ops/sunday-nights/state.json` (local) / Postgres key `live` (Vercel) | current track, live metadata, bridge flags | live now-playing identity | Local file local-only; prod uses PG |
| **Presentation state** | `RETROVERSE_DATA/ops/bobos/presentation/state.json` | playhead anchor, autoFollowVdj, manualTake | operator playhead | Local only |
| **Broadcast snapshot** | `broadcast.json` + push to prod | published queue, playhead, autoFollowVdj | **public playhead when snapshot exists** | Pushed to prod API |
| **Bundled live data** | `apps/live/data/**` (prebuild copy) | attract tour, sunday-nights snapshots, RVBR, album-chart-features | static fallbacks | **Yes** |
| **Package index** | `data/ops/studio` song packages | UniversalRenderer tier | enriched song cards | Bundled subset |
| **RVBA / presentation queue** | presentations.json | announcements, images, manual items | **homepage when manual take / no VDJ** | Optional |
| **Runtime playhead API** | `/api/retroverse-live/playhead` | audience poll | derived broadcast + rvba | **Yes** |
| **Bridge API** | `/api/sunday-nights/bridge` | VDJ ingest | Sunday Nights state | **Yes** (secret) |

---

# 7. Current Song Resolution Trace

**Runtime specimen** (from `~/RETROVERSE_DATA/ops/sunday-nights/state.json` at audit time):

| Field | Value |
|-------|-------|
| artist | Mouth & MacNeal |
| title | How Do You Do? |
| filepath | `/Users/bobhopp/DJ MEDIA/VIDEO/1970's/Mouth & MacNeal - How Do You Do_.mp4` |
| rvtr | **null** |
| resolution | **unresolved** |
| source | bridge |

### Resolution chain

1. **OSC** → bridge `tick()` reads artist, title, filepath, deck (`tools/live-bridge/index.ts:92-183`)
2. **Hysteresis** → `AudibleDeckHysteresis` requires `stablePolls` stable observations before publish
3. **POST** → `/api/sunday-nights/bridge` → `applyBridgeLiveUpdate()` (`apply-bridge-update.ts:34`)
4. **RVTR resolve** → `resolveLiveTrack()` (`resolve-live-track.ts:70`):
   - `loadRvtrByPath(filepath)` — Postgres `media_assets.source_path` → **miss** (likely path not in PG or PG unavailable locally)
   - `lookupAliasRvtrFromStore(artist, title)` — alias store → **miss**
   - `resolveChartOrbitTrack(title, artistHint)` — chart orbit → **miss**
   - Returns `rvtr: null`, `resolution: "unresolved"`
5. **State write** → `setLiveTrack()` stores live metadata with `songKey: normPath(filepath)`
6. **VDJ takeover** → `handleVdjPlaybackStarted()` pauses broadcast rotation
7. **Playhead** → `buildPlayheadPayload()` + `applyVdjPresentationItem()` builds item:
   - `link.id = vdj:/Users/bobhopp/DJ MEDIA/VIDEO/1970's/Mouth & MacNeal - How Do You Do_.mp4` (songKey, not RVTR)
8. **normalizePlayheadPayload** → `deriveCurrentBroadcast` + `resolveRvbaFromPresentationItem`
9. **resolveBroadcastAsset** → `experience: "broadcast-asset"` (hasSongMeta: title+artist)
10. **Composer** → `extractBroadcastInputFromRvba` — coverUrl null, album null, year null
11. **Render** → `BroadcastAssetComposerView` → `CoverArt` → **initials fallback** ("MM")

### What XML would supply (if resolved via VDJ index)

From `vdj-database.ts` / `load-vdj-base.ts`, XML provides per song:
- `artist`, `title`, `album`, `year`, `label` (RVTR), `playCount`, `filePath`

Retroverse **derives** RVTR via: path→Postgres, alias store, chart orbit, or XML label field / bundled `vdj-rvtr-index.json`.

### Entity path availability for this track

| Entity | Path | Status for unresolved track |
|--------|------|----------------------------|
| Song | `/retroverse-2/song/RVTRxxxxxx` | **Blocked** — no RVTR |
| Artist | `/artist/mouth-macneal` (slug guess) | Possible if artist exists in graph |
| Album | — | **Blocked** without RVTR/graph |
| Year | — | **Blocked** |
| Charts | — | **Blocked** |

---

# 8. VDJ-to-Phone Trace

| Step | Component | Input contract | Output contract | Persistence | Interval | Gating | Failure behavior |
|------|-----------|----------------|-----------------|-------------|----------|--------|------------------|
| 1 | VDJ OSC | queries on port 9000 | artist, title, filepath, play, crossfader | VDJ internal | ~pollMs (config) | VDJ running | bridge logs `vdj_error`, exit 1 on start |
| 2 | `VdjOscSensor` | OSC responses | deck snapshots | memory | per tick | OSC reachable | skip tick |
| 3 | `pickActiveDeck` + hysteresis | decks, crossfader | stable `{artist,title,filepath,deck}` | memory | `stablePolls` required | audible deck | `skipReason: awaiting_stable` |
| 4 | `publishLiveTrack` | POST JSON + secret | HTTP status | — | on stable change | playing=true requires fields | log `api_error`, keep polling |
| 5 | `/api/sunday-nights/bridge` | `BridgeLivePostBody` | `{ok, ...SundayNightsCurrentPayload}` | writes SN state | per publish | `LIVE_NOW_PLAYING_SECRET` | 401/400/500 |
| 6 | `applyBridgeLiveUpdate` | body | `SundayNightsState` | JSON or PG | — | playing/stopped | throws on bad body |
| 7 | `resolveLiveTrack` | filepath, artist, title | rvtr, year, coverUrl, resolution | — | — | — | unresolved still stores live row |
| 8 | `handleVdjPlaybackStarted/Stopped` | — | pauses/resumes broadcast | presentation + SN state | — | `autoFollowVdj` | no-op if auto off |
| 9 | `pushBridgeLiveUpdateToPublic` | body | HTTP to prod | diagnostics file | — | not on Vercel server | log failure, local continues |
| 10 | `buildPlayheadPayload` | snapshot + SN state | `PlayheadPayload` | read state | every SSR/poll | `manualTakeActive` blocks VDJ | off-air payload |
| 11 | `applyVdjPresentationItem` | autoFollowVdj, sn.live | overrides `item` | — | — | needs title+artist + playing/takeover | returns unchanged |
| 12 | `/api/retroverse-live/playhead` | GET | JSON PlayheadPayload | — | **2000ms client poll** | — | client keeps last good |
| 13 | `PresentationStage` | rvba, broadcast | React tree | — | — | `broadcast.type !== now-playing` → stage card | package fetch optional |
| 14 | Phone browser | GET `/` | HTML + hydration | — | — | — | shows BAC/stage |

### Stale-data / override points

- **`manualTakeActive: true`** → queue item wins over VDJ
- **`autoFollowVdj: false`** in presentation state (snapshot overrides on public path)
- **Published queue items** (announcements, images) when not in VDJ override
- **`broadcast.type !== "now-playing"`** → forces stage card, blocks composer
- **Unresolved RVTR** → composer fallback without graph links
- **Production PG vs local JSON drift** if bridge push fails

---

# 9. Homepage Renderer Decision Tree

```
buildPlayheadPayload()
│
├─ broadcast snapshot exists? [broadcast.json]
│   └─ resolvePlayhead(snapshot.queue, snapshot.playhead)
│
├─ applyVdjPresentationItem()
│   ├─ manualTakeActive? → NO override
│   ├─ autoFollowVdj false? → NO override
│   ├─ sn.live missing title/artist? → NO override
│   ├─ vdj.playing OR vdj.takeoverActive? → YES: item = buildVdjPresentationItem()
│   └─ else → queue item unchanged
│
normalizePlayheadPayload() → deriveCurrentBroadcast + rvba
│
PresentationStage(rvba, broadcast)
│
resolveBroadcastAsset(rvba, broadcast)
│
├─ !rvba OR broadcast.state === "off-air"
│   └─→ rv-stage--off-air ("Retroverse Live" / Press Play for the Past)
│
├─ broadcast.type !== "now-playing"
│   └─→ rv-stage--{type} (announcement, image, artist, …)  ⚠ can replace song
│
├─ packageRvtr OR (type===now-playing AND title+subtitle)
│   └─→ broadcast-asset experience
│       ├─ fetch /api/retroverse-live/now-playing-package?rvtr= (only if RVTR format)
│       ├─ composeBroadcastAsset(package ?? rvba fallback)
│       └─→ BroadcastAssetComposerView
│           ├─ coverUrl? → image
│           └─ else → bac__cover-fallback + bac__cover-initials  ← VENUE SYMPTOM
│
└─ else → rv-stage generic card (title/subtitle/kicker)
```

**Venue phone symptom mapping:**
- **Correct identity** → VDJ override reached `extractBroadcastInputFromRvba` (title/artist from `sn.live`)
- **Purple surface + large initials** → `BroadcastAssetComposerView` + `bac__cover-fallback` + template purple gradients (`broadcast-asset-composer.css`, `live-home.css` Explorer overrides)
- **No entity navigation** → `BroadcastAssetComposerView` has no portal/link JSX (only title/artist/album line)
- **Clipped center band** → see §9 CSS analysis below

### CSS clipping analysis (phone)

| Rule | File | Effect |
|------|------|--------|
| `RetroverseGlobalNav` sticky header | `layout.tsx` + `retroverse-global-nav.css` | Consumes ~3–4rem viewport top |
| `.rv2-live-home { min-height: 100dvh }` | `live-home.css:4-7` | Full viewport shell |
| `.rv2-live-home .live-home { min-height: calc(100dvh - 5.5rem); flex: 1 }` | `live-home.css:20-26` | Stage area below shell chrome |
| `.rv2-live-home .live-home > .rv-stage { flex: 1; min-height: 0; overflow: hidden }` | `live-home.css:28-33` | Clips stage content |
| `.rv-stage { height: 100%; container-type: inline-size }` | `presentation-stage.css:5-21` | Container query context |
| `.bac { height: 100%; container-type: size; grid + cqh/cqw units }` | `broadcast-asset-composer.css:4-31` | **Requires definite parent height**; `cqh`/`cqw` collapse when container height ambiguous |
| `.bac__cover-fallback` purple gradients | `broadcast-asset-composer.css:66-74` | Purple initials card |
| `Rv2PublicShell` topbar + search panel | `rv2-public-shell.css` | Second nav band; search hidden on live-home but topbar remains |

**Root cause:** Broadcast stage (`height:100%` + `container-type:size` + `cqh` units) inside a flex child with `min-height:0` and `overflow:hidden`, under **double headers** (global nav + RV2 topbar), produces a **short container** with content scaled/clipped to the vertical center band.

---

# 10. Git Chronology

| Commit | Date (author) | What changed | Public impact |
|--------|---------------|--------------|---------------|
| `820d01087` | Studio/Live split | `page.tsx` → `BroadcastViewer` + `buildPlayheadPayload`; creates `getPublicLiveRedirectUrl()` conditional | **Homepage becomes broadcast mirror** |
| `debc93748` | Sprint 7 | Unify VDJ item in `buildPlayheadPayload` | VDJ can drive playhead item |
| `9ed1b6304` | Jul 6 | `getPublicLiveRedirectUrl()` → always `"/"`; `/retroverse-2/live`, `/live` redirect | **Disconnects RetroverseLive2View** |
| `1084657b7` | Jul 7 | Broadcast Asset Composer | Homepage now-playing becomes BAC templates |
| `9fcfa16e6` | Jul 9 | Explorer Layout v1 tokens | Theming migration |
| `4e487e6d9` | Jul 9 | `page.tsx` wraps `Rv2PublicShell` + `live-home.css` | Double chrome + Explorer styling on broadcast |
| `463bee06b` | Jul 9 | Theme audit PASS for Live home | Documents wrong success criterion |
| `cce1946a5`–`ce66c602f` | Jul 9–10 | Artist, Year, Album, Chart pages v1 | **Entity journey intact** |
| `26512ae1b` | **tag broadcast-mixer-v1** | Broadcast Mixer modes, media routes | Deepens mixer/homepage coupling |
| `02c0c60e9` | Jul 10 | Fix VDJ broadcast rendering pipeline | Rescue/debug (on rescue branch) |
| `51feb57c0` | Jul 10 | Restore broadcast-mixer-v1 checkpoint | **Rollback** rescue BAC pipeline |
| `8165724e4` | Jul 10 | Client-safe media URL boundary | Media URL fix only |

### Last commit with approved public Live journey reachable

**`debc93748`** (parent of `9ed1b6304`) — `/retroverse-2/live` still rendered `LiveAttractTourPage` → `RetroverseLive2View` with Explore Song/Artist/Year.

> **Note:** `/` was already `BroadcastViewer` since `820d01087`. The approved exploration homepage was **`/retroverse-2/live`**, not `/`, until disconnected.

### Homepage ownership change

- **Owned by broadcast:** `820d01087` (introduced) — still true on `main`
- **Owned by exploration UI:** never on `/` in current Git history

### Rescue branch good work (not on main)

`rescue/post-pass-debug-2026-07-10` @ `6a6be3ee3` contains:
- `broadcast-asset-composer-pipeline.ts` — package loading pipeline
- Enhanced `BroadcastAssetComposerView` with diagnostics + package state
- `presentation-render-trace.ts`
- Partial portal/navigation restoration (CSS + component additions rolled back by `51feb57c0`)

### Work believed lost but still present

- `RetroverseLive2View` — **present**, unreachable
- `PublicSongExperience` + entity pages — **present**, production-ready
- `resolveHomepageRvtr` — **present** in `homepage-rvtr.ts`, **unused by `page.tsx`**
- `live-home.css` portal styles — **present**, no JSX consumer

---

# 11. Duplicate and Competing Systems

| Domain | Canonical | Competitors | Conflict |
|--------|-----------|-------------|----------|
| Live homepage | **Should be** exploration UI | `BroadcastViewer` on `/` | Homepage shows broadcast card |
| Live data API | `/api/sunday-nights/current` (exploration) | `/api/retroverse-live/playhead` (broadcast) | Different consumers, no bridge between |
| Song page | `/retroverse-2/song/[rvtr]` | `/song/[rvtr]`, `/track/[id]`, `/experience/[rvtr]` | Redirects exist; track legacy |
| Live entry | `/` | `/live`, `/retroverse-2/live`, `/sunday-nights` | All redirect to `/` |
| Now-playing renderer | **Should be** Live hero + links | `PresentationStage`, `BroadcastAssetComposerView`, `UniversalRenderer` | Three render paradigms |
| State stores | Sunday Nights (live identity) | Presentation playhead, broadcast snapshot | Snapshot + VDJ override interaction |
| autoFollowVdj | `broadcast.json` (true) | `state.json` (false) | Operator confusion |
| Off-air content | Bob recommended (intended) | Queue announcements, Sweet Home Alabama hardcoded in `RetroverseLive2View`, package rotation in `resolveHomepageRvtr` | No single off-air control wired to homepage |

---

# 12. Production vs Local Differences

| Concern | Local dev | Production (Vercel) |
|---------|-----------|---------------------|
| Sunday Nights state | `RETROVERSE_DATA/.../state.json` | Postgres (`usePostgresSundayNightsState`) |
| Bridge POST target | `http://127.0.0.1:3000/api/sunday-nights/bridge` | `https://retroverse.live/api/sunday-nights/bridge` |
| Bridge → prod forward | `pushBridgeLiveUpdateToPublic` | N/A on server |
| `database.xml` | Readable at runtime | **Not available** — uses `vdj-rvtr-index.json` bundle |
| Postgres | Local inspect connection | Vercel serverless + bundled fallbacks |
| Operator routes `/bobos` | Proxied to Studio :3000 | **Redirect to `/`** |
| Global nav BobOS link | Visible | **Link goes to `/`** (misleading) |
| Playhead source | Local `broadcast.json` + state | Prod ingest via push API / PG |
| Cover art | Local filesystem paths | CDN/proxy URLs |
| Build | `prepare-live-data.mjs` copies subsets | Same; traced into serverless |
| CI | `smoke-public-search` only | No live/playhead smoke test |

### Why phone on cellular may differ from local

1. Production playhead reads **pushed snapshot / Postgres**, not Bob's laptop `state.json`
2. Bridge push failures (`bridge-public-push.json` diagnostics) → prod stale
3. Unresolved filepath tracks have **no RVTR** on either environment if path not in PG
4. `autoFollowVdj` must be true **in prod snapshot** — local file edits don't apply until push
5. Double-nav + BAC CSS may render differently on mobile Safari vs desktop dev

---

# 13. Reliability Risks

| Risk | Severity | Evidence |
|------|----------|----------|
| Homepage renders broadcast composer instead of exploration journey | **Critical** | `page.tsx` → `BroadcastViewer` |
| Approved Live UI routes redirect to `/` | **Critical** | `next.config.js` + `9ed1b6304` |
| Unresolved VDJ → no RVTR → no entity links | **Critical** | Current `state.json`, `resolve-live-track.ts` |
| Bridge dead PID reported as running | **High** | `processes.json` pid 25294 dead; `isBridgeProcessRunning()` only checks manifest PID once at launch |
| No bridge auto-restart after crash | **High** | `launch.ts` starts bridge once; no watchdog |
| Bridge push to prod silent failure | **High** | `push-public.ts` — failure non-fatal |
| `autoFollowVdj` split across state files | **High** | `state.json` false, `broadcast.json` true |
| Double navigation chrome mobile clipping | **High** | layout + Rv2PublicShell + BAC `cqh` |
| Production depends on bridge push + secret | **Medium** | No local PG on Vercel |
| Misleading BobOS nav link on production | **Low** | Redirected to `/` |
| Theme audit PASS on wrong surface | **Low** | `463bee06b` |

---

# 14. Recommended Recovery Plan

## Phase 0 — Preserve and prove

| Item | Detail |
|------|--------|
| **Objective** | Freeze evidence; prove playhead vs exploration data |
| **Files likely involved** | Read-only: `state.json`, `broadcast.json`, playhead API |
| **Must not change** | All source, RETROVERSE_DATA, branches |
| **Verification** | Document playhead JSON vs `/api/sunday-nights/current` for same moment |
| **Acceptance** | Written diff showing identity match but UI path mismatch |
| **Rollback** | N/A |
| **Risk** | None |

## Phase 1 — Restore approved homepage

| Item | Detail |
|------|--------|
| **Objective** | `/` shows current song + Explore Song/Artist/Year (Live or Off-air) |
| **Files likely involved** | `apps/live/app/page.tsx`, `retroverse-live-2-view.tsx`, `live-home.css`, `public-entry.ts`, `next.config.js` redirects |
| **Must not change** | Entity page loaders, Postgres schema, RETROVERSE_DATA |
| **Verification** | Phone on cellular: `/` shows song + 3 explore links |
| **Acceptance** | No `BroadcastAssetComposerView` on `/`; `RetroverseLive2View` or equivalent |
| **Rollback checkpoint** | `8165724e4` |
| **Risk** | **Medium** — routing change only |

## Phase 2 — Connect five canonical journeys

| Item | Detail |
|------|--------|
| **Objective** | Live homepage links resolve to real Song/Artist/Album/Year/Chart week |
| **Files likely involved** | `retroverse-live-2-view.tsx`, `load-track-page.ts`, `artist-page-view.tsx`, `album-page-view.tsx`, `rv-year-view.tsx`, `chart-week-portal-client.tsx` |
| **Must not change** | Broadcast mixer operator tools |
| **Verification** | Click each link from live homepage for a known RVTR |
| **Acceptance** | Full chain works without packages/AI |
| **Rollback checkpoint** | Phase 1 complete |
| **Risk** | **Low** — pages exist |

## Phase 3 — Stabilize VDJ/live switching

| Item | Detail |
|------|--------|
| **Objective** | LIVE overrides off-air; resumes after VDJ stops; single `autoFollowVdj` source |
| **Files likely involved** | `vdj-takeover.ts`, `store.ts`, `apply-bridge-update.ts`, `broadcast.json` sync |
| **Must not change** | Bridge OSC protocol |
| **Verification** | Play in VDJ → homepage updates; stop 15s → off-air |
| **Acceptance** | `autoFollowVdj` consistent; no queue announcement override during VDJ |
| **Rollback checkpoint** | Phase 1 complete |
| **Risk** | **Medium** |

## Phase 4 — Add off-air recommendation

| Item | Detail |
|------|--------|
| **Objective** | Bob-selected song when VDJ inactive |
| **Files likely involved** | `SundayNightsAdmin.tsx` (manual `source: "manual"`), `live-attract-tour-page.tsx` pattern, `homepage-rvtr.ts` |
| **Must not change** | VDJ bridge |
| **Verification** | Stop VDJ → homepage shows Bob's pick |
| **Acceptance** | Manual selection in ops UI drives off-air homepage |
| **Rollback checkpoint** | Phase 3 complete |
| **Risk** | **Low** — `source: "manual"` already in types |

## Phase 5 — Cellular venue acceptance test

| Item | Detail |
|------|--------|
| **Objective** | Production `retroverse.live` on phone via venue LTE |
| **Files likely involved** | Vercel deploy, bridge push config, `RETROVERSE_LIVE_PUBLIC_URL` |
| **Must not change** | — |
| **Verification** | QR scan → live song → explore chain |
| **Acceptance** | No initials-only card for resolved RVTR; layout not clipped |
| **Rollback checkpoint** | Phase 4 complete |
| **Risk** | **Medium** — prod infra |

## Phase 6 — Freeze Retroverse Public v1

| Item | Detail |
|------|--------|
| **Objective** | Tag + checklist sign-off |
| **Files likely involved** | Docs, CI smoke expansion |
| **Must not change** | Core routes after sign-off |
| **Verification** | §15 checklist all green |
| **Acceptance** | Binary Done |
| **Rollback checkpoint** | Tag |
| **Risk** | **Low** |

---

# 15. Exact Definition of Done

- [ ] `https://retroverse.live/` shows **current VDJ song** when bridge active (title, artist, cover or honest placeholder)
- [ ] `https://retroverse.live/` shows **Bob recommended song** when VDJ inactive
- [ ] Homepage has working links: **Explore Song, Explore Artist, Explore Year** (minimum)
- [ ] Song page loads from homepage for resolved RVTR
- [ ] Artist page loads from song or homepage
- [ ] Album page reachable from song
- [ ] Year page reachable from song or homepage
- [ ] Chart week reachable from song chart context
- [ ] No **required** dependency on packages, AI, RVBA queue, or BroadcastAssetComposer on `/`
- [ ] Permanent QR works at venue on **cellular** (not just local Wi‑Fi)
- [ ] Bridge crash detected and recoverable within one operator action
- [ ] Production playhead matches local VDJ within one poll cycle after push

---

# 16. Open Questions

1. **What is the production Postgres connection state on Vercel right now?** (Cannot verify without deployed env access — affects RVTR resolution rate.)
2. **Is `LIVE_NOW_PLAYING_SECRET` and bridge push to prod configured correctly in the current venue `.env`?** (Bridge push diagnostics file not inspected in depth.)
3. **Which RVTR did Bob intend as the off-air recommended song control?** (Manual Sunday Nights UI exists; no single documented operator workflow for "Bob pick".)
4. **Was `/` ever intended to show `RetroverseLive2View`, or only `/retroverse-2/live`?** Git shows `/` = broadcast since split; product doc may assume otherwise.

---

## Appendix A — Competing Homepage Renderers

| Component | File | Trigger | Can appear on `/` | Matches approved journey |
|-----------|------|---------|-------------------|--------------------------|
| `BroadcastAssetComposerView` | `BroadcastAssetComposerView.tsx` | `resolveBroadcastAsset` → broadcast-asset | **Yes (current)** | **No** — no entity nav |
| `rv-stage--off-air` | `PresentationStage.tsx:154` | no rvba / off-air | Yes | Partial — no song |
| `rv-stage--announcement` | `PresentationStage.tsx:186` | queue item type | Yes | **No** |
| `rv-stage--image` | `PresentationStage.tsx:166` | RVBA image + mediaUrl | Yes | **No** |
| `rv-stage` generic | `PresentationStage.tsx:186` | fallback stage | Yes | **No** |
| `RetroverseLive2View` | `retroverse-live-2-view.tsx` | `/retroverse-2/live` (dead) | **No** | **Yes** |
| `LiveNowPlayingView` | `live-now-playing.tsx` | `/live` (dead) | No | Partial |
| `UniversalRenderer` | package/vdj tier on song page | not homepage | No | Partial |

## Appendix B — State role matrix

| Concept | Intended role | Public core needs? | Can override song? | On homepage path? | Classification |
|---------|---------------|-------------------|--------------------|--------------------|----------------|
| Sunday Nights state | Live identity (bridge/channel) | **Yes** | Sets current track | Indirect via playhead | **Required** |
| Broadcast snapshot | Published queue + playhead for prod | Feeds playhead | Yes when manual take | **Yes** | Optional for public (should not drive homepage) |
| Presentation state | Operator playhead editor | No | Yes | Indirect | Operator infra |
| Playhead | Current audience item | Yes | — | **Yes** | Required (but wrong item type) |
| autoFollowVdj | VDJ drives audience item | **Yes** | Enables VDJ override | **Yes** | Required |
| manualTakeActive | Operator queue override | No | **Yes** | Yes | Operator infra |
| vdjTakeoverActive | Pause rotation during VDJ | Yes | Pauses queue | Indirect | Required |
| RVBA | Broadcast asset metadata | No | Types non-song items | **Yes** | Operator infra |
| package | Enriched song cards | No | No | Optional fetch | Optional enrichment |
| BroadcastAssetComposer | Themed now-playing card | No | Replaces exploration UI | **Yes** | **Should be optional** |
| PresentationStage | Broadcast renderer | No | Routes all broadcast types | **Yes** | Operator infra on `/` today |
| resolveBroadcastAsset | Route to composer vs stage | No | Picks experience | **Yes** | Coupled to homepage |
| normalizePlayheadPayload | Derive broadcast+rvba | Yes | Shapes payload | **Yes** | Required |

## Appendix C — Runtime checks performed

| Check | Result |
|-------|--------|
| `git status --short` | Modified (not staged): `reports/dev-server/DEV_SERVER_EVENTS.md`, `tools/live-bridge/hysteresis.ts` |
| `git branch --show-current` | `main` |
| `git show broadcast-mixer-v1` | Tag @ `26512ae1b` — Broadcast Mixer + media routes |
| `npx tsc --noEmit -p apps/live` | **Pass** (exit 0) |
| `curl http://127.0.0.1:3100/` | Connection refused (services not running) |
| Bridge PID 25294 | **Dead** |

## Appendix D — Permanent QR / entry

| Item | Finding |
|------|---------|
| Canonical URL | `https://retroverse.live/` (`CANONICAL_AUDIENCE_HREF`) |
| Legacy redirects | `/live`, `/sunday-nights`, `/retroverse-2/live`, `/retroverse-live` → `/` |
| Pass QR | `/pass/[serial]` → broadcast under pass overlay |
| BobOS exposed? | Nav link visible; **production redirects `/bobos` → `/`** |
| One QR all venues? | **Yes** — single domain; live state is global per deployment |

## Appendix E — Unnecessary runtime dependencies (classification)

### Required for core journey

- Sunday Nights / live state (bridge or manual)
- Postgres **or** bundled graph data for entity pages
- `loadTrackPage` / artist / album / year loaders
- `/api/sunday-nights/current` or equivalent live payload for homepage
- Search index (optional but present)

### Should be optional (currently coupled to `/`)

- Presentation queue / broadcast snapshot
- `buildPlayheadPayload` / playhead polling
- `PresentationStage` / `BroadcastAssetComposer`
- `now-playing-package` API
- RVBA imported slides
- Broadcast Mixer queue rotation
- AI / generated packages
- Local filesystem (`database.xml`, `RETROVERSE_DATA` paths on server)
- `RetroverseGlobalNav` BobOS link

---

*End of audit. No source code, runtime data, branches, or commits were modified during this investigation.*
