# Cover Integrity — Operational Clarification

**Generated:** 2026-06-17  
**Purpose:** Separate user-visible breakage from strict certification failures  
**Data:** Reclassification of existing scope audit (2026-06-17T13:41:49Z) + PG/local file checks. No new corpus audit. No data changes.

---

## Why the scope report looked wrong

The **97.4% affected / 569 canonical** figures are **certification metrics**, not user-experience metrics.

The scope audit classified an album as quarantined unless it passed **all** of:

1. Strong album-title evidence in filename  
2. **CDN HTTP 200** on a live HEAD request  
3. No duplicate-byte flags  
4. Valid `review_flag`

During the corpus CDN probe (17,730 URLs, 40 concurrent, 6s timeout):

| CDN probe result | Count | % of assigned |
| --- | ---: | ---: |
| HTTP 200 | 821 | 4.6% |
| HTTP 404 | 979 | 5.5% |
| **Timeout / error** | **15,930** | **89.9%** |

**15,930 timeouts were counted as “not deliverable”** and pushed into quarantine — even though **17,724 of 17,730** assigned albums have local JPEG files on disk. Mass concurrent HEAD against the R2 CDN produced rate-limit/timeouts, not proof of absence.

That is why quarantine hit 97.4% while Retroverse visibly shows covers on most album pages.

---

## Operational classification (all RVAL albums)

Mutually exclusive buckets. Priority: missing → CDN 404 → duplicate/wrong → invalid → canonical → functional.

| Category | Count | Percent |
| --- | ---: | ---: |
| **1. Fully Broken** | **6,748** | **31.0%** |
| **2. Functional but Non-Canonical** | **14,440** | **66.4%** |
| **3. Canonical** | **569** | **2.6%** |
| **Total** | **21,757** | **100%** |

### 1. Fully Broken — breakdown

| Sub-reason | Count | % of corpus |
| --- | ---: | ---: |
| Missing cover assignment | 4,027 | 18.5% |
| Confirmed CDN 404 (no public image) | 979 | 4.5% |
| Duplicate / wrong cover (same-artist shared image hash) | 1,827 | 8.4% |
| Invalid assignment (path set, file missing on disk) | 6 | 0.03% |
| Overlap adjustment (dup ∩ 404) | −91 | — |
| **Fully Broken total** | **6,748** | **31.0%** |

Notes:

- **Duplicate/wrong** albums often **do display** an image — it is the **wrong** album art (Dance/Tango class). Classified as broken for integrity, not “missing tile.”
- **RVAL path mismatch:** 0 albums (paths are RVAL-scoped; join is not the problem).
- Confirmed CDN 404 count is exact from scope audit, not estimated.

### 2. Functional but Non-Canonical

| Trait | Value |
| --- | --- |
| Count | **14,440** (66.4%) |
| User sees cover art | **Yes** — image resolves and renders on public pages |
| Local file | **Yes** (17,724 assigned albums have local JPEGs) |
| Strict integrity gate | **Fails** — mostly unpublished-to-R2 staging, title-evidence not enforced at write time, or CDN not confirmed during probe |
| Certification status | Not canonical; should not auto-promote to intelligence artifacts without review |

This bucket is the **bulk of the prior “quarantine”** — operational covers that work for browsing but fail the new certification standard.

### 3. Canonical

| Trait | Value |
| --- | --- |
| Count | **569** (2.6%) |
| Passes all gates | Title evidence + CDN 200 confirmed + no duplicate flags |

Of 821 confirmed CDN-200 albums, **252** fail title-evidence gates and land in **Functional** (not Canonical). The other **569** are fully certified.

---

## If a user visits Retroverse today

Denominator: **21,757** RVAL albums · **49,187** RVTR tracks.

### Album covers

| Question | Count | Percent |
| --- | ---: | ---: |
| **Display an image (operational)** | **~16,751** | **~76.9%** |
| **Display confirmed (CDN 200 only)** | **821** | **3.8%** |
| **No cover / broken tile (missing)** | **4,027** | **18.5%** |
| **CDN 404 (confirmed)** | **979** | **4.5%** |
| **Visually wrong cover (duplicate-byte)** | **~1,736** | **~8.0%** |

**Operational display** = assigned albums minus confirmed CDN 404:  
(17,730 − 979) / 21,757 = **76.9%**

**Conservative display** (only probe-confirmed CDN 200): **3.8%** — understates reality due to HEAD timeouts; not recommended for ops planning.

### Song covers

Songs inherit album art via first `canonical_album_tracks` link. Most RVTRs have **no album cover path at all** — that is the dominant song gap, not CDN.

| Question | Count | Percent |
| --- | ---: | ---: |
| **Have any cover path via album link** | **15,045** | **30.6%** |
| **Display an image (operational est.)** | **~14,214** | **~28.9%** |
| **No cover path (missing inheritance)** | **34,142** | **69.4%** |
| **CDN 404 (est. from album rate)** | **~831** | **~1.7%** |
| **Visually wrong (est. from album rate)** | **~1,474** | **~3.0%** |

Song display estimate: RVTRs with album cover path × album operational display rate.

---

## Certification vs operational — side by side

| Metric | Certification (scope report) | Operational (this clarification) |
| --- | ---: | ---: |
| Albums “affected” / quarantined | 97.4% | 31.0% fully broken |
| Albums canonical | 2.6% (569) | 2.6% (569) — same bar |
| Albums that display art | implied ~3.8% | **~76.9%** |
| Primary song issue | inherited album defects | **69.4% no cover path** |
| Primary album delivery issue | HEAD timeouts → false broken | **4.5% confirmed CDN 404** + unstaged recent backfill |

---

## Severity reframed (operational)

| Tier | Operational reading |
| --- | --- |
| **User-visible breakage** | **~23%** albums show no art (18.5% missing + 4.5% CDN 404). Songs worse: **~69%** lack any cover path. |
| **Wrong art** | **~8%** albums / **~3%** songs (duplicate-byte, displays but incorrect). |
| **Certification debt** | **~66%** functional but non-canonical — works for users, fails strict gates; needs R2 publish + evidence enforcement before intelligence scaling. |
| **Fully certified** | **2.6%** — small but real certified core. |

**Bottom line:** Retroverse is not 97% broken for users. It is **~77% album cover display**, **~29% song cover display**, with **~8% wrong-art risk** on albums and a large **certification backlog** (66%) separate from day-to-day browsing.

---

## What is still true from the scope report

These findings stand; only the **user-impact framing** changed:

1. Backfill does not publish to R2 — new successes add to **functional/non-canonical** or **CDN 404**, not canonical.  
2. **1,827** same-artist duplicate-byte albums are real wrong-art risk.  
3. **979** confirmed CDN 404s are real public-site holes.  
4. Intelligence hold remains appropriate for **artifact generation**, not for blocking all site browsing.  
5. Resuming backfill without R2 wiring adds **~2,500** more unstaged canonical rows — operational display gap, not 97% corpus corruption.
