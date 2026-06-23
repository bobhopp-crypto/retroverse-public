# Cover Integrity Recovery Plan

**Generated:** 2026-06-17  
**Status:** Execution plan — no code changes in this document  
**Basis:** Existing audit data only (`cover-integrity-scope-report`, `cover-integrity-operational-clarification`, `cover-backfill-safety-audit`, scope audit terminal output 2026-06-17T13:41:49Z)

**Operational baseline (accepted):**

| Metric | Value |
| --- | ---: |
| Album covers display | ~77% |
| Visually wrong | ~8% |
| CDN 404 (confirmed) | ~4.5% |
| Cover backfill | Paused (target posture) |
| Top 100 validation | Succeeded (68/68) |
| Intelligence packages | Working for completed cohort |

**Stop auditing.** Execute in phase order. Highest impact first: **delivery repair → wrong-cover triage → confidence labels → backfill gates → intelligence hardening.**

---

## Executive summary

| Phase | Scope | Est. effort | Display impact |
| --- | --- | --- | --- |
| **1 — Repair Delivery** | 979–17,724 local files → R2 | 1–2 days + overnight batch | **+4.5%** confirmed; up to **+18%** if unstaged gap is larger |
| **2 — Repair Wrong Covers** | 2,283 high-risk + 1,827 dup-wrong | 1–2 weeks | **−8%** wrong-art exposure |
| **3 — Confidence System** | Classify 21,757 albums | 1 day design + 1 day wire | Enables safe automation |
| **4 — Safe Backfill Resume** | 4,027 missing queue | 2–3 days eng prereqs | +11% coverage potential |
| **5 — Intelligence Protection** | Top 100 + ongoing packages | 1–2 days eng | Prevents fact/cover coupling |

**Total estimated repair time:** 3–4 weeks calendar (phases 1+3+5 parallelizable; phase 2 runs as human queue).

---

## Phase 1 — Repair Delivery

### Problem

Backfill and dossier promote write **local JPEGs** and PG `r2_cover_key` but **`publishLocalCoverToR2` is not wired** in `run-batch-core.ts`. Confirmed public holes: **979 CDN 404**. Local staging exists for **17,724 / 17,730** assigned albums.

### Inventory (from audit)

| Bucket | Count | Bulk-publishable? |
| --- | ---: | --- |
| Assigned albums with local JPEG on disk | **17,724** | Yes — idempotent PutObject |
| Confirmed CDN 404 (local likely exists) | **979** | **Yes — immediate** |
| Confirmed CDN 200 (already on R2) | **821** | Skip (HeadObject ok) |
| CDN probe timeout (likely already published) | **15,930** | Run idempotent publish; skip if R2 head hits |
| Assigned, file missing on disk | **6** | No — need re-acquire (Phase 2) |
| Missing assignment (no path) | **4,027** | No — Phase 4 backfill |

### How many exist locally but not on R2?

| Estimate | Count | Basis |
| --- | ---: | --- |
| **Confirmed gap** | **979** | Scope audit HTTP 404 |
| **Probable gap (recent backfill)** | **~500–2,000** | Recent successes CDN 404 while local exists; not fully enumerated |
| **Maximum theoretical gap** | **~16,903** | Scope `localOnlyNotCdn200` — **overstates** (includes HEAD timeouts on objects that are already on R2) |
| **Operational planning number** | **~1,500–3,000** | 979 confirmed + recent unstaged; validate during publish pass |

### Bulk-publish strategy

Use existing `lib/covers/backfill/publish-r2.ts`:

1. Iterate all rows with `canonical_cover_path` + local file exists.
2. `HeadObject` on `r2_cover_key` — skip if present.
3. `PutObject` from welcome/public mirror.
4. Verify CDN HEAD 200 (low concurrency, 15s timeout).
5. Log per-RVAL result; no PG mutation except optional `review_flag` note.

**Immediate batch:** 979 confirmed 404 first (highest user-visible ROI).  
**Overnight batch:** idempotent sweep of all 17,724 local files.

### Before / after

| Metric | Before | After Phase 1 (confirmed 404 fix) | After Phase 1 (full idempotent sweep) |
| --- | ---: | ---: | ---: |
| Album display (operational) | **76.9%** | **81.4%** | **~81–95%** (depends on true unstaged count) |
| CDN 404 (confirmed) | **4.5%** (979) | **~0%** | **~0%** |
| Fully broken (missing + 404) | **23.0%** | **~18.5%** | **~18.5%** (missing unchanged) |
| Canonical (strict) | **2.6%** | **~3–5%** | **~5–8%** (CDN 200 unlocks certification) |

