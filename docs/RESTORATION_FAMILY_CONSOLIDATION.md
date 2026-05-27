# Restoration Family Consolidation

Curator reference — repeatable degradation families without automation.

## Consolidated families (priority order)

| Family | Typical scale | Safety | Public impact | Safest approach |
|--------|---------------|--------|---------------|-----------------|
| Missing links / general degraded | Corpus-wide | Cautious | Medium | Full audit; re-classify after top candidate review |
| Cover-critical chart gap | Hot 100, 8+ weeks, no cover | Cautious | **High** | Same-artist studio LP with cover before compilation |
| VDJ-only overlay | Orphan VDJ + no graph link | Cautious | **High** | Studio album by era; media proves existence only |
| Early-era orphan single (Motown-class) | 1960s Hot 100 orphans | Cautious | Medium | 45/EP or first LP slot — not Greatest Hits |
| Duplicate ingest family | Title/artist key duplicates | **High risk** | Medium | Heal probable canonical RVTR only |
| Compilation-poisoned | GH / Best Of tops | **High risk** | Low | Studio LP first; compilation curator-only |
| Soundtrack trap | OST in candidate set | **High risk** | Low | Confirm film-led intent |
| Anthology weak join | Weak year + anthology | **High risk** | Low | Reject slot; hunt original LP |
| Ambiguous multi-candidate | Tied confidence | **High risk** | Medium | Manual compare top 2–3 |
| High-confidence studio match | Same artist, year, tracklist | **Safe** | **High** | Verify slot → single controlled approve |

## Safest restoration patterns

1. Same artist + release year aligned + `album_tracklist_title_matches`
2. `canonical_track_album_link_bridge` (sibling already on album)
3. Trusted band (match ≥ 0.45, curator trust ≥ 0.72) after visual album check
4. Cover-critical heals: studio album with canonical cover path

## Highest-risk families (curator-only caution)

- **Greatest Hits / anthology** — false confidence from title slots; era poison
- **Soundtrack** — artist mismatch; OST cover win
- **Duplicate RVTR** — scoring on wrong variant
- **Tied candidates** — first row not always correct LP

## Public continuity impact (not row count)

Healing matters when `/track` gains:

- Hero cover visible
- **Appears on** album list (vertical, editorial)
- Coherent artist → album → track path

Highest impact: cover-critical chart orphans and VDJ overlays healed to studio LPs with art.

## Governance

- One approve at a time (`RETROVERSE_HEALING_APPLY=1`)
- Rollback via proposal id
- Ops console surfaces families; does not auto-apply

See also: `docs/PUBLIC_ARCHIVE_COHERENCE.md`, `/ops/healing` consolidation panel.
