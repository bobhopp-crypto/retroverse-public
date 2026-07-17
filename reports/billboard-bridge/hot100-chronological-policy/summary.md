# Hot 100 Chronological Album Policy Audit

Read-only report generated 2026-07-16T17:49:04.021Z. Population is restricted to canonical_track_display.has_hot100 = true. No PostgreSQL data, bridge rows, migrations, artwork, loaders, or unrelated application code were changed.

| Metric | Count |
|---|---:|
| Hot 100 RVTRs | 32187 |
| RVTRs with no linked album | 16971 |
| RVTRs with one linked album | 11176 |
| RVTRs with multiple linked albums | 4040 |
| Current primary differs from historicalAlbum | 1369 |
| Artwork fallbacks | 142 |
| No valid artwork | 1174 |
| No usable album chronology | 0 |
| Cross-artist relationships | 16 |
| Duplicate bridge rows removed at read time | 7541 |

Chronology: release year, then first Billboard 200 appearance, track position, RVAL, album ID. Original release dates are not present in the current schema. current_primary_heuristic reproduces the prior presentation classification only for audit comparison; it is not used by the new public resolver.

Known-track verification is in known-track-verification.csv.