### Effort estimate

| Task | Time |
| --- | --- |
| Wire batch publish script (reuse `publishLocalCoverToR2`) | 4–6 hours |
| Run confirmed-404 batch (979) | 30–60 min |
| Full idempotent sweep (17,724, ~2 obj/sec) | 2–4 hours runtime |
| CDN verification pass (low concurrency) | 2–3 hours |
| **Phase 1 total** | **1–2 days** |

**Highest-impact fix in entire plan.** Do this first.

---

## Phase 2 — Repair Wrong Covers

Focus: duplicate hashes, album/artist mismatches, quarantined assignments. **Do not touch missing-assignment bucket (4,027)** until Phase 4.

### Inventory

| Defect class | Count | Source |
| --- | ---: | --- |
| Same-artist duplicate-byte (wrong art) | **1,827** | Scope audit `sameArtistSubstitutionCount` |
| Albums in any shared-hash group | **2,183** | 934 duplicate hash groups |
| Cross-artist shared-hash groups | **183** | Scope audit |
| VERY_SUSPICIOUS (scoring band) | **2,277** | Scope audit |
| Repair queue eligible | **2,283** | `repairQueueCount` |
| Review-needed (CDN ok, weak evidence) | **252** | Scope audit |
| Normalization drift | **448** | Scope audit |
| Invalid (path, no file) | **6** | Scope audit |
| Artist slug mismatch (in VERY_SUSPICIOUS subset) | subset of 2,277 | Scoring `artist_slug_mismatch` |
| Album title filename mismatch | subset of 2,277 | Scoring `album_title_filename_mismatch` |

### Repair strategy

| Defect | Count (est.) | Strategy | Auto vs manual |
| --- | ---: | --- | --- |
| **Cross-artist duplicate hash** | **~356** albums | Auto repull via iTunes fill with title gate; publish to R2 | **Automatic** |
| **Same-artist duplicate (non-chart)** | **~1,400** | Auto repull + hash dedup check before promote | **Automatic** |
| **Same-artist duplicate (B200 chart albums)** | **~400** | Human visual QA → repull or curator_override | **Manual** |
| **VERY_SUSPICIOUS title/artist mismatch** | **~900** | Auto if title partial + artist exact; else manual review queue | **Mixed** |
| **Review-needed (252)** | **252** | Filename/path relabel or accept with YELLOW tier | **Manual** (quick) |
| **BROKEN (no file)** | **6** | Re-acquire or clear assignment | **Automatic** |
| **Quarantined spotlight** (Fleetwood Mac, Gary Wright, etc.) | **18** | Manual QA per `cover-integrity-audit.md` | **Manual** |

### Execution order

1. **Auto-repull cross-artist dups** — zero ambiguity, highest false-positive risk.
2. **Auto-repull same-artist dups** for albums with `b200_peak` NULL or > 100.
3. **Manual queue** for top-chart albums (B200 peak ≤ 100) — ~400 albums.
4. **Review-needed 252** — batch filename evidence review.
5. **Spotlight 18** — sign-off before clearing intelligence hold.

### Before / after (wrong-art)

| Metric | Before | After Phase 2 |
| --- | ---: | ---: |
| Visually wrong (duplicate-byte) | **~8.0%** (~1,736) | **~1–2%** (residual manual queue) |
| VERY_SUSPICIOUS | **2,277** | **< 300** |
| Repair queue | **2,283** | **< 400** |

### Effort estimate

| Task | Time |
| --- | --- |
| Auto-repull pipeline + hash gate | 1–2 days eng |
| Auto batch run (~1,750 albums) | 1–2 days runtime |
| Manual chart-album review (~400) | 3–5 days human |
| Spotlight sign-off (18) | 2–4 hours |
| **Phase 2 total** | **1–2 weeks** |

---

## Phase 3 — Cover Confidence System

Map existing audit scoring to three operational tiers. Aligns with `lib/cover-integrity/trust-tier.ts` (TRUSTED / REVIEW / HIGH_RISK / BROKEN) but uses user-facing colors.

### Tier definitions

