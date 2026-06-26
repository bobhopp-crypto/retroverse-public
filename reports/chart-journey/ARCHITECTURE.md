# Chart Journey 2.0 — Architecture

**Date:** 2026-06-24  
**Status:** Shipped (v1)  
**Principle:** Stories explain what happened. Chart Journeys show HOW it happened.

---

## Overview

Chart Journey is Retroverse’s signature chart fingerprint — a mobile-first heat-map run built from **actual chart issue dates**, not week numbers and not line charts.

Data flows from Postgres `chart_appearances` → `chartsToTrajectoryWeeks()` → `buildChartJourney()` → `<ChartJourney />`.

---

## File Map

| Layer | Path | Role |
|-------|------|------|
| Types | `lib/chart-journey/types.ts` | Metrics, runs, context hooks, milestones |
| Heat map | `lib/chart-journey/chart-position-heat.ts` | Position bands + bar width |
| Builder | `lib/chart-journey/build-chart-journey.ts` | Runs, re-entries, metrics, context |
| UI | `components/chart-journey/ChartJourney.tsx` | Patron-facing fingerprint |
| Styles | `components/chart-journey/chart-journey.css` | Mobile-first layout + RV2 variant |
| API | `app/api/chart-journey/route.ts` | `?rvtr=` / `?rval=` summary + model |
| Audit | `tools/chart-journey/reentry-audit.ts` | Re-entry + showcase report |

---

## Visual System

### Layout (each row)

```
[ Chart date ]  [ heat-map bar ]  [ #rank ]
```

- **Bar length** scales with chart strength (#1 = longest).
- **Bar color** by position band (Hot 100 normalized; Billboard 200 uses proportional bands).
- **No week numbers** in patron UI.

### Heat bands

| Position | Color | Token |
|----------|-------|-------|
| #1–10 | Deep red | `top10` |
| #11–25 | Orange | `top25` |
| #26–50 | Yellow | `top50` |
| #51–75 | Green | `top75` |
| #76–100 | Dark green | `floor` |

### Re-entry separator

When a gap > 1 chart week is detected between runs:

```
────────────────────────────
Returned after N weeks
────────────────────────────
```

Detection: `daysBetween(prev, next) > 10` → re-entry (same rule as trajectory builder).

---

## Derived Metrics

Computed in `buildChartJourneyMetrics()`:

- Peak Position
- Weeks On Chart (row count)
- First / Last Chart Date
- Longest Uninterrupted Run
- Chart Runs / Re-Entry Count
- Biggest Weekly Climb / Drop

Displayed above the fingerprint in a responsive metric grid.

---

## Chart Context Hooks

Each row exposes `ChartWeekContextHooks` (future chart date pages):

- `numberOne`, `entering`, `leaving`, `neighbors`, `movers` — **null placeholders today**
- `href` — live now via `chartWeekPortalHref()` → `/week/{date}?focus=&rank=`

Every chart date row is clickable when `focusTrackId` is set.

---

## Integration Points

| Surface | Placement | Variant |
|---------|-----------|---------|
| Song Experience `/retroverse-2/song/[rvtr]` | Immediately below hero | `rv2` |
| Track exhibit `/track/[id]` | Chart section | `exhibit` |
| Album page `/album/[id]` | Below hero, before tracklist | `exhibit` (maxRank 200) |
| Browser Plus inspector | Header stats + Chart Journey panel | API summary |
| Legacy `TrackChartRunRail` | Thin wrapper → `ChartJourney` | `exhibit` |

### Song Experience order (target)

1. Hero  
2. **Chart Journey** ← shipped  
3. Story / tabs  
4. Timeline / discovery (future card system)  
5. Deep dive / sources  

---

## Album Enhancements (schema ready)

Optional `milestones[]` on `<ChartJourney />`:

```typescript
type ChartJourneyMilestone = {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  kind: "certification" | "award" | "tour" | "anniversary" | ...;
};
```

Rendered as inline markers on the fingerprint. Data pipeline TBD (certifications, awards, catalog events).

---

## API

`GET /api/chart-journey?rvtr=RVTR######`  
`GET /api/chart-journey?rval=RVAL######`

Returns `{ ok, summary, model, title, artist, entityKind }`.

Browser Plus inspector fetches summary on row select — no Song Experience navigation required.

---

## Data Source

- **Songs:** `loadTrackPage()` → Hot 100 rows from `chart_appearances`
- **Albums:** `loadAlbumPage()` → Billboard 200 rows, `maxRank: 200`
- **Trajectory:** existing `TrackTrajectoryWeek[]` — no new research required

---

## Future: Chart Date Page

Hooks are wired. Next step: populate `numberOne`, `entering`, `leaving`, `neighbors`, `movers` from chart-week graph queries when `/week/[date]` expands.

---

## Audit

Run: `npx tsx tools/chart-journey/reentry-audit.ts`

Outputs:

- `reports/chart-journey/REENTRY-AUDIT.md`
- `reports/chart-journey/reentry-audit.json`

---

## Success Check

Open these Song Experiences — colorful fingerprint before any story:

- Heart Of Glass — `RVTR044043`
- Dreams — `RVTR023559`
- American Pie — `RVTR891825`

Patron should recognize chart **shape** (rocket, long runner, re-entry gap) before reading numbers.
