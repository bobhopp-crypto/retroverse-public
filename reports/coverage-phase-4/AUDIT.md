# Coverage Layer — Phase 4 Report

**Date:** 2026-06-23

---

## Implemented (4A + 4B)

### Coverage classification

| Status | Rule |
|--------|------|
| **OWNED** | VIDEO folder only (`opsVideoMediaAndClause` — excludes `/MUSIC/` and VIDEO VAULT) |
| **YOUTUBE** | `youtube_video_tracks` (approved/pending, exact/high) and not OWNED |
| **MISSING** | Neither |

Module: `lib/charts/track-coverage.ts` + `lib/charts/load-track-coverage-batch.ts`

### Badges on chart surfaces

| Surface | Location |
|---------|----------|
| `/week/[date]` | Chart row title |
| `/rv/[year]` | Top Singles rows |
| `/rv/[year]/[month]` | Month summary cards |
| `/rv/[year]/[month]/[week]` | Same month cards |

Component: `app/components/track-coverage-badge.tsx`

### Filters (chart week only)

`All · Owned · YouTube · Missing` — client-side on `/week/[date]`.

---

## Files modified

| File |
|------|
| `lib/charts/track-coverage.ts` |
| `lib/charts/load-track-coverage-batch.ts` |
| `lib/charts/rvtrs-from-chart-history.ts` |
| `lib/charts/load-chart-week-context.ts` |
| `lib/charts/chart-week-portal-types.ts` |
| `app/components/track-coverage-badge.tsx` |
| `app/components/track-coverage.css` |
| `app/week/[date]/chart-week-portal-client.tsx` |
| `app/rv/[year]/rv-year-view.tsx` |
| `app/rv/[year]/[month]/page.tsx` |
| `app/rv/[year]/[month]/[week]/page.tsx` |
| `app/rv/components/rv-chronology-drill.tsx` |
| `app/artist/[slug]/artist-charts-history-client.tsx` |
| `lib/rv-year/rv-year-destination.ts` |
| `lib/rv-year/enrich-rv-year-destination.ts` |

---

## Audits (4C + 4D, no code)

| Report |
|--------|
| `reports/artist-coverage-audit/AUDIT.md` |
| `reports/browser-plus-coverage-audit/AUDIT.md` |

---

## Screenshots

```bash
npm run dev
npx tsx tools/capture-coverage-phase-4.ts
```

Output: `reports/coverage-phase-4/`

---

## Build

```bash
npx tsc --noEmit   # ✅ passes
npm run build      # requires dev server stopped first
```

---

## Screenshots (mobile 390×844)

| File | Surface |
|------|---------|
| `chart-week-badges-all.png` | `/week/1978-05-06` — All filter |
| `chart-week-filter-owned.png` | Same — Owned filter |
| `year-top-singles-badges.png` | `/rv/1978` — Top Singles |
| `month-chart-badges.png` | `/rv/1978/5` — Month cards |

Capture: `npx tsx tools/capture-coverage-phase-4.ts`

---

## Fix applied (handoff)

Client component `artist-charts-history-client.tsx` imported `coverageFromMap` from server-only `load-track-coverage-batch.ts`, which pulled `pg`/`fs` into the client bundle. Moved `coverageFromMap` to client-safe `lib/charts/track-coverage.ts`; batch loader marked `server-only`.

| Criterion | Status |
|-----------|--------|
| OWNED / YOUTUBE / MISSING on chart week | ✅ |
| Badges on year/month chart surfaces | ✅ |
| Chart week filters | ✅ |
| No new routes/pages/DB | ✅ |
| Artist audit | ✅ |
| Browser Plus audit | ✅ |
