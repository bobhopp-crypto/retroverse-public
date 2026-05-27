# Public Archive Coherence Pass

Read-only audit after healing + public continuity verification. No new public modules, no ops expansion.

## Coherence findings

| Area | Finding | Action |
|------|---------|--------|
| Track album path | Album links existed in data but not on `/track` UI — healed entities could not show continuity visitors expect | **Fixed:** calm vertical “Appears on” list (no horizontal shelf) |
| Footer rhythm | Artist footer used 4 links + `Inspect`; track/album used 3 links | **Fixed:** shared `exhibit-footer-nav`, artist matches Home / Search / artist name |
| Metadata noise | “In library” VDJ badge on public track hero reads as ops chrome | **Suppressed** on track page; Hot 100 badge kept |
| Dead CSS | Unused horizontal shelf tile rules | **Removed** from `track-page.css` |
| Cover fallback | Teal gradient placeholder is intentional; no broken-image flash | No change |
| Album prefetch | Album page links lacked `prefetch` parity with track | **Aligned** |

## Healed vs degraded experience

| Surface | Healed / healthy (e.g. RVTR336241 Thriller) | Degraded orphan |
|---------|---------------------------------------------|-----------------|
| Hero cover | Cover from linked album art | Gradient fallback — calm but emotionally thin |
| Appears on | List visible when graph has links | Section omitted — no empty shelf |
| Song journey | Chart rail when Hot 100 data exists | Omitted when no chart rows |
| Related songs | Artist shelf (≤4) | Same pattern when peers exist |
| Footer | Sticky Home / Search / artist | Identical |

**Observation:** Healing improves *felt* completeness when cover + “Appears on” both appear. Graph-only heals without cover remain `partial` in ops continuity — public page now surfaces album path when links exist.

**Still jarring:** Chart-heavy tracks with no album graph — hero + journey only, large fallback cover. Restoration desk priority, not a layout bug.

## Footer continuity

All exhibit types now use `app/exhibit-footer.css`:

- Sticky bottom, charcoal bar, aqua links, orange hover
- Three links: **Home · Search · {artist display name}**
- Inspect link removed from artist shell (utility drift)

## Section pacing

- **Prefer suppression:** horizontal album shelf (removed earlier), VDJ badge, Inspect footer link
- **Editorial order on track:** Hero → Appears on (if any) → Song journey → Related songs → Footer
- Related songs and Appears on share list rhythm (`track-related__list`) — one pacing language

## Cover continuity

- Hero cover resolves from first linked album with artwork (`loadTrackPage`)
- Missing cover: gradient frame matches album/artist fallback family — reads intentional, not error state
- Healed link + album art path → strongest public continuity signal

## Exhibit trust question

> Does this feel like a coherent historical exhibit?

**Yes when:** artist link, optional Appears on, chart journey, and cover align.  
**Not yet when:** orphan Hot 100 hit with no graph — exhibit is intentionally sparse until healing.

## Candidate suppressions (future)

- Avoid re-adding horizontal scroll shelves on track/album
- Avoid ops-only badges on public hero
- Avoid fourth footer utility links without editorial reason

## Verification

```bash
RETROVERSE_OPS=1 npm run dev
# Compare:
# /track/RVTR336241  (healthy)
# /track/RVTR430551  (degraded target — before/after heal)
```

Ops healing console public continuity panel should match live `/track` after heal (album list + cover).
