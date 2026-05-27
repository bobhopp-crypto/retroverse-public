# Archive Institutional Cohesion Pass

One archive, one editorial register — no redesign, new modules, or decorative styling.

## Institutional cohesion findings

| Drift | Fix |
|-------|-----|
| Artist lacked **From the archive** eyebrow | Added to exhibit shell (matches track/album) |
| Artist section heads (condensed display scale) vs track | Unified **1.18rem** uppercase register in `exhibit-cohesion.css` |
| Album sections missing track anchoring rules | Same border-top + 52rem column as track |
| Product section titles on artist | Albums · Recordings · Chart years · Chart album · Related artists |
| Track **Related songs** | **Related recordings** (pairs with Collected recordings) |
| Album chart `aria-label` product phrasing | **Chart history** |
| Sub-route placeholder titles | Aligned to same vocabulary |

## Editorial governance

| Avoid | Use |
|-------|-----|
| Essential Albums | Albums |
| Songs (feature) | Recordings |
| Dominant Years (analytics) | Chart years |
| Top Album | Chart album |
| Related songs | Related recordings |
| Song journey / Album journey | Chart history (prior pass) |

Nav unchanged: Exhibit · Charts · Collected · More · footer Home · Search · artist.

## Structural continuity

- Shared exhibit CSS stack through `exhibit-cohesion.css`
- Artist / album / track: eyebrow + file tag + section register + footer
- Empty states: “Nothing in the archive for this section yet.”

## Healed vs degraded governance

| | Degraded | Healed |
|--|----------|--------|
| Language | Same institutional titles | Fuller sections, same voice |
| UI | No restoration/ops chrome | Conservation, not “fixed” software |

## Files

- `app/exhibit-cohesion.css`
- `app/artist/[slug]/artist-exhibit-shell.tsx`
- Artist / track / album copy alignments
- Prior: `PUBLIC_ARCHIVE_PERMANENCE.md`, `PUBLIC_ARCHIVE_WEIGHT.md`
