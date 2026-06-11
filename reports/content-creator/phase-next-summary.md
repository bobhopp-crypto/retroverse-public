# Content Creator Phase Next — Summary

**Date:** 2026-06-08

## Delivered

### 1. QR production fix
- Matrix fill target **85–90%** of reserved safe area (`qr-zone-render.ts`)
- ISO quiet zone preferred when in range
- Print size + matrix fill warnings on export (`pass-export-composite.ts`)
- **Print Scan Test** button → actual-size 2.25"×3.5" HTML sheet (`print-scan-test-sheet.ts`)
- AI prompt: no overlap / no duplicate QR placeholders (`pass-layout.ts`)

### 2. Library usability
- 2-col mobile → **6-col on 27"** desktop grid
- Thumbnail-dominant cards; era/direction one line; small overlay rating
- Actions only: Open · Duplicate · Variations(10) · Export

### 3. Generation lifecycle audit
- `reports/content-creator/generation-lifecycle-audit.md`

### 4. Job queue
- Disk-backed queue + runner + UI panel
- `reports/content-creator/job-queue-report.md`

### 5. Variations workflow
- Queued batches (10 default)
- `VariationBatchView` — parent tree, compare mode, favorite, branch, export
- `?batch={variationBatchId}` on library URL

### 6. Artwork direction
- `COLLECTIBLE_HERO_RULES` + `SUBJECT_AVOIDANCE_RULES` in RVBR prompt engine
- Global anti-people negatives in `anti-repetition.ts`

## Screenshots

Capture after deploy:

| View | Path |
|------|------|
| Library grid (desktop) | `reports/content-creator/screenshots/library-desktop-after.png` |
| Library grid (mobile) | `reports/content-creator/screenshots/library-mobile-after.png` |
| Queue panel | `reports/content-creator/screenshots/queue-panel-after.png` |
| Variation batch | `reports/content-creator/screenshots/variation-batch-after.png` |
| Print scan test | `reports/content-creator/screenshots/print-scan-test-after.png` |
| QR warning | `reports/content-creator/screenshots/qr-warning-after.png` |

*Screenshots not auto-captured in this session — add via browser at `/ops/content-creator` and `/ops/content-creator/create`.*

## Remaining risks

1. **Detached runner** may not spawn in some Next dev/prod setups — run `npx tsx tools/content-creator/run-jobs.ts` manually.
2. **Existing index entries** lack `variationBatchId` until re-sync/backfill.
3. **QR scan** still depends on AI keeping white zone clear — decode test is the gate.
4. **Job stuck `running`** after hard kill — no auto-heal yet.
5. **Prompt changes** need real generation samples to validate less portrait drift.

## Recommended next phase

1. Mid-run checkpoints + per-step job progress.
2. Batch screenshot regression for QR fill metrics.
3. Re-index library for `variationBatchId` on all variation children.
4. Physical print calibration loop (phone scan distance fixtures).
