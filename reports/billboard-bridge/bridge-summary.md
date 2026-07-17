# Billboard Bridge Normalization

Read-only analysis generated 2026-07-16T17:33:44.635Z. No PostgreSQL writes, migrations, repairs, application, loader, artwork, bridge, or policy changes were performed.

## Scope and ordering

Sources: canonical_album_tracks, canonical_track_album_links, rvtr_album_memberships. Exact relationship keys were deduplicated by RVTR + album ID + track number. Album release dates are unavailable in the current schema; ordering therefore uses release year, track number, and album ID.

## Counts

| Metric | Count |
|---|---:|
| RVTRs with bridge evidence | 49187 |
| Missing albums | 31428 |
| One album | 8051 |
| Multiple albums | 9708 |
| Unique normalized relationships | 31931 |
| Cross-artist relationships | 17 |
| Duplicate bridge relationships | 1407 |
| No artwork on any linked album | 1793 |

## Simulation

The historical policy selects the earliest normalized album as Primary Historical Album, the first chronological album with artwork for Display Artwork, and all remaining albums as Also Appears On. A complete current-primary comparison could not be computed from a stable stored primary-album field in the bridge sources; the policy-differences file therefore contains duplicate-evidence cases requiring review, without changing them.

## Obvious cautions

- Missing release dates mean same-year albums are ordered by track number and stable album ID, as required.
- Cross-artist relationships and albums without artwork are surfaced, not repaired.
- Billboard 200 membership is evaluated from existing chart appearance/linkage evidence only.

See the accompanying CSV files for the full normalized and filtered inventories.
