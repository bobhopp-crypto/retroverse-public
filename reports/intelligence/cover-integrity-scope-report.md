# Cover Integrity Scope Report

**Generated:** 2026-06-17T13:41:49Z  
**Method:** Corpus-wide read-only audit — `runCoverIntegrityAudit` + CDN HEAD on all 17,730 assigned albums + PG song linkage counts  
**Data unchanged.** Backfill not resumed.

---

## Counts (corpus-wide)

| # | Metric | Count |
| --- | --- | ---: |
| 1 | **Total album cover assignments** | **17,730** |
| 2 | **Total song cover assignments** | **15,057** |
| 3 | **Total CDN 404 cover references** | **979** |
| 4 | **Total duplicate-image hashes** | **934 groups · 2,183 albums** |
| 5 | **Total quarantined covers** | **21,188** |
| 6 | **Total missing covers** | **4,027** |
| 7 | **Estimated % affected albums** | **97.4%** |
| 8 | **Estimated % affected songs** | **98.6%** |

### Corpus denominators

| Universe | Count |
| --- | ---: |
| RVAL albums in graph | 21,757 |
| `album_artwork_links` rows | 17,738 |
| — dossier source | 17,730 |
| — curator_override | 8 |
| RVTR tracks in `canonical_track_display` | 49,187 |
| RVTR tracks with album-linked cover path | 15,057 |

### Album assignment definition

Album has a cover assignment when `albums.canonical_cover_path` is set on an RVAL-keyed album (17,730). Artwork link rows (17,738) align; nearly all are `source = dossier`.

### Song assignment definition

Song inherits cover via first `canonical_album_tracks` position → parent album `canonical_cover_path` or best `album_artwork_links` row (same resolver as intelligence `loadCoverInfoForRvtrs`). **15,057** of **49,187** RVTRs resolve to a cover path; **34,130** RVTRs have no cover path through album linkage.

### CDN 404 detail

CDN HEAD was run on all **17,730** assigned cover URLs (40 concurrent, 6s timeout).

| CDN result | Count | Notes |
| --- | ---: | --- |
| **HTTP 404** | **979** | Confirmed missing on public CDN |
| **HTTP 200** | **821** | Confirmed deliverable |
| Timeout / network error | 15,930 | HEAD did not return 200 or 404 — treated as not deliverable |
| Local file exists, CDN ≠ 200 | 16,903 | Staging on disk; public site cannot serve |

The **979** figure is confirmed 404 only. The broader delivery gap is **16,903** assignments with local JPEGs that failed CDN 200 verification — predominantly unpublished R2 objects (`r2_publish_gap`), not bad paths.

### Duplicate-image hash detail

MD5 file hashes on local cover files (17,724 hashed).

| Metric | Count |
| --- | ---: |
| Duplicate hash **groups** (2+ albums share same bytes) | **934** |
| Albums participating in any shared hash | **2,183** |
| Same-artist, different-album shared image (substitution risk) | **1,827** |
| Cross-artist shared hash groups | **183** |
| VERY_SUSPICIOUS assigned (scoring band) | **2,277** |
| Repair queue entries | **2,283** |
| Orphan local cover files (on disk, no PG assignment) | **30,569** |

### Quarantine detail

Quarantine uses `assessAlbumCoverEvidence` — requires strong title evidence **and** CDN HTTP 200 for canonical status. Anything else is quarantined.

| Status | Albums |
| --- | ---: |
| **Quarantined (total)** | **21,188** |
| — missing assignment | 4,027 |
| — broken (path exists, not CDN-deliverable) | 16,909 |
| — review_needed (delivered but weak/conflicting evidence) | 252 |
| **Canonical (passes all gates)** | **569** |
| Not quarantined | 569 |

### Affected percentages

| Surface | Affected | Denominator | % |
| --- | ---: | ---: | ---: |
| Albums | 21,188 | 21,757 | **97.4%** |
| Songs (no cover path OR linked to quarantined album) | 48,520 | 49,187 | **98.6%** |

---

## Severity classification

### **HIGH**

**Verdict: major cover-library integrity problem** — not a small cleanup, not a medium repair project.

| Signal | Magnitude |
| --- | --- |
| Strict canonical pass rate | **569 / 21,757 = 2.6%** |
| Quarantine rate | **97.4%** of RVAL albums |
| CDN delivery gap | **16,903** local-only assignments; **979** confirmed 404 |
| Wrong-art risk | **1,827** same-artist duplicate-byte albums already in corpus |
| Song surface impact | **98.6%** of RVTRs affected |
| Orphan file sprawl | **30,569** unassigned local covers |

**Rationale:**

1. **Delivery layer is broken at scale.** The backfill pipeline promotes PG canonical rows and writes local files but does not publish to R2. ~95% of assigned covers cannot be verified as publicly deliverable; users see missing art on the site even when PG says `review_flag = ok`.

