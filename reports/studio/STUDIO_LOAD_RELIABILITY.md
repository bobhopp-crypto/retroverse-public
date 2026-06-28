# Sprint 3.17 — Studio Load Reliability

## Root cause

Studio pages hung because every request ran **synchronous, unbounded filesystem work** on ~648 RVTR packages:

1. **`resolvePackageStages()`** — sequential loop; called `getPublisherRecord(rvtr)` per RVTR, re-parsing the **5.6MB `publisher-records.json`** hundreds of times per request.
2. **`buildPublisherDashboard()`** on Publisher page — called **`syncPublisherQueue()`**, running `evaluatePublisherPackage()` for unevaluated director-ready songs **during page load**.
3. **`buildPipelineHealthSnapshot()`** — full 648-RVTR sequential scan, **`loadBrowserPlus2Model()`** (VDJ scan), and per-RVTR **`assessEditorPassThrough()`** loop. Built **twice** on dashboard (living snapshot + `PipelineDiagnosticsPanelServer`).
4. **Department pages** — `loadDepartmentLivingSnapshot()` pulled the **full living snapshot** in parallel with full library index scans (648 packages each for Collector/Editor).
5. **`loadDirectorProductionSnapshot()`** — nested **`loadLivingStudioSnapshot()`** after its own stage scan.
6. **No JSON safety** — concurrent production writes could cause parse failures or partial-read hangs on collector/editor/publisher JSON.

Command Center links were correct; slowness was **server-side loader cost**, not routing.

## Fixes applied

| Area | Change |
|---|---|
| Safe I/O | `readJsonFileSafe` + `withTimeout` — parse errors and partial writes return fallback |
| Publisher store | Single cached read per request; optional store param on `getPublisherRecord` |
| Living snapshot | Cap scan to 200 recent RVTRs; batch parallel reads; publisher store loaded once; read-only publisher dashboard |
| Pipeline health | Cap scan to 200; drop BP2/VDJ load; drop pass-through assessment loop; React `cache()` dedupe |
| Dashboard | Pass `pipelineHealth` to diagnostics panel — no second snapshot build |
| Department pages | `loadDepartmentLivingSnapshotLite` — dept chrome only, no full dashboard |
| Publisher page | `buildPublisherDashboardReadOnly()` — no sync/evaluate on load |
| Library indexes | Cap to 150 recent RVTRs; batched parallel package reads |
| Collector/Editor stores | Safe JSON reads with 2s timeout |

## Files changed

**Created**
- `lib/ops/studio/safe-io.ts`
- `lib/ops/studio/list-rvtrs.ts`
- `lib/ops/studio/studio-cached-loaders.ts`
- `reports/studio/STUDIO_LOAD_RELIABILITY.md`

**Modified**
- `lib/ops/studio/living/load-living-studio.ts`
- `lib/ops/studio/living/types.ts`
- `lib/ops/studio/living/index.ts`
- `lib/ops/studio/pipeline-snapshot.ts`
- `lib/ops/studio/publisher/store.ts`
- `lib/ops/studio/publisher/list-packages.ts`
- `lib/ops/studio/collector/store.ts`
- `lib/ops/studio/collector/load-library.ts`
- `lib/ops/studio/editor/store.ts`
- `lib/ops/studio/editor/load-library.ts`
- `app/ops/studio/page.tsx`
- `app/ops/studio/collector/page.tsx`
- `app/ops/studio/editor/page.tsx`
- `app/ops/studio/publisher/page.tsx`
- `components/ops/studio/PipelineDiagnosticsPanelServer.tsx`

## Route load verification

Warm requests with ops cookie (`retroverse_ops_gate=ok`), dev server `RETROVERSE_OPS=1`:

| Route | HTTP | Time | Target |
|---|---|---|---|
| `/ops/studio` | 200 | **789ms** | < 3s ✓ |
| `/ops/studio/collector` | 200 | **1750ms** | < 3s ✓ |
| `/ops/studio/editor` | 200 | **1617ms** | < 3s ✓ |
| `/ops/studio/director` | 200 | **877ms** | < 3s ✓ |
| `/ops/studio/publisher` | 200 | **1965ms** | < 3s ✓ |

## Typecheck

`npx tsc --noEmit` — **Pass**

## Remaining risks

1. **Capped scans (200 snapshot / 150 library)** — counts and cards reflect recent packages only, not full 648-RVTR corpus. Older packages off the recent window won't appear in dashboard/library first paint.
2. **Cold compile** — first request after dev restart may exceed 3s while Next compiles routes.
3. **Individual RVTR pages** — `[rvtr]/page` still loads full library index for prev/next neighbors (capped to 150, not 648).
4. **Publisher sync** — `buildPublisherDashboard()` / `syncPublisherQueue()` still run on explicit actions/API; not on page load.
5. **Pipeline health totals** — `totalVideoRows` now reflects total RVTR dir count; department complete/waiting counts are from the 200-RVTR sample.

## Execution state

**COMPLETE** — Studio loads reliably under background production; no UI changes.
