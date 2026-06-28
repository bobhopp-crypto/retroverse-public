# Sprint 3.18 — Mission Control State Audit

**Date:** 2026-06-27  
**Objective:** Mission Control becomes a real-time system dashboard driven entirely by live department state.

---

## Summary

Mission Control is now a **renderer**, not a calculator. All queue counts, package totals, current-song state, and Studio Activity flow through a shared `department-status` module and lightweight read-only APIs. Mission Control polls `/api/ops/studio/status` every 2.5s for live updates.

---

## Pipeline State Sources Discovered (Before Sprint)

| Source | Location | What it computed | Used by |
|--------|----------|------------------|---------|
| Collector progress file | `research-department/collector-progress.json` | status, current song, queue, completed today, activity | Collector page, collector/progress API, partially pipeline-snapshot |
| Package stage scan (`resolvePackageStages`) | `lib/ops/studio/living/load-living-studio.ts` | Per-RVTR stage, queue counts per stage, activity from file mtimes | Mission Control, department living chrome |
| Pipeline health scan | `lib/ops/studio/pipeline-snapshot.ts` | Queue waiting/complete per department, published total | Pipeline diagnostics, Mission Control (mixed) |
| Publisher store | `publisher-store.json` | Evaluated/approved records, metrics | Publisher dashboard |
| Package stage assessment | `lib/ops/studio/production/package-stage.ts` | Per-RVTR needsRun / stage | Production queue selection |
| Collector recentActivity | In collector progress | Activity strings | Mission Control (reconstructed feed) |
| Publisher decisions | In publisher records | Decision history | Mission Control (reconstructed feed) |
| Rotating personality strings | `lib/ops/studio/living/personalities.ts` | Fake “current activity” copy | Mission Control department cards |

**Problem:** Mission Control ran its own RVTR directory scan (`resolvePackageStages`) and mixed those counts with `pipelineHealth` and `collectorStats`, producing inconsistent queue numbers across pages.

---

## Authoritative Sources (After Sprint)

| Data | Authoritative source | API |
|------|---------------------|-----|
| Collector runtime state | `collector-progress.json` | `GET /api/ops/studio/collector/status` |
| Editor/Director/Publisher runtime state | `department-runtime-progress.json` | `GET /api/ops/studio/{dept}/status` |
| Queue counts (all departments) | `buildDepartmentQueueIndex()` — single RVTR scan | Included in all status APIs + `/api/ops/studio/status` |
| Package totals / published count | Queue index (reads publisher store once) | `/api/ops/studio/status` → `queueIndex.publishedTotal` |
| Studio Activity | `studio-pipeline-events.json` | `/api/ops/studio/status` → `activity` |
| Pipeline diagnostics | `buildPipelineHealthSnapshot()` — thin wrapper over queue index | Server component fallback |

### New files

- `lib/ops/studio/department-status/` — types, queue index, status loaders, pipeline events, runtime progress
- `lib/ops/studio/production/sync-pipeline-events.ts` — bridges production transitions → events + runtime state
- `app/api/ops/studio/status/route.ts` — aggregate Mission Control payload
- `app/api/ops/studio/{collector,editor,director,publisher}/status/route.ts` — per-department status
- `tools/ops/studio-state-audit.ts` — consistency verification script

### On-disk state files

| File | Owner |
|------|-------|
| `research-department/collector-progress.json` | Collector |
| `research-department/department-runtime-progress.json` | Editor, Director, Publisher |
| `research-department/studio-pipeline-events.json` | Shared activity stream |

---

## Duplicate / Cached Calculations Removed

| Removed | Replaced by |
|---------|-------------|
| `resolvePackageStages()` in Mission Control for queue counts | `getDepartmentQueueIndexCached()` |
| Independent editor queue: `packageRows.filter(r => r.stage === "editor").length` | `statuses.editor.queueRemaining` |
| Independent director/publisher queue from mixed sources | Queue index waiting counts |
| `buildActivityFeed()` reconstructing activity from package mtimes + publisher decisions | `loadStudioActivityFeed()` from pipeline events |
| Duplicate RVTR scan inside `buildPipelineHealthSnapshot()` | Delegates to `buildDepartmentQueueIndex()` |
| Mission Control `todayAccomplishments` from package stage counts | Derived from live department status + collector today count |

**Retained (display-only, not used for counts):**

- Publisher store for recent publication cards (approved records sorted by date)
- Director production room step UI (reads director package for current RVTR only)

---

## Event Emission Points

Pipeline events are appended at:

1. **Collector** — `run-collector.ts` `pushActivity()`, song start
2. **Production** — `run-song.ts` via `sync-pipeline-events.ts` on each stage transition
3. **Publisher decisions** — `publisher/[rvtr]/decision/route.ts` on approve actions

Runtime progress (`department-runtime-progress.json`) updated on editor/director/publisher start, complete, and error.

---

## Verification Results

Run:

```bash
NODE_OPTIONS='--require ./tools/finance/preload-server-only.cjs' npx tsx tools/ops/studio-state-audit.ts
```

**2026-06-27 run — 9/9 passed:**

| Check | Result |
|-------|--------|
| Collector queue — live status vs pipeline health | PASS (6579 vs 6579) |
| Editor queue — live status vs pipeline health | PASS (200 vs 200) |
| Director queue — live status vs pipeline health | PASS (0 vs 0) |
| Publisher queue — live status vs pipeline health | PASS (0 vs 0) |
| Published total — queue index vs pipeline health | PASS (0 vs 0) |
| Collector queue — live vs living chrome | PASS |
| Editor queue — live vs living chrome | PASS |
| Director queue — live vs living chrome | PASS |
| Publisher queue — live vs living chrome | PASS |

**Typecheck:** `npx tsc --noEmit` — Pass

**Mission Control polling:** Client polls `/api/ops/studio/status` every 2.5s; department cards and pipeline counts update without full page refresh.

---

## Page Consistency Matrix

| Page | Queue source | Activity source |
|------|-------------|-----------------|
| Mission Control (`/ops/studio`) | `/api/ops/studio/status` (polled) | Pipeline events |
| Collector | `loadDepartmentLivingSnapshotLite` → status loaders | Pipeline events |
| Editor | Same | Pipeline events |
| Director | Same + director package for step UI | Pipeline events |
| Publisher | Same + publisher store for dashboard columns | Pipeline events |
| Pipeline diagnostics | `buildPipelineHealthSnapshot` → queue index | N/A |

---

## Remaining Risks / Follow-ups

1. **Editor/Director/Publisher idle runtime** — Runtime progress files are only updated during production runs and publisher approve actions. Manual editor/director work outside `run-song.ts` won't show `running` status until those paths emit events (additive, no workflow change required).

2. **Activity backfill** — Existing collector `recentActivity` is not migrated into `studio-pipeline-events.json`. New events accumulate from this sprint forward. Optional one-time backfill script if historical activity is needed in Mission Control.

3. **Queue index scan cost** — Single shared scan per request (React `cache()` dedupes within a request). Large libraries may still benefit from incremental indexing in a future sprint.

4. **Department chrome polling** — Collector has live polling via `/api/ops/studio/collector/progress`; Editor/Director/Publisher chrome is SSR-only on navigation. Mission Control polls aggregate status. Consider adding status polling to `DepartmentLivingChrome` if sub-second parity is needed on department pages.

5. **`npm run typecheck`** — Script not defined in package.json; use `npx tsc --noEmit`.

---

## Execution State

**COMPLETE** — Live department status APIs, Mission Control wired to live state, consistent queue counts verified, activity feed from pipeline events, audit report delivered.
