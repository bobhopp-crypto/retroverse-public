# Live Experience Audit

Generated: 2026-06-22

## Scope

Routes audited:

- `/live`
- `/sunday-nights`
- `/track/[rvtr]`
- `/rvtr/[rvtr]/song-sheet`
- `/rvtr/[rvtr]/deck`
- Badge / QR landing surfaces tied to Sunday Nights collector passes

## Findings

### `/live`

- Current layout: small standalone mobile page with Retroverse wordmark, now-playing card, cover/placeholder, title, artist, year, and a small action stack.
- Navigation behavior: primary action points to the resolved destination from `/api/sunday-nights/current`; secondary artist/year links appear only when canonical track data exists.
- Available actions: open deck/package/track destination, artist, year.
- Data source: `loadSundayNightsState()` -> `buildSundayNightsCurrentPayload()` server-side, then client polling `/api/sunday-nights/current`.
- Fallback behavior: shows "Waiting for the next song..." when no bridge/live state; shows fallback now-playing card when bridge state exists without canonical track.
- Mobile issues: readable and fast, but visually disconnected from deck/song-sheet/track pages; no persistent tabs, no clear global "Back to Live" after leaving.

### `/sunday-nights`

- Current layout: editorial/event landing page with Sunday Nights live embed, long-form copy, featured years, pass registration, and About Retroverse footer.
- Navigation behavior: top link goes home; live embed can deep-link to deck/package; pass registration stays on page.
- Available actions: open deck/package from live module, register collector pass, open pass art lightbox, ops link when ops is enabled.
- Data source: same current payload as `/live`, plus static Sunday Nights copy and collector pass registration API.
- Fallback behavior: embedded live module shows track embed, fallback card, or waiting state.
- Mobile issues: useful event page, but feels like a separate microsite from `/live`; live controls are not the same component/action model.

### `/track/[rvtr]`

- Current layout: full public track exhibit with its own nav, hero, cover, chart/albums/related sections.
- Navigation behavior: site nav links to Sunday Nights, Search, Charts, Artists; Sunday event mode adds event back link.
- Available actions: play preview, artist link, chart/history sections, album/related links.
- Data source: `loadTrackPage()` from canonical graph/Postgres.
- Fallback behavior: 404 if unresolved; sparse message when canonical record has limited archive data.
- Mobile issues: rich but visually different from live/deck/package; patrons can land here from `/live` and lose live context.

### `/rvtr/[rvtr]/song-sheet`

- Current layout: standalone package/story page on cream background, with cover, record label, timeline, story constellation, facts, album context, DNA, related links.
- Navigation behavior: footer link to full song journey; internal related links go to other song sheets.
- Available actions: artist link, track journey link, related song/package links.
- Data source: `loadSongSheet()` from package store plus canonical relationship query.
- Fallback behavior: 404 when package does not exist.
- Mobile issues: content is strong, but no shared live header, no current-song status, no back-to-live affordance.

### `/rvtr/[rvtr]/deck`

- Current layout: full-screen horizontally scrolling performance deck with own topbar and bottom controls.
- Navigation behavior: topbar has `Live`; cards link to package, artist, track, sources, related decks.
- Available actions: card-by-card navigation, source links, package/artist/track links.
- Data source: `loadPerformanceDeck()` from package/deck model.
- Fallback behavior: 404 when no renderable deck exists.
- Mobile issues: best patron artifact, but uses a completely different chrome from `/live` and song sheet; topbar only says `Live`.

### Badge / QR Landing

- Current public landing is `/sunday-nights`; homepage redirects there when Sunday event mode is enabled.
- Collector pass registration is embedded in `/sunday-nights`; generation/QR tooling lives under ops/content-creator APIs and is not public-facing.
- Data source: `registerCollectorPass()` through `/api/sunday-nights/register`.
- Fallback behavior: duplicate pass returns API error shown inline.
- Mobile issues: form is usable, but QR users may land on an editorial page while live now-playing uses another visual system.

## Root UX Problem

Every patron surface works, but each owns its own header, visual hierarchy, navigation model, and fallback behavior. Moving from `/live` to deck/package/track feels like leaving the app instead of changing tabs inside one live experience.

## Safe Implementation Plan

Add a shared `LiveExperienceShell` as surrounding chrome:

- Do not remove deck viewer, song sheet, track page, or pass registration logic.
- Keep `/live` as default patron route.
- Wrap public live route bodies with consistent Retroverse header, "Press Play for the Past" branding, current song identity, status badge, action tabs, and Back to Live.
- Use current payload and route RVTR to compute status:
  - Deck: package + deck available
  - Package: package available, no deck
  - Track: canonical track only
  - Fallback: bridge/unresolved only
- Add `/ops/live-companion` for DJ visibility into current bridge payload, RVTR, VDJ label, package/deck availability, public URL, and patron-facing expectation.

## Risks / Guardrails

- Avoid changing `/api/sunday-nights/bridge`, VirtualDJ bridge scripts, package factory, collector card generation, and package generation.
- Avoid redirecting `/sunday-nights` because it contains pass registration and event copy.
- Keep existing page components intact; shell should be additive.
