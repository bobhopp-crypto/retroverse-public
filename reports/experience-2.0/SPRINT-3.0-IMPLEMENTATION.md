# Experience 3.0 — Dynamic Story Engine

Mission: assemble each song page as a unique exhibit from whatever content exists — no fixed section order, no empty shells.

## Architecture

```
Package + Track + Artist graph
        ↓
buildSongExperience()
  ├── clusterStoryCards()     merge overlapping cards
  ├── score + rank chapters
  └── profile (story/chart/media/artist dominance)
        ↓
ExperienceFlow → existing UI components (unchanged visual system)
```

## Dynamic chapter engine

**File:** `lib/retroverse/experience/build-song-experience.ts`

Replaces the fixed Hero → Chart → Story → Beyond → Discover → Sources sequence with a scored, sorted chapter list.

| Chapter kind | Source | Empty gate |
|--------------|--------|------------|
| `chart_journey` | `track.trajectoryWeeks` | weeks > 0 |
| `story` | clustered package cards + intel facts | body ≥ 40 chars |
| `timeline` | `pkg.intel.timelineEvents` | events > 0; chart-peak dupes removed when chart journey present |
| `discover` | graph shelves (one chapter per shelf) | cards > 0 |
| `sources` | research vault (external only) | entries > 0 |

Hero stays fixed in the page shell (always first).

## Chapter ranking

Priority tiers (score bands):

| Tier | Score base | Notes |
|------|------------|-------|
| Chart Journey | 750 + weeks | +120 boost when no story cards (chart-heavy songs) |
| Story exhibits | 600 + rank bonus | Higher-ranked cards score higher; media categories +45 |
| Timeline | 380 + events×12 | |
| Discovery | 260–340 by shelf type | album > related > year > artist > essential |
| Sources | 120 + entries×3 | Always last tier |

Nine strong story cards → multiple high-scoring story chapters dominate the middle of the page.

Chart-only packages → Chart Journey scores highest after hero.

## Story clustering

**File:** `lib/retroverse/experience/story-cluster.ts`

Merges overlapping cards by:

1. Category/title pattern buckets (recording, video, TV, cultural, legacy, etc.)
2. Token overlap on body text (≥45%) or title similarity

Example merges: “Where Did That Name Come From?” + “How They Recorded It” + “Recording” → one **Recording** chapter with combined body.

Intel fallbacks: `intel.recordingFacts` / `intel.videoFacts` become chapters when no package cards cover those topics.

## Rich media

**File:** `lib/retroverse/experience/story-cards.ts` + `SongStory.tsx`

Story cards can carry `media[]`:

- Album/recording chapters → square cover art
- Video chapters → cover as video thumbnail
- Label intel → label chip (text)

Images render above body text — exhibit-style interruption, not inline Wikipedia prose.

## Discovery 2.0

**File:** `lib/retroverse/experience/discover-shelves.ts`

Each shelf and card now carries a `reason`:

| Reason | Trigger |
|--------|---------|
| Competed on the charts together | peak positions within 15 |
| Released around the same time | release years within 1 |
| Mentioned in the story | title appears in story body |
| Same album / Same artist / Same year | shelf context |
| Same label — {label} | package intel label |
| Connected artist | metadata.relatedArtists |
| Essential album from this artist | essential albums shelf |

Each shelf is its own scored chapter (not one bundled “Discover More” block).

## Smart Chart Journey

**File:** `lib/chart-journey/chart-archetype.ts`

Detects archetypes:

- instant hit, slow burner, steady climber
- one-week wonder, freefall
- late comeback, reentry, holiday resurgence
- radio sleeper

`buildChartJourneyStory()` now opens with a unique archetype paragraph, then the existing run description.

## Background automation

**Files:** `refresh-song-experience.ts`, `experience-cache.ts`, hooks in `process-song.ts` + `production-pipeline.ts`

After Ollama processing / card assembly / publish:

1. Invalidate experience cache
2. Rebuild chapter plan (cluster, rank, discovery reasons)
3. Save cache snapshot to `ops/intelligence/experience-cache/{RVTR}.json`

Non-blocking — failures log to processLog, never block package save.

## Page wiring

**File:** `app/retroverse-2/song/[rvtr]/page.tsx`

Calls `buildSongExperience()` → renders `<ExperienceFlow />`.

**File:** `components/retroverse/experience/ExperienceFlow.tsx`

Maps chapter kinds to existing components with dynamic headings.

## Not modified

- Browser Plus
- Package generation / Ollama prompts / fact extraction
- Matching or research pipeline
- DB schema
- Visual design system (CSS additions only for media + discovery reasons)

## Files added

- `lib/retroverse/experience/experience-types.ts`
- `lib/retroverse/experience/story-cluster.ts`
- `lib/retroverse/experience/build-song-experience.ts`
- `lib/retroverse/experience/experience-cache.ts`
- `lib/retroverse/experience/refresh-song-experience.ts`
- `lib/chart-journey/chart-archetype.ts`
- `components/retroverse/experience/ExperienceFlow.tsx`

## Files changed

- `lib/retroverse/experience/story-cards.ts`
- `lib/retroverse/experience/discover-shelves.ts`
- `lib/chart-journey/chart-journey-story.ts`
- `components/retroverse/experience/SongStory.tsx`
- `components/retroverse/experience/DiscoverMore.tsx`
- `components/retroverse/experience/BeyondTheCharts.tsx`
- `components/retroverse/experience/song-experience.css`
- `app/retroverse-2/song/[rvtr]/page.tsx`
- `lib/ops/intelligence/process-song.ts`
- `lib/ops/intelligence/production-pipeline.ts`

## Checkpoint

```bash
RETROVERSE_DEV_NO_CLEAN=1 RETROVERSE_OPS=1 npx next dev -H 0.0.0.0 -p 3000
```

Compare:

- `/retroverse-2/song/RVTR044043` — story-heavy (Heart Of Glass)
- `/retroverse-2/song/RVTR891825` — fallback story layout
- Any chart-only track — Chart Journey should lead the exhibit flow

Each page should show different chapter order, headings, and discovery reasons.
