# Search RV2 Shell Migration — Step 2

**Date:** 2026-06-23  
**Scope:** Move `/search` into `Rv2PublicShell`. Shell migration only — no logic, routing, or card changes.

---

## Files changed

| File | Change |
|------|--------|
| `components/retroverse-2/Rv2PublicShell.tsx` | Controlled search props (`searchQuery`, `onSearchQueryChange`, `onSearchCommit`) |
| `components/retroverse-2/rv2-public-shell.css` | Clear button styling for controlled search |
| `app/search/search-client.tsx` | Wrapped in `Rv2PublicShell`; removed grain + legacy chrome |
| `app/search/components/search-header.tsx` | Results header only (query + counts); removed logo/home/field/saucer |
| `app/search/page.tsx` | Suspense fallback uses `Rv2PublicShell` |
| `app/search/layout.tsx` | Imports `search-rv2-overrides.css` |
| `app/search/search.css` | RV2 token map; removed cream document shell + grain |
| `app/search/search-rv2-overrides.css` | **New** — RV2 panel skin for panels, cards, charts history, jukebox |
| `tools/capture-search-rv2-step2.ts` | **New** — before/after capture for 4 test queries |

**Untouched:** search APIs, ranking, filters, routes, artist/album/year/song pages.

---

## CSS ownership

| Layer | File | Owns |
|-------|------|------|
| **Shell chrome** | `components/retroverse-2/rv2-public-shell.css` | Canvas, grid glow, topbar, nav, search panel |
| **Search layout** | `app/search/search.css` | Panel geometry, discover cards, jukebox structure, RV2 token aliases |
| **Search RV2 skin** | `app/search/search-rv2-overrides.css` | Dark panel colors, chart-history purple → RV2, card borders |
| **Charts widget** | `app/artist/.../artist-charts-history.css` | Structure (overridden in search context) |

---

## Verification queries

| Query | URL |
|-------|-----|
| Joe Cocker | `/search?q=joe+cocker` |
| Beatles | `/search?q=beatles` |
| 1967 | `/search?q=1967` |
| Play With Fire | `/search?q=Play+With+Fire` |

Behavior preserved:
- Live `?q=` sync via `useSearchQuery`
- Same panels, cards, View All links
- Chart history entry + full year explorer unchanged

---

## Screenshots

```bash
npm run dev
npx tsx tools/capture-search-rv2-step2.ts before
# … apply migration …
npx tsx tools/capture-search-rv2-step2.ts after
```

Output: `reports/search-rv2-step2/before/` and `reports/search-rv2-step2/after/`

---

## Compile

```bash
# stop dev first
npm run build
```

---

## Visual regression notes

- Cream page background and illustrated hero (saucer, teal gradient, duplicate logo) removed — replaced by shared RV2 chrome.
- Purple chart bands → RV2 navy panels with cyan/gold accents.
- Card shelves, jukebox geometry, and result ordering unchanged.
- Song → Search transition now shares topbar, search panel, and dark canvas with Song Experience.
