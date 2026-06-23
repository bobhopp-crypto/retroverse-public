# Phase 2 — Work Estimate

**Generated:** 2026-06-17  
**Basis:** Post–Phase 1 `reports/cover_integrity/cover_audit.csv` (21,757 rows) + `repair_queue.csv` (2,283 rows) + `reused_covers.csv` (934 hash groups)  
**No data changes.** No repairs run. No backfill restart.

**Corpus:** 21,757 RVAL albums · 17,730 assigned · 4,027 missing · 77.5% operational display (post Phase 1)

---

## Verdict

| Scope | Mode | Weighted auto | Weighted manual |
| --- | --- | ---: | ---: |
| **Wrong-cover repair only** (dup + mismatches + broken) | **Mostly manual** | **~37%** | **~63%** |
| **Full Phase 2** (includes missing assignments) | **Mixed** | **~53%** | **~47%** |

Wrong-cover work is manual-heavy because **1,475 / 1,827** same-artist duplicate albums (81%) charted on Billboard 200 (peak ≤ 100) and need visual QA before repull.

Missing assignments (4,027) are largely automatic via gated backfill (~63% historical success) but are **Phase 4** — listed here for completeness, not Phase 2 wrong-cover execution.

**Estimated calendar time:**

| Track | Scope | Est. time |
| --- | --- | --- |
| Wrong-cover Phase 2 | ~2,500 assigned defects | **1–2 weeks** |
| Missing (Phase 4, separate) | 4,027 albums | **1–2 weeks** after gates |
| Delivery remainder (Phase 1b) | 864 CDN 404, no local file | **2–3 days** re-acquire |

---

## 1. Duplicate-hash assignments

Albums with assigned cover, local file, and `duplicate hash count > 1`.

| Subcategory | Count | % of corpus | Auto repair | Manual review |
| --- | ---: | ---: | ---: | ---: |
| **Same artist** (shared bytes, different album) | **1,827** | 8.4% | **25%** (~457) | **75%** (~1,370) |
| **Different artist** (cross-artist shared hash) | **356** | 1.6% | **90%** (~320) | **10%** (~36) |
| **Total in duplicate groups** | **2,183** | 10.0% | **36%** (~777) | **64%** (~1,406) |

Supporting detail:

| Metric | Count |
| --- | ---: |
| Duplicate hash groups | 934 |
| Same-artist dup with B200 peak ≤ 100 (manual QA) | 1,475 |
| Same-artist dup, non-chart (auto-repull candidate) | 352 |

**Strategy**

| Subcategory | Repair approach |
| --- | --- |
| Cross-artist (356) | Auto iTunes repull with title gate + hash dedup + R2 publish |
| Same-artist, non-chart (352) | Auto repull; block if new hash matches sibling album |
| Same-artist, chart (1,475) | **Manual** visual QA → repull or `curator_override` |

---

## 2. Wrong-cover assignments

Assigned albums flagged by scoring — not missing, not delivery-only.

| Subcategory | Count | % of assigned | Auto repair | Manual review |
| --- | ---: | ---: | ---: | ---: |
| **High confidence wrong** (`VERY_SUSPICIOUS`) | **2,277** | 12.8% | **40%** (~911) | **60%** (~1,366) |
| — of which dup-only overlap (subset above) | 1,827 | | | |
| — title/artist mismatch without dup flag | **~450** | 2.5% | **40%** (~180) | **60%** (~270) |
| **Medium confidence** (partial title, slug drift) | **15** | 0.1% | **60%** (~9) | **40%** (~6) |
| **Suspected only** (HIGH_RISK, not VERY_SUSPICIOUS) | **0** | 0% | — | — |

**Repair queue CSV:** 2,283 rows (`isEligibleForRepairQueue` — HIGH_RISK + BROKEN assigned albums).

**Strategy**

| Tier | Action |
| --- | --- |
| High confidence wrong | Repull with strict title evidence; chart albums → manual sign-off |
| Medium confidence | Filename/path relabel or light repull; batch review |
| Suspected only | None currently — all HIGH_RISK also hit VERY_SUSPICIOUS |

---

## 3. Missing assignments

| Metric | Count | % of corpus | Auto repair | Manual review |
| --- | ---: | ---: | ---: | ---: |
| **No `canonical_cover_path`** | **4,027** | 18.5% | **63%** (~2,537) | **37%** (~1,490) |

**Strategy:** Gated backfill (Phase 4) — iTunes acquire + R2 publish + evidence gates. Failures (`low_album_similarity`, `NOT_FOUND`) need manual source hunt.

**Not Phase 2 wrong-cover work** — tracked separately to avoid conflating integrity repair with acquisition.

---

## 4. Quarantined assignments

Operational quarantine set from audit flags: missing **OR** HIGH_RISK **OR** BROKEN **OR** same-artist duplicate.

| Metric | Count | % of corpus | Auto repair | Manual review |
| --- | ---: | ---: | ---: | ---: |
| **Quarantined (union)** | **6,310** | 29.0% | **55%** (~3,471) | **45%** (~2,840) |

