# Top 500 Enrichment Plan

**Generated:** 2026-06-17  
**Source:** `reports/cover-integrity/top500-impact-results.json` (Top 500 VIDEO by play count)  
**Goal:** Fastest path to **80% Sunday Nights cover readiness** (400 / 500 acceptable)  
**No full-library audit.** Active performance set only.

---

## Sunday Nights readiness definition

From impact analysis: **acceptable** = RVTR resolved · cover present · CDN HEAD 200 · tier GREEN or YELLOW · not duplicate-wrong · not quarantined.

| Today | Target (80%) | Gap |
| --- | --- | ---: |
| **178** (35.6%) | **400** | **222** |

**Note:** 143 tracks in Queue A are **already acceptable** (cover OK) but lack packages — they count toward Sunday Nights **cover** readiness today. Packages are enrichment, not required for the 80% cover metric.

---

## Master ranking (all 500 tracks)

Sorted by:

1. **Play count** DESC (primary)
2. **Cover present** before missing (tie-break)
3. **Package complete** before missing (tie-break)

Full ranked list: `reports/cover-integrity/top500-enrichment/queue-ranked.json`

**Top 5 by play count:**

| Play | Title | Artist | Queue | Acceptable |
| ---: | --- | --- | --- | --- |
| 90 | How Do You Do? | Mouth & MacNeal | B | no |
| 85 | Night Moves | Bob Seger | C | no |
| 83 | You Can Call Me Al | Paul Simon | D | yes |
| 75 | Twist and Shout | Chaka Demus & Pliers | C | no |
| 74 | In The Air Tonight (Live) | Phil Collins | B | no |

---

## Four queues

| Queue | Definition | Count | % |
| --- | --- | ---: | ---: |
| **A** | Package missing + cover present | **213** | 42.6% |
| **B** | Package missing + cover missing | **218** | 43.6% |
| **C** | Package complete + cover needs repair | **34** | 6.8% |
| **D** | Fully ready (acceptable cover + package complete) | **35** | 7.0% |

Per-queue files: `reports/cover-integrity/top500-enrichment/queue-{A,B,C,D}.json`

---

## Queue A — Package missing + cover present

**213 tracks** · **31.2%** of cohort play-weight · **143 already acceptable** (cover-ready)

| Metric | Value |
| --- | --- |
| **Count** | 213 |
| **Already acceptable (cover)** | 143 |
| **Need cover fix only** | 70 (34 CDN 404 · 36 RED/dup) |
| **Est. runtime** | **~3–4 hours** (packages optional for cover metric) |
| **Cover-fix runtime** | ~20 min CDN batch + ~2 hr RED/dup repair |
| **Package pipeline runtime** | ~185 min (~52 s × 213 RVTRs, if desired) |

### Expected user impact

| Action | Gain (acceptable covers) | Cumulative |
| --- | ---: | ---: |
| CDN republish (34 GREEN, CDN false) | **+34** | **212** (42.4%) |
| RED/dup repair (36 tracks, 60% success) | **+22** | **234** (46.8%) |
| Full package pipeline (optional) | 0 cover gain · +213 packages | — |

**Highest ROI:** CDN republish first — **34 tracks**, ~20 min, no assignment change (Phase 1 pattern).

**Top 10 by play:** Glass Tiger, Big Country, Boston, Neil Diamond, Rednex, Kiss, EMF, Orleans, Tears For Fears, Nickelback.

---

## Queue B — Package missing + cover missing

**218 tracks** · **39.4%** of cohort play-weight (largest play share)

| Metric | Value |
| --- | --- |
| **Count** | 218 |
| **With RVTR** | 142 |
| **No RVTR** (linkage required) | 76 |
| **Est. runtime** | **~12–18 hours** (acquire + pipeline) |
| **RVTR resolution** | **~6 hours** manual (76 tracks) |

### Expected user impact

