# Experience 7.0 — Simplification & Performance Sprint

See also: [SPRINT-7.0-DELIVERABLES.md](./SPRINT-7.0-DELIVERABLES.md)

## Goal

Public song pages become lightweight exhibit renderers. Intelligence moves into package generation via precomputed `experience.json`.

## Part 1 — Simplified page layout (~5–7 sections)

Primary scroll order (fixed museum layout):

1. Hero (page-level, unchanged)
2. Up to **2 strongest story chapters** (director-ranked)
3. Chart Journey
4. Discovery (≤3 shelves)
5. Continue Exploring (sources)

Overflow (extra stories, timeline, extra discovery shelves) → single **Learn More** `<details>` block.

## Part 2 — Redundancy removal

- `chapter-deduplication.ts` drops overlapping story/timeline facts (recording, chart, album repeats).
- **Beyond the Charts** never appears in primary scroll; timeline only in Learn More when chart journey is absent and events add new information.
- Chart story clusters suppressed when Chart Journey is present.

## Part 3 — Discovery cleanup

- `prioritizeDiscoverShelves()` — max **3** shelves, priority: More by Artist → Related Songs → Essential Albums → year → album.
- Single discover chapter with `shelves[]` array (was one chapter per shelf).
- Shelves still require ≥2 cards with artwork.

## Part 4 — No internal scrolling

- Discovery rails: horizontal swipe preserved, scrollbars hidden (`scrollbar-width: none`).
- Chart Journey fingerprint panel: removed internal vertical scroll (`overflow: visible`).

## Part 5 — Precomputed `experience.json`

**New files**

| File | Role |
|------|------|
| `public-exhibit-types.ts` | Serializable exhibit schema |
| `chapter-deduplication.ts` | Fact dedupe |
| `layout-public-exhibit.ts` | Primary vs Learn More split |
| `hydrate-public-exhibit.ts` | Serialize / hydrate chart track |
| `public-exhibit-store.ts` | Load/save `packages/RVTRxxxx/experience.json` |
| `load-patron-experience.ts` | Page loader: exhibit first, build fallback |

**Pipeline**

`refreshSongExperience()` (called from `process-song.ts`) now writes:

```
ops/intelligence/packages/RVTRxxxx/experience.json
```

Contents: primary + learnMore chapters, director plan, living schedule, RVBR era exhibit, profile.

**Page load**

`/retroverse-2/song/[rvtr]` → `loadPatronSongExperience()` → reads `experience.json` when fresh vs package `updatedAt`; otherwise builds at request time (dev/unmigrated packages).

Chart Journey still hydrates `TrackPageData` at render time for trajectory weeks (presentation only).

## Checkpoint

```bash
RETROVERSE_DEV_NO_CLEAN=1 RETROVERSE_OPS=1 npx next dev -H 0.0.0.0 -p 3000
```

Reprocess a package to generate `experience.json`, then load:

`/retroverse-2/song/RVTR044043`

You should see: 2 story max, chart, discovery (≤3 shelves), sources, and **Learn More** for overflow.

## Chart Journey (Part 5)

- Hard milestone colors: #41–100 green, #21–40 yellow, #11–20 orange, #2–10 red-orange, #1 bright red + glow
- Removed archetype UI badges; narrative paragraph kept
- Chart `summary` precomputed into `experience.json`

## Files changed (additions)

- `build-song-experience.ts` — dedupe + layout pipeline
- `experience-types.ts` — `learnMore`, discover `shelves[]`
- `experience-director.ts` — multi-shelf discover scoring
- `discover-shelves.ts` — prioritize + Related Songs / Essential Albums titles
- `refresh-song-experience.ts` — saves `experience.json`
- `paths.ts` — `publicExhibitPath()`, `songPackageDir()`
- `LivingSongExperience.tsx` — Learn More section
- `page.tsx` — `loadPatronSongExperience()`
- CSS: `song-experience.css`, `chart-journey.css`, `living-song.css`
