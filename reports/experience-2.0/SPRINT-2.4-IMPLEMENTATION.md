# Experience 2.4 — Mobile Typography & Layout Polish

Polish pass only. No functionality or data changes.

## P0 — Text overflow

| Area | Fix |
|------|-----|
| Song page root | `overflow-x: clip` on `.rv2-song` and experience flow |
| Hero title / artist | `overflow-wrap: anywhere`, removed `max-width: 10ch` constraint |
| Section headings | Wrap on all chapter `h2` elements |
| Story cards | Wrap on title, body, context |
| Beyond the Charts | Wrap on title + description; fixed grid `minmax(0, 1fr)` |
| Chart Journey narrative | Wrap + `max-width: 42rem` placard |
| Chart row detail panel | Wrap; removed left margin offset that pushed content off-screen |
| Discover shelf titles | `-webkit-line-clamp: 2` + wrap |
| Behind the Story | Wrap on summary, entry previews, group headings |

## P0 — Flexbox / grid shrinking

| Component | Fix |
|-----------|-----|
| All chapters | `min-width: 0` on containers |
| Story cards | `min-width: 0`, `max-width: 42rem` |
| Timeline rows | Description column `min-width: 0`; year column `flex-shrink: 0` |
| Discover rails | `min-width: 0` on shelf, rail, cards |
| Chart Journey rows | Removed `min-width: min(100%, 22rem)`; full-width grid with `minmax(0, 1fr)` bar column |
| Chart date column | `min-width: 0` (was preventing shrink) |

## P0 — Responsive typography (mobile)

| Element | Before (approx) | After |
|---------|-----------------|-------|
| Song title | up to 56px+ | `clamp(3rem, 11vw, 3.4rem)` → 48px on narrow phones |
| Section titles | up to 44px | `clamp(2.125rem, …)` → 34px floor |
| Story titles | up to 23px | `clamp(1.5rem, …)` → 24px floor |
| Body / story text | up to 20px | `clamp(1.125rem, …)` → 18px floor |

## P1 — Discovery shelves

- Titles clamped to **2 lines** with ellipsis
- Cards use flex column + `min-height: 2.5em` on title for equal card height
- Rail: `scroll-behavior: smooth`, `overscroll-behavior-x: contain`, momentum scrolling

## P1 — Story cards

- Horizontal padding increased (`0.85rem` chapter, card `max-width: 42rem`)
- Targets ~60–70 characters per line on phone

## P1 — Timeline (Beyond the Charts)

- Year column fixed at `3rem` / `3.25rem`, never shrinks
- Description gets remaining width with wrap

## P1 — Chart Journey

- Narrative padding `1rem 1.05rem`, line-height 1.55
- `max-width: 42rem` exhibit placard width
- Narrower date/rank columns on mobile to preserve bar space

## P2 — Hero

- Tighter vertical rhythm: artist/year margins reduced
- Artwork stays **1:1** (removed landscape 16:9 override on phone)
- Smaller max artwork width on mobile (`16.5rem`) so hero fits one screen

## P2 — Touch targets

- Chart rows: `min-height: 2.75rem` (44px)
- Chart detail link: `min-height: 2.75rem`
- Play overlay: `min-height/width: 2.75rem`
- Behind the Story summary + entries: `min-height: 2.75rem`
- Edit button: `min-height: 2.75rem`

## Files changed

- `components/retroverse/experience/song-experience.css`
- `components/retroverse/experience/chart-journey.css`
- `components/retroverse/experience/retroverse-video-player.css`
- `app/retroverse-2/song/[rvtr]/retroverse-song-2.css`

## Not modified

Browser Plus, package generation, research pipeline, component logic.