| Action | Gain (est.) | Notes |
| --- | ---: | --- |
| Cover acquire + pipeline, top 50 by play | **+28** | 55% success rate |
| All 142 with RVTR | **+78** | Diminishing iTunes hit rate |
| Resolve 76 no-RVTR (35% success) | **+27** | Blocks top-play tracks (Mouth & MacNeal #1) |

**Top 10 by play:** Mouth & MacNeal (no RVTR), Phil Collins Live (no RVTR), Anchorman skit (no RVTR), Nancy Sinatra, 4 Non Blondes, Coasters, Eddy Grant.

**Bottleneck:** 76 tracks lack RVTR — includes **#1 play count** slot. Sunday Nights cannot show covers until graph linkage exists.

---

## Queue C — Package complete + cover needs repair

**34 tracks** · **15.1%** of cohort play-weight · **high-visibility packaged songs**

| Metric | Value |
| --- | --- |
| **Count** | 34 |
| **Duplicate-wrong** | 7 |
| **RED / suspicious** | 27 |
| **GREEN tier, CDN false** | 11 |
| **Est. runtime** | **~1–2 hours** |

### Expected user impact

| Action | Gain (acceptable) | Cumulative |
| --- | ---: | ---: |
| CDN republish (11 packaged GREEN) | **+11** | **223** |
| Dup repair (7, 70% success) | **+5** | **228** |
| RED repull (20 tracks, 50% success) | **+10** | **~238** |

**Top 10 by play:** Night Moves (#2 play), Twist and Shout, Africa, Relax, Sweet Emotion, Tainted Love, Love Rollercoaster, I Want Candy, Alone, Copperhead Road.

**User impact:** Fixing Queue C fixes **packaged songs audiences already see** with wrong or broken cover art — highest **perceived** quality lift.

---

## Queue D — Fully ready

**35 tracks** · **14.2%** of cohort play-weight · **no work required**

| Metric | Value |
| --- | --- |
| **Count** | 35 |
| **Est. runtime** | **0** |
| **User impact** | Baseline Sunday Nights + package experience |

Includes: You Can Call Me Al, Once in a Lifetime, Hold Me Now, Sultans of Swing, I Still Haven't Found What I'm Looking For, Two Princes, Down Under.

---

## Fastest path to 80% Sunday Nights readiness

### Phased execution (cover metric only)

| Phase | Work | Runtime | Acceptable | % |
| ---: | --- | ---: | ---: | ---: |
| 0 | **Today (baseline)** | — | **178** | **35.6%** |
| 1 | Queue A CDN republish (34) | ~20 min | **212** | **42.4%** |
| 2 | Queue C CDN republish (11) | ~10 min | **223** | **44.6%** |
| 3 | Queue C dup repair (7) | ~15 min | **228** | **45.6%** |
| 4 | Queue A RED/dup repair (36) | ~2 hr | **250** | **50.0%** |
| 5 | Queue B top 142 by play (acquire) | ~6 hr | **328** | **65.6%** |
| 6 | RVTR linkage, top 40 no-RVTR | ~4 hr | **~360** | **~72%** |
| 7 | Queue B remainder + no-RVTR | ~8 hr | **~390** | **~78%** |
| 8 | Spill: hard iTunes misses | variable | **400** | **80%** |

**Fastest single win:** Phases 1–2 (CDN only) → **223 acceptable in ~30 minutes** (+45 tracks).

**Realistic 80% timeline:** **5–7 days** focused work (not counting full package builds).

### Why 80% is hard

| Constraint | Impact |
| --- | --- |
| 76 tracks have **no RVTR** | Top-play slots blocked without graph linkage |
| 218 tracks **missing cover** | iTunes acquire ~55% success on hard titles |
| 32 dup flags in cohort | Manual QA on chart albums |
| Cover metric ≠ package metric | 143 acceptable tracks still lack packages |

**Ceiling without RVTR resolution:** ~**328** acceptable (65.6%) from automated cover work alone.

---

## Recommended execution order (highest impact first)

| Rank | Queue | Action | Why |
| ---: | --- | --- | --- |
| 1 | **A** | CDN republish 34 | Minutes · +34 acceptable |
| 2 | **C** | CDN republish 11 | Fixes visible packaged songs |
| 3 | **C** | Dup repair 7 | Night Moves, Africa, Sweet Emotion |
| 4 | **B** | RVTR linkage top 20 no-RVTR | Unblocks highest play counts |
| 5 | **A** | RED/dup repair 36 | Cover present but wrong |
| 6 | **B** | Cover acquire top 50 by play | Largest remaining gap |
| 7 | **A** | Package pipeline (optional) | Intelligence enrichment, not cover metric |
| 8 | **B** | Remaining acquire + pipeline | Push toward 80% |

---

## Runtime summary

| Queue | Count | Est. runtime | Acceptable gain (est.) | Play-weight % |
| --- | ---: | ---: | ---: | ---: |
| **A** | 213 | 3–4 hr (cover) · +185 min (packages) | +56 cover | 31.2% |
| **B** | 218 | 12–18 hr | +150 cover (max) | 39.4% |
| **C** | 34 | 1–2 hr | +16 cover | 15.1% |
| **D** | 35 | 0 | — | 14.2% |

**Pipeline avg:** 66 s/track (Top 100 validation measured)  
**Cover acquire avg:** ~90 s success path · ~55% hit rate on Queue B

---

## Package vs cover strategy

| Metric | Today | After Phase 1–4 (cover) | After full enrichment |
| --- | ---: | ---: | ---: |
| Acceptable cover | 35.6% | **~50%** | **~78–80%** |
| Package complete | 13.8% | 13.8% | **~55%** (if Queue A pipelined) |

**Sunday Nights MVP:** Phases 1–4 + B top-50 → **~50% cover readiness in one day**.

**Sunday Nights target:** Full plan → **~80% in one week**.

---

## Artifacts

| File | Contents |
| --- | --- |
| `reports/cover-integrity/top500-enrichment/queue-A.json` | 213 tracks |
| `reports/cover-integrity/top500-enrichment/queue-B.json` | 218 tracks |
| `reports/cover-integrity/top500-enrichment/queue-C.json` | 34 tracks |
| `reports/cover-integrity/top500-enrichment/queue-D.json` | 35 tracks |
| `reports/cover-integrity/top500-enrichment/plan-data.json` | Machine-readable plan |
| `reports/cover-integrity/top500-impact-analysis.md` | Source impact report |

---

## Bottom line

| Question | Answer |
| --- | --- |
| Fastest path to 80%? | CDN fixes (A+C) → dup repair → B top-by-play + RVTR linkage |
| First 30 minutes? | **+45 acceptable** (CDN republish 45 tracks) |
| Biggest blocker? | **Queue B** — 218 missing covers, 76 without RVTR |
| Mostly auto or manual? | **Mixed** — CDN/dup auto · B acquire semi-auto · no-RVTR manual |
| Realistic Week 1 target? | **~65%** (328) automated · **~80%** with linkage sprint |
