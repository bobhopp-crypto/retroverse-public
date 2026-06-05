# Media Lab Review Screen Redesign

Branch: `media-lab-review-redesign`

## Mockup comparison

| Zone | Before (workstation) | Target mockup | After (this branch) |
|------|---------------------|---------------|---------------------|
| Top bar | Focus/Advanced + inline title | RETROVERSE MEDIA LAB + source + clip nav + queue box | ✅ `ops-ml-review__topbar` |
| Video | Left 75%, metadata header | Large center-left | ✅ Full center column |
| Timeline | Thumbnail rail + `XXs` readouts | IN/PLAYHEAD/OUT/LEN + ruler + handles | ✅ Extended `ClipSelectionPanel` |
| Title / categories | Left column + AI detail panel | Right: Suggested Name + 3×3 types | ✅ Right sidebar |
| Queue | All chapters in sidebar | Kept items only, removable | ✅ `ReviewQueuePanel` |
| Chapter nav | None at bottom | Full-width filmstrip + clock + title | ✅ `ClipQueueFilmstrip` `layout="filmstrip"` |
| Keep button | Explicit Keep & Queue | Category = save | ✅ Removed; `categorizeAndAdvance` unchanged |
| Transcript | Hidden in main | Not visible | ✅ Advanced only |

Reference mockup: `mockup-target.png`

## Component reuse

| Component | Action |
|-----------|--------|
| `ClipSelectionPanel` | Extended — timeline, handles, seek (unchanged logic) |
| `ClipQueueFilmstrip` | Extended — `layout="filmstrip"` for bottom nav |
| `CuratorClassificationPanel` | Repositioned to right sidebar |
| `ReviewQueuePanel` | **New** — thin wrapper, uses kept chapters + remove |
| `FocusReviewDeck` | Reflowed — same props pattern, fewer handlers |
| `MediaLabEditorialReview` | Wired `regenerateTitle`, `removeFromQueue`; business logic preserved |

## Files modified

- `components/ops/media-lab/FocusReviewDeck.tsx`
- `components/ops/media-lab/ClipSelectionPanel.tsx`
- `components/ops/media-lab/ClipQueueFilmstrip.tsx`
- `components/ops/media-lab/ReviewQueuePanel.tsx` (new)
- `components/ops/media-lab/MediaLabEditorialReview.tsx`
- `app/ops/ops.css`
- `reports/media-lab-workstation/mockup-target.png`

Not touched: job loading, API routes, export, non-focus editorial layout, `OpsMediaLab.tsx`.
