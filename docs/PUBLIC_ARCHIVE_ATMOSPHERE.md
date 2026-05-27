# Archive Atmosphere Consistency Pass

One institution, one exhibit language — no redesign, no new modules.

## Atmosphere findings

| Drift | Fix |
|-------|-----|
| “In Your Library” (streaming-app) | **Collected recordings** |
| Nav “Library” / “Explore” | **Collected** / **More** |
| “Explore Deeper” / “Explore chart history” | **Further in the archive** / **Chart history →** |
| Artist loading “Loading artist file…” | Quiet **…** (matches track loading) |
| RVAL on artist chart spotlight | **Removed** from public facts line |
| Library song/album counts on hero | **Suppressed** on main exhibit (calmer) |
| Album-only hero (no tracks/chart) | **`track-exhibit--sparse`** (same as track orphans) |

## Language rhythm (aligned)

| Surface | Eyebrow / tag | Section tone |
|---------|---------------|--------------|
| Track | From the archive · **Song** | Appears on · Song journey · Related songs |
| Album | From the archive · **Album** | Tracks · Album journey |
| Artist | **Artist** tag · exhibit nav | Essential Albums · Songs · archival section titles |

Empty sections: “Nothing in the archive for this section yet.”

## Loading + fallback

- Track loading: grain + hero plate + **…** (no “file” language)
- Artist loading: **…** inside exhibit shell
- Cover: **plate** fallback on track/album; vinyl on artist tiles only

## Healed vs degraded atmosphere

| | Degraded | Healed |
|--|----------|--------|
| Mood | Sparse hero, plate mat, footer | Artwork + Appears on + journey |
| Density | Fewer labels, no ID chrome | Editorial list, not shelf clutter |
| Trust | Intentional quiet | Naturally fuller, not busier |

## Cross-entity continuity

- Shared paper palette, grain, `exhibit-footer-nav`
- List sections use same row rhythm (track related / Appears on / album tracklist)
- No ops IDs, no “coming soon” on public exhibits

## Governance

- No ops expansion, search changes, or cinematic effects
- Atmosphere over feature visibility

See also: `docs/PUBLIC_ARCHIVE_TRUST.md`, `docs/PUBLIC_ARCHIVE_COHERENCE.md`
