# Experience 2.0 — Sprint 2: Chart Journey + Timeline

## Summary

Sprint 2 delivers the signature **Chart Journey** visualization and **Timeline** under `components/retroverse/experience/`, built on the existing chart trajectory pipeline from Sprint 1.

## Reused Loaders (no duplication)

| Layer | Source |
|-------|--------|
| Chart weeks | `loadTrackPage()` / `loadAlbumPage()` → `trajectoryWeeks` |
| Week parsing | `chartsToTrajectoryWeeks()` in `lib/track/charts-to-trajectory-weeks.ts` |
| Journey model | `buildChartJourney()` in `lib/chart-journey/build-chart-journey.ts` |
| Experience wrapper | `buildChartExperience()` in `lib/retroverse/experience/load-chart-experience.ts` |
| Week portal links | `chartWeekPortalHref()` via row context hooks |

No new chart SQL, no package generation changes, no Browser Plus changes.

## New Components

```
components/retroverse/experience/
  ChartJourney.tsx          — orchestrator (summary + rows + timeline)
  ChartJourneyRow.tsx       — single week row + tap/hover detail panel
  ChartJourneySummary.tsx   — derived metrics card
  Timeline.tsx              — merged milestone list
  TimelineEvent.tsx         — one timeline row
  chart-journey.css         — mobile-first infographic styling
```

Legacy import path `@/components/chart-journey/ChartJourney` re-exports the new component.

## Derived Metrics (automatic, no AI)

From `buildChartJourneyMetrics()`:

- Peak Position
- Weeks on Chart
- Weeks in Top 10
- Weeks at #1
- Biggest Jump (largest positive `delta`)
- Longest Climb (consecutive improving weeks)
- Longest Decline (consecutive falling weeks)
- Returned After Falloff (max gap weeks between chart runs)
- First / Last Chart dates

## Row Badges

Per-week badges from `derive-row-badges.ts`:

| Badge | Rule |
|-------|------|
| NEW | First week or `movement === "debut"` |
| RETURN | Re-entry week |
| PEAK | Rank equals peak position |
| BIG JUMP | `delta >= 10` |
| FINAL WEEK | Last week on chart |

## Heat Map

`chart-position-heat.ts` — green (floor) → yellow → orange → bright red (top 10) → deep red (#1). Bar width scales inversely with rank (#1 ≈ full width).

## Re-Entries

`detectChartRuns()` + `buildChartJourneyGaps()` — visible gap separator with “returned after N weeks” before the re-entry row. RETURN badge on the row.

## Timeline

`buildChartTimelineEvents()` merges:

1. **Chart-native** — Released (when year/date known), Entered Chart, Reached Peak, each Return, Final Chart Week
2. **Package intel** (read-only) — `controlPackage.intel.timelineEvents` on Song Experience when a package exists

Only events with data are shown — no placeholders.

## Interaction

Tap/click a chart week row to expand detail:

- Date, position, week number, weeks remaining
- Movement from previous / to next week
- Attached milestone label (if any)
- Link to chart week portal (`View chart week →`)

## Album Support

Same component; albums pass `maxRank={200}` and longer `trajectoryWeeks` arrays. Fingerprint scrolls vertically with no fixed week cap.

## Integration Points

- `app/retroverse-2/song/[rvtr]/page.tsx` — rv2 variant + package timeline
- `app/album/[id]/album-page-view.tsx` — exhibit variant, B200 max rank
- `app/track/[id]/track-page-sections.tsx` — exhibit variant

## Remaining Enhancements

- Hover tooltip on desktop (currently tap/click expand only)
- Dedupe package “Release” vs chart “Released” when labels overlap
- Wire `#1 song that week` / neighbors into row detail via future chart-week API hooks (`ChartWeekContextHooks`)
- Certification events (Gold/Platinum) when certification data joins the graph
- Optional `@media (hover: hover)` inline preview without expand

## Test Checkpoints

```bash
# Dev server (LAN for phone)
RETROVERSE_DEV_NO_CLEAN=1 RETROVERSE_OPS=1 npx next dev -H 0.0.0.0 -p 3000
```

- Song: `/retroverse-2/song/RVTR044043` — Heart Of Glass, 21 weeks, heat bars + summary
- Re-entry audit reference: `reports/chart-journey/REENTRY-AUDIT.md`
- Album with long run: any album page with `trajectoryWeeks.length > 0`
