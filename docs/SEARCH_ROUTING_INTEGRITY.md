# Search Routing Integrity Pass

Routing trust stabilization — no search redesign.

## Root cause

1. **`isDirectEntityHref` accepted `/artist/` and `/artist/RVAR…`** — `resolveSuggestionHref` passed these through without coercion, yielding empty or canonical-ID slugs that fail exhibit load (404), which users perceived as “kicked home.”
2. **`entityHref` returned `/` for unknown entity types** — any bad row could navigate to the homepage.
3. **Welcome `/artists/…` paths** were not always normalized before navigation.
4. **`/search` results omitted the Artists panel** — `artistHref` was built but never wired to `DiscoverCard` `href`.

## Fix

- `lib/search/entity-routes.ts` — `coerceArtistPublicHref`, `coerceAlbumPublicHref`, `coerceTrackPublicHref`, `sanitizePublicNavigationHref`, strict `isDirectEntityHref`
- `lib/search/resolve-suggestion-href.ts` — always coerce + warn on failure
- `lib/search/log-search-route.ts` — `[search-route:*]` console warnings
- `app/components/home-search-overlay.tsx` — block invalid `router.push` targets
- `app/search/search-client.tsx` — Artists panel with coerced `href`
- `lib/search/map-home-search.ts` — artist `href` + `artistHref` from upstream welcome paths

## Verified queries (local coercion)

| Query | Artist route |
|-------|----------------|
| aretha franklin | `/artist/aretha-franklin` |
| elton john | `/artist/elton-john` |
| madonna | `/artist/madonna` |
| Upstream `/` or `/artist/RVAR…` | Coerced to name slug |

## Production verification

After deploy, curl `/api/search/suggestions?q=aretha%20franklin` and confirm `suggestions.artists[0].href` starts with `/artist/`. Tap artist on home overlay and `/search` — should land on exhibit, not `/`.
