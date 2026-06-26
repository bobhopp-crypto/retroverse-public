# Experience 7.0 — Deliverables

Checkpoint song: **RVTR044043** (`/retroverse-2/song/RVTR044043`)

---

## Before / After — Request-Time Work

| Stage | Before (6.x) | After (7.0, with `experience.json`) |
|-------|----------------|-------------------------------------|
| Story clustering | Every request | Package generation only |
| Director scoring & ordering | Every request | Precomputed in JSON |
| Chapter deduplication | Every request | Precomputed |
| Primary / Learn More layout | Every request | Precomputed |
| Discovery shelf building & ranking | Every request | Precomputed |
| Living Song schedule | Every request | Precomputed |
| RVBR era assignment | Every request | Precomputed |
| Public copy sanitization | At card build (still at generation) | Same, frozen in JSON |
| Chart narrative summary | Built at render | Precomputed `summary` field |
| Chart bar colors / fingerprint | Every request | Still at render (visual only, O(weeks)) |
| Artist / year destination fetch | Every request | Still for fallback builds; skipped when JSON fresh |

**Fallback path** (no `experience.json` or stale package): full build still runs — same as before, but output is now the simplified 5–7 section layout.

**Expected speedup:** Hydrating a precomputed exhibit is essentially JSON parse + track hydration for chart weeks — typically **10–50× faster** than the full intelligence pipeline (clustering + director + discovery graph expansion). Exact ms depends on DB latency for track/artist loads on your machine.

---

## Runtime Work Eliminated (when `experience.json` is fresh)

1. `clusterStoryCards()` / `consolidateWeakStoryClusters()`
2. `intelCardsFromFacts()`
3. `deduplicateExperienceChapters()`
4. `directExperience()` (Director)
5. `layoutPublicExhibit()` / `reconcileDirectorForPrimary()`
6. `buildDiscoverShelves()` + `prioritizeDiscoverShelves()`
7. `buildLivingSongPlan()` / timeline scheduling
8. `resolveSongEraExhibit()` (stored in JSON)
9. `buildChartJourneyStory()` at render (uses precomputed `summary`)

**Still at render (intentional):**

- `loadTrackPage()` — trajectory weeks for chart bars
- `buildChartJourney()` — bar widths + milestone colors (pure transform, no LLM/scoring)
- Video playback resolution

---

## What lives in `experience.json`

Path: `ops/intelligence/packages/RVTRxxxx/experience.json` (and bundled mirror under `data/`)

```json
{
  "version": 1,
  "rvtr": "RVTR044043",
  "packageUpdatedAt": "...",
  "builtAt": "...",
  "profile": { "storyWeight", "chartWeight", "dominant", ... },
  "director": { "openingId", "openingTitle", "majorIds", "chapters", ... },
  "eraExhibit": { "eraName", "eraYears", "atmosphereDescription", ... },
  "living": { "durationSec", "schedules", "openingId", ... },
  "primary": [
    { "kind": "story", "title", "cards" },
    { "kind": "chart_journey", "releaseYear", "summary" },
    { "kind": "discover", "shelves": [ ... max 3 ] },
    { "kind": "sources", "sections" }
  ],
  "learnMore": [ overflow stories, timeline, extra shelves ]
}
```

Regenerate on package publish: `refreshSongExperience()` in `process-song.ts`.

---

## Page Structure (7.0)

**Primary scroll (~5–7 sections)**

1. Hero
2. ≤2 story chapters (director-ranked)
3. Chart Journey (narrative + milestone-color fingerprint)
4. Discovery (≤3 shelves)
5. Continue Exploring

**Collapsed:** Learn More (Beyond the Charts, weak/extra stories, overflow shelves)

---

## Chart Journey Changes (Part 5)

- **Removed:** Archetype UI badges (Rocket, Slow Burner, etc.)
- **Kept:** Opening narrative paragraph (archetype language may still appear *in prose*)
- **Replaced:** Gradient heat map → **hard Billboard milestone colors**

| Position | Color | Band |
|----------|-------|------|
| #100–41 | Green | Hot 100 |
| #40–21 | Yellow | Top 40 |
| #20–11 | Orange | Top 20 |
| #10–2 | Red-orange | Top 10 |
| #1 | Bright red + subtle glow | #1 |

No new labels, legends, or overlays.

---

## Screenshot

After reprocessing a package and starting dev:

```bash
RETROVERSE_DEV_NO_CLEAN=1 RETROVERSE_OPS=1 npx next dev -p 3000
npx tsx tools/experience/capture-song-experience.ts RVTR044043
```

Output: `reports/experience-2.0/experience-7.0-rvtr044043-mobile.png`

---

## Remaining Duplicate Risk Areas

These may still overlap in edge cases — acceptable for 7.0, tighten in a future pass if needed:

1. **Chart narrative vs. story facts** — long story bodies (>360 chars) with chart mentions are kept even when Chart Journey exists.
2. **Recording vs. album** — dedup uses token overlap; very different wording about the same session may survive.
3. **Learn More timeline** — only shown when no Chart Journey; if chart data missing, timeline may repeat chart-like events.
4. **Attract tour** — still reads primary chapters only; may preview a story that also appears in Learn More on full browse (by design for tour brevity).
5. **Chart week expand rows** — per-week detail bullets on tap (not visible until interaction); not removed per “no new overlays” constraint on default view.

---

## Commands

```bash
# Typecheck
npx tsc --noEmit

# Regenerate exhibit (via package pipeline — requires server/DB context)
# Re-run process-song for target RVTR after code deploy

# Capture screenshot (dev server must be running)
npx tsx tools/experience/capture-song-experience.ts RVTR044043
```
