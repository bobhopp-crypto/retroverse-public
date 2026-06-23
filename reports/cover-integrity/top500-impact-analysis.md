# Top 500 VIDEO — Cover Impact Analysis

**Generated:** 2026-06-17T14:48:34.523Z  
**Cohort:** Top 500 identifiable VIDEO tracks by VirtualDJ play count (`loadTopPlayedBackfill`)  
**Scope:** Active performance universe only — not full library  
**Post–Phase 1 delivery** · read-only

---

## Sunday Nights readiness

**If Sunday Nights started tomorrow, 35.6% of the Top 500 tracks (178 / 500) would have acceptable cover quality.**

**Acceptable** = RVTR resolved · cover present · CDN HEAD 200 · confidence tier GREEN or YELLOW · not duplicate-wrong · not quarantined (RED).

---

## Cover status (Top 500)

| Status | Count | % |
| --- | ---: | ---: |
| **Cover present** | **282** | **56.4%** |
| **Cover missing** | **218** | **43.6%** |
| **Cover quarantined** | **264** | **52.8%** |
| **Cover duplicate** (same-artist shared image) | **32** | **6.4%** |

_Note: quarantined and duplicate overlap; counts are flag-based, not mutually exclusive._

---

## Cover confidence tier (Top 500)

| Tier | Count | % | Meaning |
| --- | ---: | ---: | --- |
| **GREEN** | **223** | **44.6%** | TRUSTED · HIGH band · displays · no dup flag |
| **YELLOW** | **0** | **0%** | Cover present · review/partial evidence |
| **RED** | **59** | **11.8%** | HIGH_RISK · dup-wrong · broken · suspicious |
| **NONE** | **218** | **43.6%** | No cover on track |

---

## Intelligence packages (Top 500)

| Status | Count | % |
| --- | ---: | ---: |
| **Package complete** | **69** | **13.8%** |
| **Package missing** | **431** | **86.2%** |

Package complete = published / cards_ready / approved, or has ranked story cards.

---

## Real-world impact summary

| Question | Answer |
| --- | --- |
| Do Top 500 tracks mostly have covers? | **56.4%** present · **43.6%** missing |
| How much wrong-art risk in active set? | **32** dup flags (**6.4%**) |
| How much integrity debt in active set? | **52.8%** quarantined flags |
| Sunday Nights acceptable covers? | **35.6%** (178/500) |
| Package gap vs cover gap | Packages **86.2%** missing vs covers **43.6%** missing |

**Bottom line:** Cover integrity issues are **concentrated below the active tier** for duplicates (6.4%), but **43.6%** missing covers and **86.2%** missing packages are the dominant gaps for Sunday Nights / Top 500 performance use.

---

## Method

1. `loadTopPlayedBackfill()` → top 500 by play count (VIDEO, identifiable).
2. Cover presence via intelligence cover map + VDJ identity flags.
3. Album integrity via `cover_audit.csv` joined on RVTR → first album RVAL.
4. CDN HEAD per track with cover (12s timeout).
5. Package status from `loadSongPackage` per RVTR.

---

## Artifacts

- `reports/cover-integrity/top500-impact-results.json` — per-track detail
- Source audit: `reports/cover_integrity/cover_audit.csv` (post Phase 1)
