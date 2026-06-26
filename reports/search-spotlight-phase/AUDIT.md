# Search Experience Phase — Type, Suggest, Tap

**Date:** 2026-06-23  
**Scope:** Spotlight-style home search overlay. No route changes. No redesign.

---

## Files changed

| File | Change |
|------|--------|
| `lib/search/suggestion-display.ts` | **New** — Spotlight kind labels (`Artist`, `Album • year`, etc.) |
| `lib/search/resolve-search-destination.ts` | Split high-confidence resolver; export `searchDiscoveryHref`, `resolveHighConfidenceDestination` |
| `lib/search/navigate-entity.ts` | **New** `navigateToDiscoverySearch()` for explicit `/search?q=` navigation |
| `app/components/home-search-overlay.tsx` | Tap-primary flow; Enter → high-confidence or View All; View All in empty/searching |
| `app/components/home-search-suggestions.tsx` | Spotlight row labels; **View All Results** footer |
| `app/components/home-search-overlay.css` | Kind label + View All styles |
| `tools/capture-search-spotlight.ts` | Screenshot capture script for audit |

---

## Old behavior

| Step | Behavior |
|------|----------|
| Type | Debounced fetch (150ms); suggestions appear after load |
| Enter | `resolveSearchDestination()` — artist match, then **first suggestion fallback**, then `/search?q=` |
| Enter + empty suggestions | Intended `/search?q=` but **`sanitizePublicNavigationHref` blocked `/search`** → no navigation |
| Tap suggestion | `<Link href>` to entity (worked) |
| Row labels | Artist name secondary line; year badge on right |
| Discovery | Enter could silently fail or jump to first result without tap |

---

## New behavior

| Step | Behavior |
|------|----------|
| Type | Same debounced live fetch; stale results stay visible while updating |
| **Tap suggestion** | **Primary path** — direct `<Link>` to entity route |
| Enter | RVTR/year shortcuts → entity; else **high-confidence match only**; else **View All** (`/search?q=`) |
| View All Results | Explicit button → `/search?q=...` via `navigateToDiscoverySearch` |
| Row labels | Spotlight hierarchy: title + kind line (`Artist`, `Album • 1969`, `Song • 1986`, `Year`) |
| Discovery `/search` | Only via View All, ambiguous Enter, or empty/no-match states |

---

## Navigation rules (unchanged routes)

| Kind | Destination |
|------|-------------|
| Artist | `/artist/[slug]` |
| Album | `/album/[id]` |
| Song | `/retroverse-2/song/[rvtr]` |
| Year | `/rv/[year]` |
| Discovery | `/search?q=...` (explicit only) |

---

## Verification

### API (production, pre-deploy code — hrefs already canon)

```bash
curl -s "https://retroverse.live/api/search/suggestions?q=joe%20cocker" | jq '.suggestions.artists[0].href'
# → "/artist/joe-cocker"

curl -s "https://retroverse.live/api/search/suggestions?q=thriller" | jq '.suggestions.songs[0].href'
# → "/retroverse-2/song/RVTR..." (song experience)
```

### After local deploy / dev server

```bash
npm run dev
SEARCH_CAPTURE_URL=http://localhost:3000 npx tsx tools/capture-search-spotlight.ts
```

**Checkpoint:** Tap "Joe Cocker" artist row → URL is `/artist/joe-cocker`.  
**Checkpoint:** Tap a song row → URL is `/retroverse-2/song/RVTR…`.  
**Checkpoint:** Tap View All Results → URL is `/search?q=…` (discovery page loads, no auto-redirect).

---

## Screenshots

Capture when dev server is running:

| File | Viewport | Content |
|------|----------|---------|
| `reports/search-spotlight-phase/mobile-joe-cocker-suggestions.png` | 390×844 | Overlay with grouped Spotlight rows |
| `reports/search-spotlight-phase/desktop-joe-cocker-suggestions.png` | 1280×900 | Same, desktop |
| `reports/search-spotlight-phase/mobile-joe-cocker-artist-page.png` | 390×844 | After tap → artist page |
| `reports/search-spotlight-phase/mobile-discovery-search-page.png` | 390×844 | View All → `/search?q=thriller` |

Run capture:

```bash
npx tsx tools/capture-search-spotlight.ts
```

*(Screenshots not captured in this session — no local dev server listening.)*

---

## Confirmations

| Requirement | Status |
|-------------|--------|
| Joe Cocker tap → `/artist/joe-cocker` | ✅ Link href from suggestions API; tap uses `resolveSuggestionHref` |
| Song tap → Song Experience | ✅ `coerceTrackPublicHref` → `/retroverse-2/song/[rvtr]` |
| `/search` remains discovery page | ✅ Only opened via View All / ambiguous Enter; no auto-redirect on search page |
| No new routes | ✅ |
| No redesign | ✅ CSS limited to kind label + View All button |
