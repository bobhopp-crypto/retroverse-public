# Experience 5.0 — The Director

Rule-based presentation engine. No LLM. The page no longer decides what to show — the Director does.

## Philosophy

- **Direct attention**, don't render everything
- Every song opens with its **single most interesting chapter**
- **3–5 major chapters** in casual mode; the rest is optional exploration
- **Return visits** feel different — memory deprioritizes what you already saw

## Director Engine

**File:** `lib/retroverse/experience/experience-director.ts`

`directExperience()` scores every chapter with deterministic rules:

| Signal | Score boost |
|--------|-------------|
| Live Aid / Woodstock | +120 / +115 |
| Cultural impact / anthem / craze | +110 |
| Recording / studio session | +100 |
| Guitar solo / iconic sound | +95 |
| Music video / MTV | +90 |
| Chart anomaly | +80 |
| Crowd participation | +75 |
| Grammy / awards | +40 |

Chart chapters get archetype-specific boosts (Rocket +90, Instant Smash +92, etc.).

Output: `DirectorPlan` with `openingId`, `openingTitle`, `majorIds`, `optionalIds`, and per-chapter roles (`opening` | `middle` | `ending` | `optional`).

Wired in `buildSongExperience()` → every `SongExperience` carries `director`.

## Story Density

- Max **5 major** chapters, min **3** when content allows
- Sources and low-score timeline chapters become **optional**
- Casual living mode hides optional chapters until **Music Nerd Mode**
- Opening chapter gets visual emphasis (`rv-living-chapter--opening`)

## Chart Intelligence

**File:** `lib/chart-journey/chart-archetype.ts` (expanded)

Archetypes: Rocket, Slow Burner, Instant Smash, Sleeper Hit, Christmas Return, Re-entry, One-Hit Wonder, Long Tail, Album Monster, Chart Rivalry, Steady Climber, Freefall.

Each gets unique opening language via `buildChartJourneyOpening()` and a styled badge in `ChartJourneySummary`.

## Discovery Intelligence

**File:** `lib/retroverse/experience/discover-shelves.ts`

Self-explaining shelf titles: Beat these songs, Lost to these songs, Released with, Inspired, Covered by, Mentioned in today's story, etc.

## Experience Memory

**File:** `lib/retroverse/experience/experience-memory.ts`

Client-side `localStorage` per RVTR:

- `seenChapterIds` — recorded as chapters reveal
- `visitCount` — incremented on each song page load
- `videoPlays` — hook ready for player integration

**File:** `lib/retroverse/experience/apply-director-memory.ts`

On return visits, if the opening was already seen, swap in the next unseen major chapter. Shows **"Something something different this visit"** hint.

## Auto Tour Upgrade (Themed Exhibits)

**File:** `lib/retroverse/experience/attract-themes.ts`

Themes built from pool metadata:

- Summer Songs
- One Hit Wonders
- Experience Ready
- Most Played
- British Invasion
- Motown
- Songs from {year} (top chart years in pool)

**AttractTourProvider** cycles songs within a theme, then advances to the next exhibit.

**API:** `GET /api/retroverse-2/attract-tour` returns `theme`, `startRvtr`.

Director opening kind drives attract beat order via `buildDirectorAttractBeatSchedule()`.

## Pipeline

```
buildPatronSongExperience()
  → buildSongExperience()
  → directExperience()          ← NEW
  → buildLivingSongPlan()       ← uses director roles/order
```

## UI Components Updated

| Component | Change |
|-----------|--------|
| `LivingSongExperience` | Memory, optional chapters, opening eyebrow |
| `AttractTourExperience` | Director opening content + theme header |
| `AttractTourProvider` | Themed tour rotation |
| `ChartJourneySummary` | Archetype badge + CSS class |
| `LivingSongShell` | Passes `openingKind` to attract provider |

## Cache

`serializeExperienceCache()` now stores `directorOpeningId`, `directorOpeningTitle`, `directorOpeningKind` (backward-compatible optional fields on v2 cache).

## Test

```bash
RETROVERSE_DEV_NO_CLEAN=1 RETROVERSE_OPS=1 npx next dev -H 0.0.0.0 -p 3000
```

Checkpoints:

1. `/retroverse-2/song/RVTR044043` — opening chapter should NOT always be Chart Journey; check eyebrow label
2. Return visit (reload) — different major chapter may lead; hint appears
3. Music Nerd Mode — optional chapters appear
4. `/retroverse-2/live` idle → attract tour with themed exhibit header
5. Chart Journey summary shows archetype badge (Rocket, Slow Burner, etc.)

## Not Changed

Browser Plus, package generation, research pipeline, DB schema — presentation layer only.
