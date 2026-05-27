# Public Archive Trust Tightening

Subtle trust refinement — no redesign, no new modules, no ops expansion.

## Trust findings

| Area | Before | After |
|------|--------|-------|
| File tags | `Song File · RVTR…` (technical IDs on public) | **Song** / **Album** / **Artist** only |
| Eyebrow | “Now entering” (lobby/app tone) | **From the archive** |
| Cover fallback | Vinyl deco possible in component | **Plate** gradient on track/album heroes |
| Sparse orphans | Felt like empty app shell | **`track-exhibit--sparse`** — extra hero breathing room |
| Related songs meta | Year + peak on every row | **Year only** — less chart noise |
| Loading copy | “Loading song file…” | Ellipsis only — no technical language |

## Degraded-state calmness

**Intentional sparse exhibits** (no albums, no journey, no related):

- Hero + footer only
- Archival plate cover (not error UI)
- No filler modules, no “coming soon”
- Hot 100 badge only when chart-qualified

**Still jarring without healing:** large plate with no Appears on — expected until curator links album.

## Fallback behavior

- Missing cover = teal/charcoal **plate** inside framed hero — reads as archival mat, not broken image
- No “No cover” / “Coming soon” labels on track/album heroes
- Artist tiles retain vinyl fallback where decorative density fits

## Metadata density reductions

- Removed public RVTR/RVAL/file codes from topbars
- Removed peak labels from track related-song rows
- Previously removed: VDJ “In library” badge, horizontal shelves, Inspect footer link

## Healed vs degraded continuity

| | Degraded orphan | Healed / healthy |
|--|-----------------|------------------|
| Cover | Plate gradient | Artwork in hero frame |
| Album path | Section omitted | **Appears on** list |
| Chart | Journey when data exists | Same |
| Feel | Sparse, editorial | Complete exhibit rhythm |

Healing should change what visitors **see**, not only graph rows.

## Cross-entity rhythm

- Shared `exhibit-footer.css`: Home · Search · artist name
- Track/album share `track-page.css` + section list pacing
- Artist shell uses same footer class and file-tag tone

## Governance

- No new ops panels this pass
- No search or automation changes
- Curator IDs remain in `/inspect` and ops — not on public heroes

## Verify

```bash
npm run dev
# /track/{orphan-rvtr}  — sparse class, plate cover, no ID in tag
# /track/RVTR336241     — cover + Appears on + journey
```
