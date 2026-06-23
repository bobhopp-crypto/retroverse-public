# Phase 1 — Delivery Repair Report

**Generated:** 2026-06-17T14:36:21Z  
**Completed:** 2026-06-17T14:36:22Z  
**Scope:** Infrastructure repair only — publish local JPEGs for CDN **404** assignments. **No** assignment, recovery, tier, quarantine, or duplicate changes.

**Tool:** `npm run cover:phase1-delivery` → `tools/cover-integrity/phase1-delivery-repair.ts`

---

## Summary

| Metric | Count |
| --- | ---: |
| **Attempted** | **3,817** |
| **Published** (R2 PutObject + R2 HEAD ok) | **3,817** |
| **Verified** (CDN HEAD 200 after upload) | **3,817** |
| **Failed** | **0** |
| **Remaining 404** (repaired batch) | **0** |
| **Remaining 404** (full assigned corpus) | **864** |

All 3,817 candidates were **CDN 404 + local file exists** at scan time. Each was published via `publishLocalCoverToR2` and re-verified with CDN HEAD 200.

---

## Display rate (operational)

Formula: `(assigned − assigned CDN 404) / total RVAL albums`

| | Assigned CDN 404 | Display rate |
| --- | ---: | ---: |
| **Before** | 2,551 | **69.8%** |
| **After** | 864 | **77.5%** |
| **Delta** | −1,687 | **+7.7 pp** |

| Corpus | Count |
| --- | ---: |
| Total RVAL albums | 21,757 |
| Assigned (`canonical_cover_path`) | 17,730 |
| Missing assignment (unchanged) | 4,027 |

**Note on prior audit figure (979 CDN 404):** The June scope audit used 40 concurrent HEAD requests at 6s timeout and under-counted true 404s while mass-timeout inflated “broken.” Phase 1 used 12s timeout at concurrency 12 and found **2,551** assigned CDN 404s before repair — **3,817** of those had local files ready to publish.

---

## Remaining 864 assigned CDN 404s

Not attempted in this batch — **no local file** at publish path, or not 404+local at scan time. These require re-acquire (Phase 4 backfill) or file restoration, not R2 publish alone. Assignment rows were **not** modified.

---

## Failures

_None._ 3,817 / 3,817 published and CDN-verified.

---

## Post-run cover integrity audit comparison

`npm run cover:audit` run immediately after Phase 1 (`2026-06-17T14:36:55Z`).

### Assignment & integrity (unchanged — expected)

| Metric | Pre-Phase 1 (2026-06-17 scope) | Post-Phase 1 audit | Δ |
| --- | ---: | ---: | ---: |
| RVAL albums | 21,757 | 21,757 | 0 |
| With canonical path | 17,730 | 17,730 | 0 |
| Missing path | 4,027 | 4,027 | 0 |
| File missing on disk | 6 | 6 | 0 |
| Files hashed | 17,724 | 17,724 | 0 |
| VERY_SUSPICIOUS | 2,277 | 2,277 | 0 |
| Same-artist hash dup | 1,827 | 1,827 | 0 |
| Repair queue | 2,283 | 2,283 | 0 |
| TRUSTED tier | 15,431 | 15,431 | 0 |
| HIGH_RISK tier | 2,277 | 2,277 | 0 |
| BROKEN tier | 6 | 6 | 0 |

**Confirms:** Phase 1 touched **delivery only** — no assignment or scoring drift.

### Delivery (changed)

| Metric | Before Phase 1 | After Phase 1 |
| --- | ---: | ---: |
| Assigned CDN 404 | 2,551 | 864 |
| Operational display rate | 69.8% | **77.5%** |
| Local files published to R2 | — | **3,817** |

The integrity audit (`runCoverIntegrityAudit`) does not embed CDN HEAD in `summary.json`; delivery delta is measured by the Phase 1 CDN scan (documented above).

---

## Artifacts

| File | Purpose |
| --- | --- |
| `reports/cover-integrity/phase1-delivery-results.json` | Per-RVAL publish log (3,817 rows) |
| `reports/cover-integrity/phase1-delivery-run.log` | Console log |
| `reports/cover-integrity/phase1-post-audit-summary.json` | Post-run `cover:audit` snapshot |
| `reports/cover_integrity/summary.json` | Updated audit output |
| `reports/cover-integrity/phase1-post-audit-run.log` | Audit console log |

---

## Method

1. Load all 17,730 assigned albums from PG (`loadCoverInventoryFromPg`).
2. CDN HEAD each URL (12s timeout, concurrency 12).
3. Select **HTTP 404 + local JPEG exists**.
4. `publishLocalCoverToR2` — PutObject, R2 HeadObject, CDN HEAD.
5. Retry CDN HEAD after 1.5s if not immediately 200.
6. Re-scan full assigned corpus for CDN 404 count.

**Runtime:** ~15 minutes (scan + 3,817 publishes + re-scan).

---

## Next steps (out of Phase 1 scope)

- **864** remaining assigned CDN 404s — need local file or re-acquire.
- **4,027** missing assignments — Phase 4 gated backfill.
- **1,827** duplicate/wrong covers — Phase 2.
- Wire `publishLocalCoverToR2` into `run-batch-core.ts` before backfill resume.
