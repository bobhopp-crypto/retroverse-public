# RV2 Public Shell — Step 1

**Date:** 2026-06-23  
**Scope:** Extract `Rv2PublicShell` from RV2 Song + Live. No route or visual redesign.

---

## Files changed

| File | Change |
|------|--------|
| `components/retroverse-2/Rv2PublicShell.tsx` | **New** — shared RV2 chrome component |
| `components/retroverse-2/rv2-public-shell.css` | **New** — shell CSS (canvas, grid glow, topbar, nav, search) |
| `app/retroverse-2/live/retroverse-live-2.css` | Shell rules moved out; imports shell CSS; live content rules only |
| `app/retroverse-2/live/retroverse-live-2-view.tsx` | Uses `Rv2PublicShell` |
| `app/retroverse-2/song/[rvtr]/page.tsx` | Uses `Rv2PublicShell`; drops direct `retroverse-live-2.css` import |
| `tools/capture-rv2-shell-step1.ts` | **New** — before/after screenshot capture |

**Unchanged:** `/search`, `/artist/*`, `/album/*`, `/rv/*`, song data route markup.

---

## New component

`components/retroverse-2/Rv2PublicShell.tsx`

Props:
- `children` — page body below search panel
- `className` — e.g. `rv2-song`
- `yearsHref` — Years nav target
- `lead` — optional node before chrome (song `LiveChannelFollower`)

---

## CSS ownership map

| Layer | File | Owns |
|-------|------|------|
| **Shell** | `components/retroverse-2/rv2-public-shell.css` | `html:has(.rv2-live)`, `.rv2-live` canvas, grid glow, topbar, nav, search panel, shared typography/buttons, `.rv2-public-shell__body` max-width |
| **Live content** | `app/retroverse-2/live/retroverse-live-2.css` | Hero, status, art, actions, story cards (+ `@import` shell for data route compat) |
| **Song content** | `app/retroverse-2/song/[rvtr]/retroverse-song-2.css` | Song hero, tabs, moments, sections |
| **Song data** | `app/retroverse-2/song/[rvtr]/data/song-data.css` | Ops control center (still inline chrome — future step) |

Import paths:
- Song/Live pages → `Rv2PublicShell` (loads shell CSS)
- Live page → `retroverse-live-2.css`
- Song page → `retroverse-song-2.css` only
- Song data → `retroverse-live-2.css` (gets shell via `@import`)

---

## Screenshots

```bash
npm run dev
npx tsx tools/capture-rv2-shell-step1.ts before   # pre-refactor
# … apply shell extraction …
npx tsx tools/capture-rv2-shell-step1.ts after
```

| Path | Content |
|------|---------|
| `reports/rv2-shell-step1/before/` | Pre-refactor full-page + viewport |
| `reports/rv2-shell-step1/after/` | Post-refactor full-page + viewport |

**Note:** Full-page `after` captures may differ if the live channel redirects the song page mid-session (`LiveChannelFollower`). Viewport captures block `/api/sunday-nights/current` for stable chrome comparison. Shell chrome (topbar, search, navy canvas) is unchanged.

---

## Compile

```bash
npm run build   # exit 0 (stop dev server first)
```

---

## Next step (not in scope)

- Wrap song data page in `Rv2PublicShell`
- Adopt shell on `/search`, `/artist/*`, `/album/*`, `/rv/*`