| Component | Count |
| --- | ---: |
| Missing (included) | 4,027 |
| HIGH_RISK tier | 2,277 |
| BROKEN tier | 6 |
| Same-artist dup (overlap with HIGH_RISK) | 1,827 |

Quarantine is an **overlap union**, not additive. Clearing wrong-cover + missing resolves most quarantine.

**Out of scope for Phase 2:** 864 assigned CDN 404s with **no local file** (Phase 1 remainder) — delivery re-acquire, not wrong-cover repair.

---

## Summary table

| Category | Count | Auto % | Manual % | Est. auto albums | Est. manual albums |
| --- | ---: | ---: | ---: | ---: | ---: |
| Dup — same artist | 1,827 | 25 | 75 | 457 | 1,370 |
| Dup — different artist | 356 | 90 | 10 | 320 | 36 |
| Wrong — high confidence | 2,277 | 40 | 60 | 911 | 1,366 |
| Wrong — medium confidence | 15 | 60 | 40 | 9 | 6 |
| Wrong — suspected only | 0 | — | — | 0 | 0 |
| Missing | 4,027 | 63 | 37 | 2,537 | 1,490 |
| Quarantined (union) | 6,310 | 55 | 45 | 3,471 | 2,840 |
| BROKEN (no file) | 6 | 30 | 70 | 2 | 4 |

---

## Top 20 artists by repair workload

Scoring: missing +3, HIGH_RISK +5, same-artist dup +6, dup frequency +4, BROKEN +8 per album.

| Rank | Artist | Repair score | Albums | HIGH_RISK | Dup wrong | Missing |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | various artists | 6,631 | 1,598 | 387 | 345 | 666 |
| 2 | elvis presley | 540 | 111 | 41 | 38 | 17 |
| 3 | The Beatles | 309 | 58 | 27 | 26 | 6 |
| 4 | garth brooks | 285 | 21 | 19 | 19 | 0 |
| 5 | grateful dead | 263 | 90 | 13 | 9 | 48 |
| 6 | The Rolling Stones | 222 | 54 | 18 | 18 | 8 |
| 7 | chicago | 200 | 33 | 16 | 16 | 8 |
| 8 | frank sinatra | 186 | 54 | 15 | 15 | 7 |
| 9 | Brooks & Dunn | 164 | 14 | 12 | 12 | 0 |
| 10 | barbra streisand | 162 | 61 | 15 | 14 | 1 |
| 11 | The Beach Boys | 161 | 53 | 13 | 13 | 6 |
| 12 | johnny cash | 158 | 47 | 13 | 12 | 7 |
| 13 | jimi hendrix | 148 | 36 | 11 | 10 | 11 |
| 14 | bob dylan | 146 | 68 | 13 | 12 | 3 |
| 15 | kiss | 145 | 35 | 11 | 11 | 8 |
| 16 | aerosmith | 138 | 29 | 12 | 12 | 2 |
| 17 | rod stewart | 124 | 43 | 11 | 10 | 3 |
| 18 | neil diamond | 121 | 56 | 10 | 9 | 3 |
| 19 | ray charles | 110 | 33 | 7 | 6 | 13 |
| 20 | eric clapton | 110 | 38 | 10 | 10 | 0 |

**various artists** dominates (~30% of repair score) — mostly NOW/WOW/compilation duplicate-hash clusters (see `reused_covers.csv`).

---

## Recommended Phase 2 execution order

| Step | Work | Auto/manual | Est. time |
| ---: | --- | --- | --- |
| 1 | Cross-artist duplicate repull (356) | 90% auto | 1 day |
| 2 | Same-artist non-chart repull (352) | 90% auto | 1 day |
| 3 | Title/artist mismatch repull (~450) | 40% auto | 2–3 days |
| 4 | Chart-album dup manual QA (1,475) | 90% manual | 5–8 days |
| 5 | various artists compilation batch | Mixed | 2–3 days |
| 6 | BROKEN + Phase 1 CDN-404-no-local (870) | Mixed | 2–3 days |

**Do not start** until Phase 2 tooling enforces: repull → hash check → evidence gate → R2 publish → CDN verify (same bar as Phase 4 backfill gates).

---

## Phase 2 vs Phase 4 boundary

| Phase | What | Count |
| --- | --- | ---: |
| **Phase 2** | Fix wrong assigned covers (dup, mismatch, broken file) | ~2,500 |
| **Phase 4** | Acquire missing covers | 4,027 |
| **Phase 1b** | Re-acquire / restore local for CDN 404 | 864 |

---

## Source files

| File | Use |
| --- | --- |
| `reports/cover_integrity/cover_audit.csv` | Per-album scoring, tiers, dup flags |
| `reports/cover_integrity/repair_queue.csv` | Prioritized 2,283 repair rows |
| `reports/cover_integrity/reused_covers.csv` | 934 hash groups |
| `reports/cover_integrity/summary.json` | Post–Phase 1 audit totals |
| `reports/cover-integrity/phase1-delivery-report.md` | 864 remaining CDN 404 |
| `reports/cover-integrity/RECOVERY-PLAN.md` | Phase strategy |