2. **Integrity gates are not enforced in the write path.** 17,730 albums carry `dossier` / `ok` assignments; only 569 survive strict title-evidence + CDN-200 quarantine rules. The graph overstates trust relative to what users can see.

3. **Duplicate-byte substitution is systemic, not anecdotal.** 934 shared-hash groups across 2,183 albums; 1,827 are same-artist different-album collisions (Dance/Tango class). Scoring flags 2,277 as VERY_SUSPICIOUS.

4. **Song layer inherits album defects.** 49k RVTRs; cover resolution is album-position-dependent — quarantined or missing album art propagates to track tiles, song sheets, and intelligence packages.

5. **Missing coverage remains large.** 4,027 albums still have no assignment; 34,130 RVTRs have no resolved cover path.

---

## If cover backfill remains paused today

**Current state:** `reports/cover_backfill/state.json` shows `paused: false`, `running: true` — backfill is **not** paused today. Below assumes the recommended paused posture.

### What is blocked

| System | Blocked when backfill paused? | Blocked today via intelligence hold? |
| --- | --- | --- |
| Cover acquisition for 4,027 missing albums | **Yes** | No |
| New dossier PG promotions from backfill | **Yes** | No |
| Overnight intelligence build (`intelligence:overnight-build`) | No | **Yes** |
| Top 100 validation batch | No | **Yes** |
| Production intelligence pipeline | No | **Yes** |
| Public artist/album pages (existing data) | No | No |
| Existing CDN 200 covers (821 albums) | No | No |

**Net effect of pausing backfill:** Stops adding new unpublished canonical rows and stops iTunes fuzzy-match acquisitions. Does **not** unblock intelligence scaling — that requires clearing `cover-integrity-hold.json` separately.

**Retroverse functionality still working with both paused:**

- Browse/search canonical graph
- Pages served by existing CDN-200 covers (~821 albums; more may work if HEAD timeouts were false negatives)
- VDJ / playback paths unrelated to cover backfill

**Degraded without new cover work:**

- 4,027 albums remain coverless on site
- ~34k RVTRs without inherited cover art
- Intelligence artifacts, song sheets, overnight packages — blocked by intelligence hold regardless

---

## If cover backfill resumes today

**Queue remaining:** 4,027 albums  
**Historical unique success rate:** 62.8% (7,170 successes / 11,423 processed in current run)

| Projection | Count |
| --- | ---: |
| Maximum new canonical PG assignments (full queue drain) | 4,027 |
| Expected successes at current rate | **~2,528** |
| Expected new CDN-invisible rows (no R2 publish in pipeline) | **~2,528** |
| Expected failures | ~1,499 |

### Additional potentially bad data

| Risk class | Estimated additional exposure |
| --- | --- |
| Unpublished canonical rows (local-only, site 404) | **~2,528** — near-certain; R2 not wired in `run-batch-core.ts` |
| Same-artist duplicate-byte assignments | **~260** — extrapolated from current rate (1,827 / 17,724 ≈ 10.3% of hashed assignments × 2,528 successes) |
| VERY_SUSPICIOUS / repair-queue class | **~325** — extrapolated (2,277 / 17,730 ≈ 12.8% × 2,528) |
| Wrong-album iTunes fuzzy match (unquantified) | Non-zero; backfill has no post-acquire title-evidence gate |

**Resume without R2 + evidence gates would add ~2,500 new canonical rows that users cannot see, plus hundreds of probable wrong-art or duplicate-byte entries — on top of an already 97% quarantine rate.**

---

## Classification summary

| Tier | Threshold | This corpus |
| --- | --- | --- |
| Small cleanup | <5% affected, isolated root cause | ✗ |
| Medium repair | 5–25% affected, bounded fix path | ✗ |
| **Major integrity problem** | >25% affected, systemic pipeline gaps | **✓ 97.4% albums · 98.6% songs** |

---

## Measurement sources

| Source | Role |
| --- | --- |
| `lib/cover-integrity/run-audit.ts` | RVAL inventory, MD5 hashing, scoring, duplicate detection |
| `lib/cover-integrity/album-cover-evidence.ts` | Quarantine / canonical classification |
| `lib/artwork/resolve-album-cover-url.ts` | CDN URL resolution |
| `reports/cover_backfill/state.json` | Backfill queue + success rate |
| `reports/intelligence/cover-integrity-hold.json` | Intelligence pause (active) |
| PG: `albums`, `album_artwork_links`, `canonical_track_display`, `canonical_album_tracks` | Assignment + song linkage counts |

Raw scope JSON captured at generation time in terminal audit output (`generatedAt: 2026-06-17T13:41:49.018Z`).
