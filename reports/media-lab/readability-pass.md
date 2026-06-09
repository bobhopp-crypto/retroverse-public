# Media Lab Readability Pass

**Date:** 2026-06-09  
**Scope:** CSS only — no functionality changes

## Problems (before)

1. Sidebar nav + collection labels: low contrast dark gray on dark panel
2. Search results: artist/title and metadata hard to scan
3. Active/hover states: relied on undefined `--cream` variable (no visible highlight)
4. Metadata panel labels: too muted on dark editor surface
5. Episode sibling strip: near-invisible text on dark cards
6. Sidebar width: `260–320px` caused excessive wrapping

## Changes

### Contrast tokens (`ops-page--media-lab-workspace`)

| Token | Value | Use |
|-------|-------|-----|
| `--ml-text` | `rgba(255,255,255,0.96)` | Primary labels, artist/title |
| `--ml-text-secondary` | `rgba(255,255,255,0.80)` | Metadata, collection labels, field labels |
| `--ml-text-muted` | `rgba(255,255,255,0.68)` | Placeholders, disabled |
| `--ml-hover-bg` | `rgba(255,255,255,0.10)` | Hover surfaces |
| `--ml-active-bg` | `rgba(46,184,184,0.24)` | Selected rows/sections |
| `--ml-active-border` | `rgba(70,194,255,0.95)` | Selected outline |

### Sidebar

- Width increased ~31%: `minmax(340px, 420px)` (was `260–320px`)
- Light text on dark panel throughout
- Teal/cyan active state replaces broken cream background
- Hover state on sections, collections, and list items
- Search + filter inputs: light text, elevated `panel-2` background

### Search results

- `.ml-workspace__list-primary`: near-white, 1rem, bold
- `.ml-workspace__list-meta`: secondary white (not `--dim` alone)
- Title suffix (`.ops-dim` inside list items): secondary white, semibold

### Editor metadata

- `ml-perf-editor__meta-dl` dt/dd contrast bumped
- Field labels, notes placeholder, bucket badge readable on dark
- Sibling strip: light text on `panel-2`, active teal highlight

### Responsive

- Phone landscape (`max-width: 900px`, `orientation: landscape`): side-by-side layout preserved at `minmax(300px, 38vw)`

## Screenshots

| Viewport | Before | After |
|----------|--------|-------|
| MacBook Pro (1440×900) | `readability-before-desktop.png` | `readability-after-desktop.png` |
| iPad landscape (1180×820) | — | `readability-after-ipad-landscape.png` |
| iPhone landscape (844×390) | — | `readability-after-iphone-landscape.png` |

## Verification

- [x] Sidebar text readable without zoom
- [x] Collection labels readable
- [x] Search result artist/title high contrast
- [x] Metadata secondary text lighter
- [x] Selected state visible
- [x] Hover state visible
- [x] No functionality changes
