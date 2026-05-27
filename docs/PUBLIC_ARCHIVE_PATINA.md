# Archive Patina Pass

Archival patina — material consistency and softened physicality. No faux distress, new modules, or decorative systems.

## Patina findings

| Issue | Fix |
|-------|-----|
| Bright album tracklist (`#fff8ee`) | Paper-warm `#f4e9d3`, softer shadow |
| Synthetic gradients on journey/footer/sections | Flat paper/teal stock in `exhibit-patina.css` |
| Cool teal→charcoal plate fallback (base CSS) | Matte `#524a42` plate + light top wash |
| Sharp 2px list dividers | 1px ink-on-paper rules |
| Chart week halos (base + #1 state) | Patina flattens borders, mutes heat vars |
| Digital-sharp cover frames | Inset mat line + lighter offset shadow |
| Hero artwork saturation | Very mild contrast/saturation soften |

## Material consistency

Exhibits read as: **paper** (warm fields), **ink** (soft frames/dividers), **plate** (matte fallback), **frame** (cover mats). Not glass cards or streaming gradients.

## Temperature consistency

- Paper tokens nudged warmer (`#f2e6d0` / `#e3d4b4`)
- Grain warm cast (low opacity)
- Logo orange dustier (`#c46e4a`)
- Footer flat `#324450` (institutional bar)

## Degraded vs healed

| | Degraded | Healed |
|--|----------|--------|
| Field | `#efe3cb` sparse shell, inset plate | Standard warm paper |
| Plate | Matte with preserved absence | Artwork in same mat frame |
| Feel | Archived gap | Fuller, not “upgraded” |

## Files

- `app/exhibit-patina.css` — imported after presence on track + artist CSS
- `app/album/[id]/album-page.css` — tracklist + journey stock alignment
- Prior: `PUBLIC_ARCHIVE_PRESENCE.md`, `PUBLIC_ARCHIVE_STILLNESS.md`
