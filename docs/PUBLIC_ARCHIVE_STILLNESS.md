# Archive Stillness Pass

Stillness refinement — no new modules, motion systems, or UI chrome.

## Stillness findings

| Pressure | Adjustment |
|----------|------------|
| Heavy hero drop shadow | Softer offset shadow (`exhibit-stillness.css`) |
| Journey panel double shadow | Border frame only — shadow removed |
| Chart week glow halos | Glow reduced — rail reads calmer |
| Section headings 900 + wide tracking | Weight 800, tighter letter-spacing |
| Orange underline on track artist link | Solid link color, no underline shout |
| Artist “View All” hover brightness | Hover → slight opacity only |
| Song stack preview cards | Opacity 0.32 — quieter periphery |
| Sparse orphan pages | `min-height` + footer breathing room |
| Loading track page | Same sparse shell as degraded exhibit |

## Motion / interaction

- No new animations added
- Sticky footer retained (institutional anchor) — link weight softened
- Artist scroll restore unchanged (navigation memory, not spectacle)
- Search / ops untouched

## Healed vs degraded calmness

| | Degraded | Healed |
|--|----------|--------|
| Density | Hero + footer, patient vertical space | + Appears on / journey — same list rhythm |
| Tone | Plate cover, no motion | Artwork in existing frame |
| Risk | Feels empty if shadows too loud | Feels complete without stat grids |

## Typography rhythm

Shared across artist → album → track:

- Eyebrow: **From the archive**
- File tag: **Song** / **Album** / **Artist**
- Section heads: uppercase but lighter weight
- Footer: Home · Search · artist (700 weight)

## Files

- `app/exhibit-stillness.css` — imported by track + artist exhibit CSS
- Prior passes: `PUBLIC_ARCHIVE_RESTRAINT.md`, `PUBLIC_ARCHIVE_TRUST.md`, `PUBLIC_ARCHIVE_ATMOSPHERE.md`
