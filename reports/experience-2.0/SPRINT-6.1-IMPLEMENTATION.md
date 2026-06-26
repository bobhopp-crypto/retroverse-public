# Experience 6.1 — Public Experience Cleanup

Refinement pass only. No new features, engines, or data sources.

## 1. Audience modes removed

- Deleted Casual / Music Nerd toggle, localStorage key, and all mode branching
- `LivingSongExperience` shows one experience — all chapters visible in browse mode
- Removed `AudienceMode`, `casualVisible`, `nerdOnly`, `audienceDefaults` from timeline engine
- Removed `casual` prop from `SongStory`
- Cleaned `living-song.css` mode-specific rules

## 2. Internal terminology scrubbed

New `lib/retroverse/experience/public-copy.ts` sanitizes patron-facing text:

- Strips RVTR IDs, "Retroverse track identity", canonical cover boilerplate, graph language
- Applied to story card body/context, control fallbacks, and Behind the Story previews

## 3. Section titles simplified

Story cluster titles (`story-cluster.ts`):

| Before | After |
|--------|-------|
| Album Context | From the Album |
| Recording | In the Studio |
| Music Video | The Video |
| Live Performances | Live on Stage |

Discovery shelves (`discover-shelves.ts`):

| Before | After |
|--------|-------|
| More from {artist} | More by {artist} |
| Songs from {year} | Also from {year} |
| Essential Albums | Essential Listening |
| Songs That Beat It | The Competition |
| Songs It Beat on the Chart | Keeping It Off #1 |

## 4. Redundant subtitles removed

- Shelf `reason` lines removed from `DiscoverMore` header
- Card-level `reason` removed from discovery UI (including attract tour)
- All shelf/card `reason` fields set to `null` at build time

## 5. Weak chapters merged

- `consolidateWeakStoryClusters()` merges thin performance/video/recording chapters
- Minimum story body raised to 80 characters
- Director max major chapters reduced to 4 (min 2)

## 6. Discovery quality filters

Shelves only render when:

- At least 2 cards with artwork
- No single-item weak shelves

## 7. Preserved unchanged

- Hero, Chart Journey, Timeline, Director ordering, discovery architecture
- Retroverse blue UI (6.0 chrome rollback intact)

## Screenshot

Capture manually after dev start:

```bash
RETROVERSE_DEV_NO_CLEAN=1 RETROVERSE_OPS=1 npx next dev -H 0.0.0.0 -p 3000
```

Open `/retroverse-2/song/RVTR044043` (or any experience-ready song).

Save to: `reports/experience-2.0/sprint-6.1-song-page.png`

## Remaining internal terminology risk

Sanitizer runs at render time, but **package-generated story facts** may still contain odd ops phrasing if it doesn't match known patterns. Watch for:

- Residual "canonical" in older packages
- Label names that echo VDJ/ops vocabulary in story body text
- Behind the Story source names that say "Retroverse" (vault entries with retroverse-* ids are already filtered)

If a specific sentence still leaks, add a targeted pattern to `public-copy.ts` — do not patch individual songs.
