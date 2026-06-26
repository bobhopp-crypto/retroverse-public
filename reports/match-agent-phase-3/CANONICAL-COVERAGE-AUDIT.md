# Canonical Coverage Audit

**Scanned:** 2026-06-24T04:32:53.007Z  
**Matched VIDEO tracks (RVTR label):** 8,476  
**Conflict reassignments simulated:** 9 files (250 conflict rows)  
Read-only — no assignments modified.

---

## Identity distribution (matched VIDEO files)

| identity_source | Before | % | After | % | Δ |
|-----------------|-------:|--:|------:|--:|--:|
| `hot100` | 1482 | 17.5% | 1490 | 17.6% | +8 |
| `hot100_vdj` | 3485 | 41.1% | 3486 | 41.1% | +1 |
| **Chart layer (hot100 + hot100_vdj)** | **4967** | **58.6%** | **4976** | **58.7%** | **+9** |
| `vdj` | 3509 | 41.4% | 3500 | 41.3% | -9 |
| other | 0 | 0% | 0 | 0% | 0 |
| missing | 0 | 0% | 0 | 0% | 0 |

---

## Chart coverage (Hot 100 universe, label-based)

Simulates: VIDEO label RVTR → canonical sibling for 9 conflicts.

| Metric | Before | After | Δ |
|--------|-------:|------:|--:|
| Hot 100 chart RVTRs in universe | 32,187 | 32,187 | — |
| Chart RVTRs with VIDEO label | 4,597 | 4,606 | **+9** |
| Chart label coverage | 14.3% | 14.3% | **+0.0pp** |

---

## Artist coverage (Hot 100 artists with ≥1 VIDEO label)

| Metric | Before | After | Δ |
|--------|-------:|------:|--:|
| Hot 100 artists in universe | 7,985 | 7,985 | — |
| Artists with any chart RVTR labeled | 1,926 | 1,930 | +4 |
| Artists with canonical-identity label | 1,926 | 1,930 | **+4** |

---

## Package coverage (matched VIDEO files)

| Metric | Before | After | Δ |
|--------|-------:|------:|--:|
| Intelligence package (published/cards_ready/approved) | 212 | 212 | **+0** |
| Any package file | 1,264 | 1,264 | +0 |
| Assigned RVTR has Hot 100 | 4,967 | 4,976 | **+9** |

---

## Sample reassignments

- `RVTR392640` (vdj) → `RVTR668403` (hot100) — /Users/bobhopp/DJ MEDIA/VIDEO/2000's/'NSYNC - It's Gonna Be Me.mp4
- `RVTR289987` (vdj) → `RVTR163787` (hot100) — /Users/bobhopp/DJ MEDIA/VIDEO/1990's/'NSYNC - God Must Have Spent A Little More Time On You.mp4
- `RVTR015056` (vdj) → `RVTR057442` (hot100_vdj) — (by rvtr RVTR015056)
- `RVTR533227` (vdj) → `RVTR694462` (hot100) — /Users/bobhopp/DJ MEDIA/VIDEO/1990's/3 Doors Down - When I m Gone.mp4
- `RVTR179376` (vdj) → `RVTR828046` (hot100_vdj) — (by rvtr RVTR179376)
- `RVTR693931` (vdj) → `RVTR698984` (hot100_vdj) — (by rvtr RVTR693931)
- `RVTR700052` (vdj) → `RVTR929815` (hot100_vdj) — /Users/bobhopp/DJ MEDIA/VIDEO/2000's/All American Rejects - Move Along.mp4
- `RVTR695293` (vdj) → `RVTR939314` (hot100_vdj) — /Users/bobhopp/DJ MEDIA/VIDEO/2000's/All American Rejects - Gives You Hell.mp4

---

## Notes

- **Label-based simulation** — assumes VDJ label is the ownership signal for chart/artist coverage (graph `media_track_links` unchanged).
- Reassignments sourced from `conflict-reassignment.csv` (250 rows).
- Intelligence package counts use package index status; review packages with story cards not counted unless status qualifies.
