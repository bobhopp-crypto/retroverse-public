# Experience 2.3 — Story-Driven Layout

## Summary

Song Experience reorganized into a single guided narrative flow. No new data sources — existing package story cards, timeline events, graph links, and research vault entries only.

## Page Flow

```
Hero (cover / player)
  ↓
Chart Journey
  ↓
The Story
  ↓
Beyond the Charts
  ↓
Discover More
  ↓
Behind the Story (collapsed)
```

## Data Sources (reused)

| Section | Source |
|---------|--------|
| Hero | `loadTrackPage()`, `resolveTrackPlayback()` |
| Chart Journey | `trajectoryWeeks` via existing Chart Journey |
| The Story | `SongPackage.storyCards` (rank > 0, not hidden) |
| The Story fallback | `retroverse2.story` control fields, American Pie curated copy |
| Beyond the Charts | `SongPackage.intel.timelineEvents` only |
| Discover More | `signatureTracks`, albums, `relatedTracks`, RV year defining songs |
| Behind the Story | `SongPackage.researchVault` (external entries only) |

## New Files

```
lib/retroverse/experience/
  story-cards.ts          — package → patron story cards
  discover-shelves.ts       — horizontal shelf builder
  behind-the-story.ts       — vault grouping for patron UI

components/retroverse/experience/
  SongStory.tsx
  BeyondTheCharts.tsx
  DiscoverMore.tsx
  BehindTheStory.tsx
  song-experience.css
```

## Removed from Song Page

- Tab navigation (`RetroverseSong2Tabs`)
- Hero stats grid and “About The Song” sidebar
- “Experience Ready” badge
- Cultural Moments grid (absorbed into Discover More)
- Chart Journey inline timeline (moved to Beyond the Charts)
- Internal ops vocabulary in patron UI

## Patron-Facing Rules

- Story card titles from meaningful headlines or category labels (Recording, Music Video, Legacy, etc.)
- No generic labels (Story Card 1, Fact, Overview)
- Empty sections omitted entirely
- Wikipedia and other source names only visible when expanding a Behind the Story entry
- Retroverse internal vault entries filtered out of Behind the Story

## Chart Journey Change

Added `hideTimeline` prop — song page hides chart-derived timeline; package `timelineEvents` render in Beyond the Charts instead.

## Test Checkpoints

```bash
RETROVERSE_DEV_NO_CLEAN=1 RETROVERSE_OPS=1 npx next dev -H 0.0.0.0 -p 3000
```

- `/retroverse-2/song/RVTR044043` — Heart Of Glass: story cards from package, beyond-the-charts timeline, discover shelves
- `/retroverse-2/song/RVTR891825` — American Pie: fallback story when no package cards
- Expand “Behind the Story” on a researched song to verify source references

## Not Modified

Browser Plus, package generation, matching, Ollama, chart journey logic (presentation only via `hideTimeline`).