| Tier | Meaning | Package use | Public display |
| --- | --- | --- | --- |
| **GREEN** | Title + artist evidence; file exists; CDN 200; no duplicate-byte conflict | Safe for intelligence artifacts | Trusted |
| **YELLOW** | Displays correctly; fails one certification gate (partial title, unstaged history, dup-free but unverified CDN) | Display only; flag in package metadata | OK |
| **RED** | Missing, CDN 404, duplicate/wrong art, VERY_SUSPICIOUS, BROKEN | Block cover in new packages; use placeholder | Broken or wrong |

### Classification rules (derived from existing scoring)

```
GREEN  ← TRUSTED tier + CDN 200 + titleExactMatch + !same_artist_shared_hash
YELLOW ← REVIEW tier OR functional non-canonical (displays, not certified)
RED    ← HIGH_RISK + BROKEN + missing + confirmed CDN 404 + same_artist_dup
```

### How existing covers classify today

| Tier | Count | % | Maps from |
| --- | ---: | ---: | --- |
| **GREEN** | **~569–15,431** | **2.6–70.9%** | Strict: 569 canonical. Loose: 15,431 TRUSTED (pre-CDN gate) |
| **YELLOW** | **~4,043–14,440** | **18.6–66.4%** | REVIEW tier + functional non-canonical |
| **RED** | **~2,283–6,748** | **10.5–31.0%** | HIGH_RISK + BROKEN + missing + 404 + dup-wrong |

### Recommended operational mapping (post–Phase 1 publish)

Use **CDN-verified** TRUSTED as GREEN floor:

| Tier | Count (est.) | % |
| --- | ---: | ---: |
| **GREEN** | **~13,500** | **~62%** |
| **YELLOW** | **~4,300** | **~20%** |
| **RED** | **~3,957** | **~18%** |

Derivation: 15,431 TRUSTED − 1,827 dup-wrong − ~979 pre-fix 404 ≈ 12,625; plus 569 canonical; after Phase 1 CDN fix, +979 move RED→GREEN.

### Implementation note (future code)

- Store tier on `album_artwork_links` or sidecar JSON keyed by RVAL.
- Recompute after every promote/publish/repull.
- Expose to intelligence via `loadCoverInfoForRvtrs` — no UI required in this phase.

**Effort:** 1 day tier spec + 1 day pipeline hook (no UI).

---

## Phase 4 — Safe Backfill Resume

**Do not resume** until all gates below pass. Queue: **4,027** missing albums.

### Hard requirements (all must pass)

| # | Requirement | Verification |
| --- | --- | --- |
| 1 | **R2 publish wired** | `publishLocalCoverToR2` called in `run-batch-core.ts` after every `promoteDossierCoverToPg` |
| 2 | **R2 publish verification** | CDN HEAD 200 before batch marks album success; failure → retry queue, not `review_flag=ok` |
| 3 | **Cover evidence gates** | `assessAlbumCoverEvidence` runs pre-promote; weak title → `review_needed`, not `ok` |
| 4 | **Duplicate detection** | SHA-256 hash check against same-artist corpus; block promote if different album shares bytes |
| 5 | **Confidence scoring** | Post-promote tier assigned; RED → no `canonical_cover_path` on `albums` until YELLOW+ |
| 6 | **Backfill state** | `paused: false` only after 1–5 deployed and Phase 1 sweep complete |
| 7 | **Hold policy** | `cover-integrity-hold.json` cleared only after spotlight 18 pass + GREEN tier > 60% on Top 500 cohort |

### Resume rollout

| Step | Action |
| --- | --- |
| 1 | Deploy gates on `run-batch-core.ts` |
| 2 | Run `--once --limit 10` smoke batch; verify R2 + CDN + tier |
| 3 | Resume at `BACKFILL_BATCH_SIZE=50` (reduced from 100) |
| 4 | Monitor: CDN 404 rate must stay **0%** on new promotions |
| 5 | Full queue drain only after 500 albums clean |

### Expected outcome (4,027 queue)

| Metric | At 62.8% historical success rate |
| --- | ---: |
| New assignments | ~2,528 |
| New missing resolved | ~2,528 |
| Album display after | **~76.9% → ~88%** (if all publish clean) |
| Expected dup-wrong (with gates) | **< 50** (vs ~260 without gates) |

**Effort:** 2–3 days engineering + 1 week monitored ramp.

---

## Phase 5 — Intelligence Protection

**Goal:** Top 100 packages stay valid. New package generation continues. Covers cannot corrupt facts or stories.

### Current state

