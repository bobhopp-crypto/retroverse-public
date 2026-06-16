# MB Wave 100 — Preparation Report

**Generated:** 2026-06-15T21:43:11.573Z  
**Mode:** Prepare only — **no apply executed**  
**Target READY queue:** ≥120 (for Wave 100 apply)  
**Gate status:** ⚠️ **54 READY** — **66 short** of 120 staging target; **do not execute** until queue tops up.

---

## Queue status

| Verdict | Count |
|---------|------:|
| **READY** (unapplied) | **54** |
| **BLOCKED** | **0** |
| **NEEDS_REVIEW** (approve + advisories) | **108** |
| Curation review (staged) | 32 |

**Staging rounds:** 3 · **Pilot target:** 400

### BLOCKED resolved this prep

- 314: rejected duplicate_group
- 315: rejected duplicate_group
- 316: rejected duplicate_group
- 317: rejected duplicate_group
- 319: rejected duplicate_group

### Remaining BLOCKED

_none_

---

## NEEDS_REVIEW summary

### Curation-held (staged `review` verdict) — 32

- **28** RVTR191556 — rema / Rave & Roses
- **31** RVTR881310 — machine gun kelly x blackbear / Tickets to My Downfall
- **33** RVTR029636 — latto / 777
- **34** RVTR728668 — metro boomin, the weeknd / HEROES & VILLAINS
- **39** RVTR485869 — lizzo / Cuz I Love You
- **65** RVTR740918 — jessie j, ariana grande / My Everything
- **70** RVTR863901 — usher, summer walker / COMING HOME
- **78** RVTR645161 — black eyed peas x j balvin / TRANSLATION
- **119** RVTR995152 — earth, wind / Gratitude
- **122** RVTR546593 — karol g x shakira / MAÑANA SERÁ BONITO
- **124** RVTR067949 — young thug, j. cole / So Much Fun
- **127** RVTR959225 — becky g x karol g / ESQUEMAS
- **132** RVTR856858 — jay rock, kendrick lamar, future / Black Panther: The Album (Music From and Inspired By)
- **140** RVTR310233 — parmalee x blanco brown / For You
- **151** RVTR326074 — gracie abrams / The Secret of Us (deluxe)
- **152** RVTR978606 — gabby barrett / Goldmine (Deluxe)
- **153** RVTR021293 — lainey wilson / Whirlwind (deluxe)
- **155** RVTR105372 — nate smith / NATE SMITH (DELUXE)
- **160** RVTR528626 — summer walker x drake / Last Day of Summer
- **167** RVTR045340 — doja cat / Amala (deluxe)

### Approve-ready with advisories (excluded from READY) — 108

- **26** RVTR765818 — album_title_has_part_suffix — confirm canonical LP title
- **300** RVTR498516 — merged_2_rvtrs — apply links all RVTRs to one RVAL
- **47** RVTR718588 — pre_1990_catalog — vintage MB metadata; lower chart relevance
- **51** RVTR531432 — pre_1990_catalog — vintage MB metadata; lower chart relevance
- **49** RVTR940076 — pre_1990_catalog — vintage MB metadata; lower chart relevance
- **52** RVTR984204 — pre_1990_catalog — vintage MB metadata; lower chart relevance
- **53** RVTR717913 — pre_1990_catalog — vintage MB metadata; lower chart relevance
- **50** RVTR287922 — pre_1990_catalog — vintage MB metadata; lower chart relevance
- **107** RVTR748529 — pre_1990_catalog — vintage MB metadata; lower chart relevance
- **115** RVTR600025 — pre_1990_catalog — vintage MB metadata; lower chart relevance
- **116** RVTR052886 — pre_1990_catalog — vintage MB metadata; lower chart relevance
- **146** RVTR222495 — pre_1990_catalog — vintage MB metadata; lower chart relevance
- **121** RVTR281326 — pre_1990_catalog — vintage MB metadata; lower chart relevance
- **131** RVTR095957 — pre_1990_catalog — vintage MB metadata; lower chart relevance
- **159** RVTR344180 — merged_2_rvtrs — apply links all RVTRs to one RVAL

---

## Stop-on-first-failure

**Enabled:** **YES** — `wave-25-apply.ts` breaks on pre-apply, apply, or verify failure (`stoppedEarly = true`). No batch override flag exists.

---

## Estimated runtime (Wave 100 apply + integrated covers)

| Metric | Estimate |
|--------|----------|
| Core apply+cover | **~44 min** |
| Per album (observed Wave 50) | ~26.4s |

---

## Expected graph impact (Wave 100)

| Metric | Projected |
|--------|----------|
| Albums | **+100** |
| RVTR links | **+112** |
| Hot 100 gain | **+112** |
| Hot 100 linked % after | **~44.8%** (from ~14,321 / ~32,200 baseline) |

---

## Wave 100 execute command (NOT run in this phase)

```bash
RETROVERSE_MB_INGEST_APPLY=1 RETROVERSE_MB_COVER_APPLY=1 npm run mb:wave-100:apply
```

**Pre-flight:** READY ≥ 100 (currently **54**), BLOCKED = 0 on target IDs, `npm run mb:canary:apply-readiness`

### Gap to 120 READY

Pilot expanded to **400** MB-complete rows (**322** auto-ingestable). Remaining unstaged auto rows skew **pre-1990** → staged as `approve` but land in **NEEDS_REVIEW** (not READY). To close the 66-proposal gap:

1. **Modern-only pilot pass** — `MB_PILOT_TARGET=600` with post-1990 / chart-weeks filter in staging
2. **Curate 32 review-held** rows (deluxe, soundtrack, multi-artist) → approve or reject
3. **Optional:** accept `merged_2_rvtrs` advisories as READY (adds ~10–15)

**Top 100 READY IDs (preview):** 296, 297, 298, 45, 299, 301, 302, 303, 304, 305, 307, 154, 156, 157, 158, 161, 162, 163, 165, 166, 168, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 194, 195, 196, 279, 280, 281, 309, 310, 311, 312
