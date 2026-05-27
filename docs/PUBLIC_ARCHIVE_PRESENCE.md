# Archive Presence Refinement Pass

Presence refinement — warmth, pacing, and museum tone. No new modules, interaction systems, or metadata density.

## Presence findings

| Leakage | Fix |
|---------|-----|
| Vinyl disc on artist hero | Removed (decorative, cinematic) |
| Footer orange hover + flat charcoal bar | Warm gradient bar; tan hover |
| Bright album tracklist (`#fff8ee`) | Paper-warm stack, softer shadow |
| Cool charcoal→teal plate fallback | Warm archival gradient |
| “Song journey” / “Album journey” labels | **Chart history** (editorial continuity) |
| Aggressive tracklist title hover (teal flash) | Opacity soften only |

## Atmosphere / temperature

- Grain opacity 0.035 → **0.05** (tactile paper, not noise)
- Journey panel warm tan gradient
- Dark section heads: subtle teal gradient (institutional)
- #1 chart rank: dusty rust vs alert orange
- Artist file tag aligned to track tag scale

## Rhythm continuity

- Section bottom margin **2.75rem** on track/album exhibit blocks
- Hero margin tuned for artist → album → track flow
- Footer padding + weight aligned across exhibits

## Healed vs degraded presence

| | Degraded | Healed |
|--|----------|--------|
| Feel | Sparse shell, warm plate, patient space | Same frames; chart + lists fill naturally |
| Risk | Empty + cold gradients | “Upgraded UI” — avoided; no restoration badges |

## Files

- `app/exhibit-presence.css` — imported after stillness on track + artist CSS
- `app/exhibit-footer.css` — footer weight/hover baseline
- Prior: `PUBLIC_ARCHIVE_STILLNESS.md`, `PUBLIC_ARCHIVE_RESTRAINT.md`