| Asset | Status |
| --- | --- |
| Top 100 validation | **68/68 succeeded** — grandfather as published |
| `cover-integrity-hold.json` | **Active** — blocks `runForcedProductionPipeline`, overnight build, top100 re-run |
| Cover → facts coupling | **None today** — facts from research vault / story cards, not cover bytes |
| Cover → package | Cover URL attached via `loadCoverInfoForRvtrs`; no fact extraction from image |

### Protection rules

| Rule | Implementation (future) |
| --- | --- |
| **Grandfather published packages** | RVTRs in `reports/intelligence/top100-validation/results.json` — never auto-invalidate on cover tier change |
| **Tier gate on new packages** | Package build: if linked album cover is RED → use placeholder URL + `coverConfidence: red` metadata; do **not** block fact promotion |
| **Facts isolation** | `promoteVerifiedFacts` and story cards remain independent of `album_artwork_links`; no cover fields in `CandidateFact` |
| **Story isolation** | Card assembly reads research stories only; cover tier logged in `processLog`, not in card text |
| **Scaling hold lift** | Clear `cover-integrity-hold.json` when: Phase 1 complete + Top 100 cohort covers ≥ 80% GREEN + zero RED in Top 100 |
| **Cover recovery cap** | Keep `AUTO_RECOVER_THRESHOLD = 78`; require album title match (already capped in `cover-recovery-queue.ts`) |

### What continues during recovery

| Activity | Allowed? |
| --- | --- |
| Serve existing Top 100 song sheets | **Yes** |
| Re-run production pipeline on new RVTR | **After hold lift** |
| Overnight Top 500 build | **After hold lift + Phase 1** |
| Manual single-RVTR package (`processSong` without hold check) | Review call — bypass only for ops |
| Public browse / search | **Yes** |

### Effort

| Task | Time |
| --- | --- |
| Grandfather list + tier metadata on package | 4 hours |
| Hold lift criteria automation | 4 hours |
| Top 100 cover tier spot-check | 2 hours |
| **Phase 5 total** | **1–2 days** |

---

## Priority order (highest impact first)

| Rank | Action | Why | Est. time |
| ---: | --- | --- | --- |
| **1** | Bulk R2 publish (979 confirmed 404) | +4.5% display immediately; zero ambiguity | 1 day |
| **2** | Idempotent R2 sweep (17,724 local) | Closes staging gap; unlocks GREEN tier | 1 day |
| **3** | Wire publish + evidence gates in backfill | Prevents recurrence | 2 days |
| **4** | GREEN/YELLOW/RED tier sidecar | Enables safe automation | 2 days |
| **5** | Auto-repull cross-artist dups | Removes clearest wrong-art | 2 days |
| **6** | Intelligence hold lift criteria | Unblocks scaling | 1 day |
| **7** | Manual chart-album dup review | Fixes visible wrong-art on high-traffic albums | 1 week |
| **8** | Resume backfill (gated) | Fills 4,027 missing | ongoing |

---

## Success metrics (exit criteria)

| Metric | Current | Target |
| --- | ---: | ---: |
| Album display | 76.9% | **≥ 90%** |
| CDN 404 | 4.5% | **< 0.5%** |
| Visually wrong | ~8% | **< 2%** |
| GREEN tier | ~2.6% strict / ~71% loose | **≥ 60%** CDN-verified |
| RED tier | ~31% operational | **< 15%** |
| Top 100 cover GREEN | TBD spot-check | **≥ 80%** |
| New backfill promotions without CDN 200 | 100% (broken) | **0%** |

---

## References

| Document | Use |
| --- | --- |
| `reports/intelligence/cover-integrity-operational-clarification.md` | Operational vs certification framing |
| `reports/intelligence/cover-integrity-scope-report.md` | Corpus counts |
| `reports/intelligence/cover-backfill-safety-audit.md` | Pipeline gaps |
| `reports/intelligence/cover-integrity-audit.md` | Spotlight manual queue |
| `lib/covers/backfill/publish-r2.ts` | R2 publish (exists, not wired) |
| `lib/cover-integrity/trust-tier.ts` | Existing tier logic |
| `lib/cover-integrity/album-cover-evidence.ts` | Evidence gates |
| `lib/ops/intelligence/intelligence-cover-hold.ts` | Intelligence pause |

---

## What we are not doing in this plan

- No new audits
- No new UI
- No code changes in this document
- No backfill resume until Phase 4 gates ship
- No auto-mutation of Top 100 published packages

**Next engineering step:** Phase 1 — batch `publishLocalCoverToR2` over 979 confirmed CDN 404s, then idempotent sweep.
