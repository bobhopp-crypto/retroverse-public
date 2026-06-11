# Homepage Mobile Audit — 2026-06-11

Viewport: iPhone 14 (390×844). File: `app/home-directory.css`.

## Before

| Issue | Root cause |
|-------|------------|
| Narrow content column (~360px) | `.home-directory__board { max-width: min(100%, 22.5rem) }` on all viewports |
| Small year headings | `clamp(1.65rem, 8vw, 2.1rem)` — 8vw of narrow plate ≈ 29px |
| Tiny album covers | 2×2 grid inside 22.5rem board → ~160px per thumb |
| Wasted side margins | Board capped + `1rem` outer padding on 390px viewport |
| Weak hierarchy | Descriptor capped at `18rem` / `0.74rem` |

Screenshots: `reports/homepage-mobile-before.png` (user capture).

## After

| Fix | Change |
|-----|--------|
| Full-width mobile board | `width: 100%`, `max-width: min(96vw, 100%)`, outer padding `max(2vw, 0.4rem)` |
| Larger year numbers | `clamp(2.75rem, 13vw, 3.5rem)` — ~51px at 390px |
| Readable themes | `clamp(0.92rem, 3.8vw, 1.05rem)`, `max-width: 100%` |
| Larger search | Label `0.78rem`, trigger `1.15rem` / `3.65rem` min-height |
| Bigger covers | Same 2×2 grid, ~45% wider card → thumbs ~185px |
| Tighter framing | Reduced header/search/year padding on mobile |
| Desktop preserved | `@media (min-width: 768px)` restores 24rem board + original typography |

Screenshots: `reports/homepage-mobile-after.png` (Playwright 390×844).

## Verification

- [x] Board uses ~96% viewport width on phone
- [x] Year dominates each card
- [x] No zoom required for year/theme text at 390px
- [x] Desktop breakpoint unchanged in appearance (768px+)

## Capture

```bash
npx tsx tools/home/capture-homepage-mobile.ts after
```
