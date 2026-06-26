# Experience 6.0 — RVBR Integration (Revised)

## Principle: Smithsonian

**Retroverse is the museum building** — blue command-center UI, constant across all pages.

**RVBR is the exhibit design** — content inside the galleries changes with the era.

RVBR must **not** recolor panels, charts, typography, or global CSS variables.

## What was rolled back

Removed the 6.0 chrome experiment:

- `RvbrEraShell` wrapper
- `rvbr-era-skin.css` (page skins, `--rv2-*` overrides, chart recoloring)
- `song-era-skin.ts` (CSS var generation)

## What remains

### `lib/retroverse/rvbr/canon-profiles.ts`

Song year → Era Atlas profile (file-backed canon).

### `lib/retroverse/rvbr/song-era-exhibit.ts`

`resolveSongEraExhibit(year)` → content only:

| Field | Use |
|-------|-----|
| `eraName`, `eraYears` | Hero exhibit kicker |
| `atmosphereDescription` | Visual world description (placard copy) |
| `artifactReference` | Primary artifact label (Fillmore posters, MTV passes, etc.) |
| `exhibitForms` | Suggested forms for future story/discovery illustrations |
| `visualWorldId` | Hook for future chapter exhibit rendering |
| `moodLine`, `typographyHint` | Future story chapter styling |

**No colors. No CSS vars. No UI chrome.**

### Song page hero

Exhibit copy uses existing Retroverse tokens (`--rv2-cyan`, `--rv2-muted`) in `retroverse-song-2.css`.

## Future (exhibit inside containers)

RVBR drives presentation **inside** story cards, discovery shelves, and hero illustrations:

- 1967 → psychedelic poster, Fillmore ticket, newspaper clipping
- 1984 → MTV frame, VHS overlay, cassette insert
- 1997 → CD booklet, website screenshot, magazine ad

Interface stays constant. Only exhibit pieces change.

## Reused RVBR infrastructure (unchanged)

- `data/rvbr/eras-canon.json`
- `resolve-visual-world.ts` → `visual-worlds.ts`
- `rvbr-prompt-profile.ts`
- `lib/ops/rvbr/presentation.ts`

## Test

```bash
RETROVERSE_DEV_NO_CLEAN=1 RETROVERSE_OPS=1 npx next dev -H 0.0.0.0 -p 3000
```

Checkpoint: song page should look **Retroverse blue** — same panels/charts as before 6.0. Hero may show era kicker + atmosphere + artifact label as **text only**.
