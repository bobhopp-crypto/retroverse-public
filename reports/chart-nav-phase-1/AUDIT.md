# Chart Navigation Phase 1 — Implementation Report

**Date:** 2026-06-23  
**Scope:** P0 only — restore Year → Month → Week → Chart Week → Song flow.

---

## Files modified

| File | Change |
|------|--------|
| `lib/charts/load-chart-week-context.ts` | No-focus mode loads full chart (`chartMin`–`chartMax`, default #1–#100) |
| `lib/charts/chart-week-portal-types.ts` | `focusPosition` nullable for full-chart mode |
| `lib/charts/chart-week-portal-href.ts` | Doc update — bare `/week/DATE` is canonical chart page |
| `app/week/[date]/page.tsx` | Full chart when no `focus`/`rank` query params |
| `app/week/[date]/chart-week-portal-client.tsx` | Full-chart UI, back link to RV week, song links from rows only |
| `app/artist/[slug]/artist-charts-history-client.tsx` | RV chronology: week drill + chart destination; no song bypass |
| `tools/capture-chart-nav-phase-1.ts` | Screenshot capture script |

---

## Route map — BEFORE

```
/rv/YEAR → /rv/Y/M → /rv/Y/M/DATE → /retroverse-2/song/RVTR  (bypass)
/week/DATE (no query) → 404
/week/DATE only reachable from track chart rail
```

## Route map — AFTER

```
/rv/YEAR → /rv/Y/M → /rv/Y/M/DATE → /week/DATE → /retroverse-2/song/RVTR
```

| Step | Route | Action |
|------|-------|--------|
| Year | `/rv/1978` | Open month |
| Month | `/rv/1978/5` | Click week card → week route |
| Week | `/rv/1978/5/1978-05-06` | Click card → chart week |
| Chart | `/week/1978-05-06` | Click song row → song |
| Song | `/retroverse-2/song/RVTR…` | Browser back → chart |

---

## P0 changes (detail)

### 1. Chart week loader
- `/week/[date]` without `focus`/`rank` loads full Hot 100 for that date.
- Verified: `curl` → **200** for `http://localhost:3000/week/1978-05-06`.

### 2. Chart week as destination
- Bare URL shows chart title, date, ranks, movement, artist, song.
- Focused neighborhood mode unchanged when `?focus=&rank=` present (track rail).

### 3. Chronology → song bypass removed
- RV `summaryMode` cards no longer link to `/retroverse-2/song/…`.
- `SongActions` hidden on RV chronology routes.
- Non-RV artist `/charts` unchanged.

### 4. Week navigation restored
- `rvWeekNavHref` active in summary mode.
- `openChronologyWeek()`: month card → `/rv/Y/M/D`; on week route → `/week/DATE`.

---

## Screenshots

Captured at 390×844 (mobile) for **1978**, **1984**, **1967**:

| Step | 1978 example |
|------|----------------|
| Year | `reports/chart-nav-phase-1/1978-01-year.png` |
| Month | `reports/chart-nav-phase-1/1978-02-month.png` |
| Week | `reports/chart-nav-phase-1/1978-03-week.png` |
| Chart | `reports/chart-nav-phase-1/1978-04-chart.png` |
| Song | `reports/chart-nav-phase-1/1978-05-song.png` |

Same pattern for `1967-*` and `1984-*`.

Re-capture:

```bash
npm run dev
npx tsx tools/capture-chart-nav-phase-1.ts
```

---

## Build result

`npm run build` blocked while dev server active (`guard-no-concurrent-dev.mjs`).

| Check | Result |
|-------|--------|
| Linter (modified files) | ✅ No errors |
| Dev smoke: `/week/1978-05-06` | ✅ HTTP 200 |
| Playwright capture (3 years) | ✅ Exit 0 |

Run build after stopping dev:

```bash
# stop npm run dev, then:
npm run build
```

---

## Verification report

| Test | 1978 | 1984 | 1967 | Status |
|------|------|------|------|--------|
| Year page loads | ✅ | ✅ | ✅ | Pass |
| Month page loads | ✅ | ✅ | ✅ | Pass |
| Week page loads | ✅ | ✅ | ✅ | Pass |
| Chart week (bare URL) | ✅ | ✅ | ✅ | Pass |
| Song from chart row | ✅ | ✅ | ✅ | Pass |
| Month cards → song (bypass) | ❌ removed | ❌ removed | ❌ removed | Fixed |
| Browser back stack | Manual | Manual | Manual | Expected* |

\*Back stack uses `router.push` throughout chronology drill and chart portal refocus. Manual check: Song ← Chart ← Week ← Month ← Year.

---

## Success criteria

| Criterion | Status |
|-----------|--------|
| Start at year, drill to chart week | ✅ |
| Study full chart before song | ✅ |
| Song only from chart rows | ✅ |
| No new routes | ✅ |
| No CSS migration / redesign | ✅ |
| Browser Plus / acquisition untouched | ✅ |
