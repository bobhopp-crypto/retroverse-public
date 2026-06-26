# Chart Week RV2 Migration — Phase 2 Report

**Date:** 2026-06-23  
**Scope:** Skin migration only — `/week/[date]` into `Rv2PublicShell`. No navigation, data, or ranking changes.

---

## Files modified

| File | Change |
|------|--------|
| `app/week/[date]/chart-week-portal-client.tsx` | Wrapped in `Rv2PublicShell`; removed legacy topbar/grain; RV2 breadcrumb |
| `app/week/[date]/chart-week-portal.css` | Replaced cream/paper/purple tokens with RV2 dark shell tokens |
| `app/week/[date]/loading.tsx` | Loading skeleton uses `Rv2PublicShell` |
| `tools/capture-chart-week-rv2-phase-2.ts` | Screenshot capture for verification |

---

## Before / after

### Before (Phase 1 — legacy cream chart)

- Standalone page: cream `#f4e9d3` background, paper grain, purple tag band
- Custom topbar (script logo) — not RV2
- Visual break when entering chart from RV2 Year/Month/Week

**Reference:** `reports/chart-nav-phase-1/1978-04-chart.png`

### After (Phase 2 — RV2 shell)

- `Rv2PublicShell`: topbar, search, grid glow, dark gradient
- Chart rows: RV2 panel borders, cyan ranks, gold links
- Breadcrumb: Year / Month / Week / Chart (links preserved)
- Same route: `/week/[date]`

**Reference:** `reports/chart-nav-phase-2/1978-chart-mobile.png`

---

## Navigation (unchanged)

```
/rv/YEAR → /rv/Y/M → /rv/Y/M/DATE → /week/DATE → /retroverse-2/song/RVTR
```

Browser back stack unchanged — all links use `<Link>` / `router.push`.

---

## Mobile screenshots (390×844)

| View | File |
|------|------|
| Chart 1972 | `reports/chart-nav-phase-2/1972-chart-mobile.png` |
| Chart 1978 | `reports/chart-nav-phase-2/1978-chart-mobile.png` |
| Chart 1967 | `reports/chart-nav-phase-2/1967-chart-mobile.png` |
| Full flow — Year | `reports/chart-nav-phase-2/flow-01-year.png` |
| Full flow — Month | `reports/chart-nav-phase-2/flow-02-month.png` |
| Full flow — Week | `reports/chart-nav-phase-2/flow-03-week.png` |
| Full flow — Chart | `reports/chart-nav-phase-2/flow-04-chart.png` |
| Full flow — Song | `reports/chart-nav-phase-2/flow-05-song.png` |

Re-capture:

```bash
npm run dev
npx tsx tools/capture-chart-week-rv2-phase-2.ts
```

---

## Build result

| Check | Result |
|-------|--------|
| `tsc --noEmit` | ✅ Pass |
| Dev smoke `/week/1978-05-06` | ✅ HTTP 200 |
| HTML contains `rv2-live` | ✅ (39 occurrences) |
| Legacy `chart-week-portal-world` | ✅ Absent |
| Playwright capture | ✅ Exit 0 |

Run production build after stopping dev:

```bash
npm run build
```

---

## Verification

| Criterion | Status |
|-----------|--------|
| RV2 top bar + search | ✅ |
| RV2 background + grid glow | ✅ |
| Rank, movement, artist, song visible | ✅ |
| Chart date + metadata preserved | ✅ |
| No horizontal scroll (390×844) | ✅ |
| Navigation flow unchanged | ✅ |
| No chart logic changes | ✅ |
| Browser Plus / acquisition untouched | ✅ |

### Mobile readability (1978, 1984, 1967)

- Rank column: cyan `#4fd5ff`, bold
- Movement: green stats line (↑ Rising, ★ New, etc.)
- Artist: muted blue-gray, ellipsis overflow
- Song: white title link to RV2 song route

---

## Success criteria

| Goal | Status |
|------|--------|
| User never leaves RV2 visual experience Year → Song | ✅ |
| Chart feels like another Retroverse screen | ✅ |
| Not a separate website | ✅ |
