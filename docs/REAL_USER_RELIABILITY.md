# Real User Reliability Pass

Operational trust fixes after live search → click → exhibit failures.

## Broken flows discovered

| Flow | Symptom | Severity |
|------|---------|----------|
| Home search overlay | Click artist → brief homepage flash, sometimes stuck on `/` | Critical |
| Home suggestions | `button` + `router.push` after `onClose()` race | Critical |
| `/search` Discover cards | Raw `href` could pass `/` or legacy paths | High |
| `/artist/[slug]/tracks` & `/albums` | `ARTIST_SLUGS` gate → 404 for PG-resolved artists (e.g. aretha-franklin) | High |
| Artist layout shell | PG ping failure → full `notFound()` despite valid slug | Medium |

Prior pass (`e0d4319`) already fixed: `entityHref` → `/`, `isDirectEntityHref` false positives, missing Artists panel on `/search`.

## Root causes

1. **Navigation order** — `onClose()` ran before `router.push()`, unmounting overlay on `/` and racing client navigation.
2. **Non-native navigation** — Overlay rows used `<button onClick>` instead of `<Link href>`, weaker on mobile Safari and harder to prefetch.
3. **Launch-only sub-routes** — `tracks`/`albums` pages only checked `ARTIST_SLUGS`, not `resolveArtistFromSlug`.
4. **Shell hard dependency on PG ping** — Layout called `notFound()` when `inspectPing()` failed even for recognizable slugs.

## Fixes implemented

- `lib/search/navigate-entity.ts` — `navigateToEntityRoute`: sanitize, `push` then dismiss callback.
- `app/components/home-search-overlay.tsx` — uses helper; passes `onDismiss` to suggestions.
- `app/components/home-search-suggestions.tsx` — overlay rows use `<Link>` + `resolveSuggestionHref`; fallback button for items without href.
- `app/search/components/discover-card.tsx` — `sanitizePublicNavigationHref` before render.
- `app/artist/[slug]/tracks/page.tsx`, `albums/page.tsx` — `resolveArtistFromSlug` + slug pattern guard.
- `lib/artist/load-artist-exhibit-shell.ts` — degraded shell when PG ping fails (display name from slug).
- `app/home.css` — anchor styling for suggestion links.

## Verified user journeys

Manual / API checks (local build + production where noted):

| Query | Expected route | Check |
|-------|----------------|-------|
| aretha franklin | `/artist/aretha-franklin` | Suggestions API + artist 200 |
| elton john | `/artist/elton-john` | Suggestions + exhibit |
| madonna | `/artist/madonna` | Production 200 |
| fleetwood mac | `/artist/fleetwood-mac` | Production 200 |
| thriller | album/track exhibit | Search panel hrefs coerced |
| stand by me | track exhibit | Jukebox / search href sanitize |
| bee gees | artist slug resolve | PG slug match |

Flows to exercise in browser:

1. `/` → search overlay → click top artist → stable exhibit (no homepage flash).
2. `/search?q=…` → Artists panel → Discover card → exhibit.
3. Back from exhibit → prior search state or home.
4. Repeat click same result (no drift).
5. `/artist/aretha-franklin/tracks` → redirect to `#artist-songs`.

## Mobile verification

- Overlay suggestion rows are real links (`<Link prefetch>`) for Safari long-press and back-forward cache.
- `touch-action: manipulation` preserved on suggestion anchors.
- Dismiss runs on `click` only (navigation handled by Next.js Link).

## Deployment

Push to `main` triggers production deploy. Confirm with:

```bash
curl -sS "https://retroverse.live/api/search/suggestions?q=aretha%20franklin" | head -c 400
curl -sS -o /dev/null -w "%{http_code}" "https://retroverse.live/artist/aretha-franklin"
```

## Fail-open entity reliability pass (new)

Entity routes now **render sparse exhibits instead of 404/redirect** when enrichment/ping fails:
- `app/artist/[slug]/*`: removed `notFound()` gates; `loadArtistPage` now returns fallback page data
- `app/track/[id]`: route renders fallback `TrackPageView` when loader returns `null`
- `app/album/[id]`: route never redirects; renders `AlbumPageView` with fallback data when `loadAlbumPage` fails

Sparse plate messaging:
- Track: shows “Nothing in the archive yet — this recording is still being indexed.”
- Album: shows “Nothing in the archive yet — this album is still being indexed.”
- Artist: shows “Nothing in the archive yet” + links to Search/Inspect.

Production verification (HTTP + content):
- `aretha franklin` → `/artist/aretha-franklin` (200, contains “From the archive”)
- `madonna` → `/artist/madonna` (200)
- `bee gees` → `/artist/bee-gees` (200)
- `fleetwood mac` → `/artist/fleetwood-mac` (200)
- `thriller` → `/album/RVAL…` (200)
- `stand by me` → `/album/RVAL…` (200)

