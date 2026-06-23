# VIDEO Linkage Coverage Audit

Generated: 2026-06-17T02:40:26.700Z
Source: `VIDEO/` folder in VirtualDJ `/Users/bobhopp/Library/Application Support/VirtualDJ/database.xml`

## Summary

| Metric | Count | % of VIDEO |
| --- | ---: | ---: |
| VIDEO files in library | 10,878 | 100% |
| VIDEO entries with RVTR | 206 | 2% |
| Unlinked VIDEO entries | 10,672 | 98% |
| Unique RVTRs (from VIDEO) | 202 | — |
| RVTRs with cover | 79 | 39% of RVTRs |
| Intelligence-eligible (RVTR + cover) | 79 | — |
| Retroverse Ready | 0 | 0% of RVTRs |

## Bottleneck

Linkage coverage is the primary scale blocker — not AI throughput.

- **Missing links:** 10,672 VIDEO files without RVTR
- **Missing covers:** 123 linked RVTRs without cover art
- **Missing packages:** 79 RVTRs with cover but no package

## Retroverse Ready Funnel

```text
VIDEO
  ↓
RVTR
  ↓
Cover
  ↓
Package
  ↓
Artifacts
  ↓
Retroverse Ready
```

| Stage | Count |
| --- | ---: |
| VIDEO | 10,878 |
| RVTR linked | 206 (2%) |
| Cover | 79 (39% of RVTRs) |
| Package | 0 (0% of RVTRs) |
| Artifacts | 0 (0% of RVTRs) |
| **Retroverse Ready** | **0** (0%) |

## Top Linked — Missing Cover (by play count)

| Plays | RVTR | Title | Artist |
| ---: | --- | --- | --- |
| 75 | RVTR102445 | Twist And Shout | Chaka Demus & Pliers |
| 56 | RVTR738810 | Love Rollercoaster | red hot chili peppers |
| 35 | RVTR605797 | Sex On The Beach | T Spoon |
| 29 | RVTR606992 | Lover | Sonia Dada |
| 25 | RVTR661273 | Mary Jane'S Last Dance | tom petty and the heartbreakers |
| 24 | RVTR094210 | All Mixed Up | 311 |
| 19 | RVTR949464 | To Be With You | mr. big |
| 10 | RVTR624060 | Kokomo | beach boys |
| 9 | RVTR663947 | Loser | beck |
| 8 | RVTR178704 | I'D Really Love To See You Tonight | England Dan & John Ford Coley |
| 7 | RVTR493499 | Have You Ever Seen The Rain | creedence clearwater revival |
| 6 | RVTR904646 | Rockin Pneumonia And The Boogie Woogie Flu | johnny rivers |
| 5 | RVTR690163 | Savin' Me | nickelback |
| 5 | RVTR517702 | Little Miss Can'T Be Wrong | spin doctors |
| 4 | RVTR592535 | Ain'T No Mountain High Enough | Marvin Gaye & Tammi Terrell |

## Top Eligible — Missing Package (by play count)

| Plays | RVTR | Title | Artist |
| ---: | --- | --- | --- |
| 46 | RVTR394955 | Alone | bee gees |
| 24 | RVTR269180 | Heaven | los lonely boys |
| 24 | RVTR849979 | Hope | shaggy |
| 18 | RVTR881535 | Take A Picture | filter |
| 15 | RVTR246699 | Sex And Candy | marcy playground |
| 12 | RVTR129716 | Am Radio | everclear |
| 7 | RVTR391281 | Magic Power | triumph |
| 7 | RVTR845436 | Believe | cher |
| 7 | RVTR863917 | Magic | The Cars |
| 7 | RVTR888414 | Hang On Sloopy | The Mccoys |
| 6 | RVTR534074 | The Adventures Of Rain Dance Maggie | red hot chili peppers |
| 6 | RVTR281384 | No Rain | blind melon |
| 4 | RVTR840133 | Santa Monica | everclear |
| 3 | RVTR880452 | Photograph | nickelback |
| 3 | RVTR424790 | Numb | u2 |

## Recommendation

1. Expand `media_track_links` for high-play VIDEO files
2. Assign covers via Cover Library for linked RVTRs
3. Run package queue (`npm run intelligence:next10`) only after cover gate passes

