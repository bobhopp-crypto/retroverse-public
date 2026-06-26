# Package Pipeline Deep Audit

**Scanned:** 2026-06-24T02:13:39.073Z
**Cohort:** 7,206 owned VIDEO + RVTR tracks

---

## Headline metrics

| Metric | Count | % |
|--------|------:|--:|
| Fully ready | 136 | 1.9% |
| Intelligence package | 287 | 4% |
| Package file (any status) | 1,184 | 16.4% |
| Has cover | 3,438 | 47.7% |
| Has Hot 100 chart | 3,876 | 53.8% |
| Has artist data | 7,206 | 100% |
| Has playback link | 4,196 | 58.2% |
| All prerequisites | 2,647 | 36.7% |

---

## Primary blocker (one per track)

| Category | Count | % |
|----------|------:|--:|
| Missing cover | 3,297 | 45.8% |
| Prerequisites met — package never generated | 2,129 | 29.5% |
| Package file exists — draft/processing/review | 897 | 12.4% |
| Missing playback link (no VIDEO link + no YouTube) | 589 | 8.2% |
| Fully ready | 136 | 1.9% |
| Missing Hot 100 chart history | 80 | 1.1% |
| Package exists — artifacts incomplete | 78 | 1.1% |

---

## No intelligence package — why (6,919 tracks)

| Category | Count | % |
|----------|------:|--:|
| Missing cover | 3,260 | 47.1% |
| Prerequisites met — package never generated | 2,129 | 30.8% |
| Package file exists — draft/processing/review | 897 | 13% |
| Missing playback link (no VIDEO link + no YouTube) | 556 | 8% |
| Missing Hot 100 chart history | 77 | 1.1% |

---

## Has package but not fully ready (151 tracks)

| Category | Count | % |
|----------|------:|--:|
| Package exists — artifacts incomplete | 78 | 51.7% |
| Missing cover | 37 | 24.5% |
| Missing playback link (no VIDEO link + no YouTube) | 33 | 21.9% |
| Missing Hot 100 chart history | 3 | 2% |

---

## Package file status distribution

| Status | Count |
|--------|------:|
| none | 6,022 |
| review | 892 |
| cards_ready | 123 |
| draft | 108 |
| published | 61 |

---

# Fastest path: 2% → 25% fully ready

**Current fully ready:** 136 (1.9%)
**Target (25%):** 1,802 tracks
**Gap:** 1,666 tracks

## Why package readiness is only 4%

Intelligence package (cards_ready/published/story cards): **287** / 7,206 (4%).

**Root cause:** Missing cover accounts for **47.1%** of owned tracks. Pipeline requires **cover before package generation** — 3,438 have covers, 3,768 do not.

## Tier 1 — Zero new packages (artifact completion only)

Tracks with package + cover + chart + playback but **artifacts incomplete**: **16**

If artifacts completed on existing packages: **152** fully ready (2.1%)

## Tier 2 — Package generation on ready cohort

Tracks with **cover + playback**, no package file, not failed: **2,206**

These can enter batch pipeline immediately after Tier 1.

## Tier 3 — Cover backfill (unblocks largest bucket)

Missing cover (primary blocker): **3,297** tracks

Cover backfill unlocks package generation for ~3297 additional tracks beyond Tier 2.

## Tier 4 — Playback link reconciliation

Missing playback link (VDJ file exists but no `media_track_links` VIDEO row): **589**

Many are label-RVTR matched files without graph link — reconcile `media_track_links` from owned VIDEO paths.

## Recommended sequence (no content generation in this audit)

1. **Complete artifacts** on 16 existing packages → ~2.1% ready
2. **Batch-generate packages** for top-played Tier-2 cohort (1,650+ tracks by play count)
3. **Cover backfill** on highest-play missing-cover owned VIDEO tracks
4. **Link reconciliation** for playback gaps on owned files

**Estimated reach to 25%:** Tier 1 (16) + Tier 2 top 1,650 by play count from packageGenerationReady cohort.

