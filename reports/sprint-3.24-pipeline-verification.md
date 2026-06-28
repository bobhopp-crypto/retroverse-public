# Sprint 3.24 — End-to-End Studio Pipeline Verification

**Date:** 2026-06-28  
**Status:** COMPLETE

---

## Executive Summary

The Studio pipeline works end-to-end when driven by `runProductionSong`. The observed stall (Collector + Editor complete, Director waiting) was caused by **running departments separately via Browser+ 2 queue** rather than through the full production runner. BP2 queue runs one department per job by design; it does not auto-chain Director after Editor.

**Verified song:** RVTR001341 — Dr. Hook — *When You're In Love With A Beautiful Woman*  
**Final state:** Published  
**Patron URL:** `/experience/RVTR001341`

---

## Phase 1 — Trace: RVTR001341 (Before Fix)

| Stage | Entered | Exited | Artifacts | Events |
|-------|---------|--------|-----------|--------|
| Collector | Prior batch | Complete | `collector.json`, `song-dna.json`, `visual-identity.json` | `started` only (no `collector_complete` from standalone collector run) |
| Editor | — | Not run | No `editor.json` | None |
| Director | — | Waiting | No `director.json` | None |
| Publisher | — | Waiting | No publisher record | None |

**Where workflow stopped:** After Collector-only run. Editor was never invoked. Mission Control showed Director/Publisher as waiting — correct for artifact state.

**Production Tracker bug:** "Open Experience" and "Open Finished Package" were active links even when Director/Publisher artifacts did not exist.

---

## Phase 2 — Intended Architecture (Evidence)

### Two execution modes coexist (by design)

#### Mode A — Full automatic pipeline

**Entry:** `runProductionSong()` in `lib/ops/studio/production/run-song.ts`  
**Also used by:** `tools/research/studio-production-run.ts`, `tools/research/studio-year-batch.ts`

Flow:

```
Collector → Editor (pass-through + handoff) → Director → Publisher → Published
```

- `ensureDirectorHandoff()` auto-submits Editor (no manual review gate)
- Director runs when render spec missing
- Publisher evaluates + auto-publishes when policy allows
- Emits pipeline events at each transition via `syncPipelineTransition()`

**Answer:** Automatic A→B→C→D is intended **for production batch runs**.

#### Mode B — Browser+ 2 per-department queue

**Entry:** `drainStudioQueue()` → `runQueueDepartmentStep()` → `StudioExecutionEngine`

Departments are separate queue jobs:

| Queue job | Worker | Action |
|-----------|--------|--------|
| `run-collector` | collector | run |
| `run-editor` | editor | draft |
| `run-director` | director | run |
| `rebuild-experience` | director | run |

**Answer:** BP2 does **not** auto-chain departments. Operator queues each step (or uses Mode A).

#### Mode C — Manual department UI

Operators can open Collector/Editor/Director/Publisher workspaces individually. No automatic handoff between pages.

### STUDIO_BRAIN alignment

> "Target interaction model: Departments do not invoke each other long-term. Scheduler assigns jobs."

Full pipeline (`runProductionSong`) is the **batch orchestrator** — it sequences workers without redesigning department boundaries. BP2 single-department jobs are the **incremental** path.

---

## Phase 3 — Repairs Applied

### 1. Editor worker handoff (BP2 path)

**Problem:** `editor` worker `draft` action saved `editor.json` but did **not** submit Director handoff. Director queue job could run but Editor pass-through (auto-approve + `director-handoff.json`) was skipped.

**Fix:** `lib/ops/studio/editor/worker.ts` — after draft, call `runEditorPassThrough()` so handoff file exists (matches `runProductionSong` behavior).

### 2. Production Tracker action gating (Phase 4)

**Problem:** Open buttons always rendered as links regardless of artifact presence.

**Fix:**

| Department | Button enabled when |
|------------|---------------------|
| Collector | `collector.json` exists |
| Editor | `editor.json` exists |
| Director | `director-render-spec.json` exists |
| Publisher | Package approved/published |

Disabled state shows: "Available after {Department} completes."

---

## Phase 4 — Verified Run: RVTR001341

Command:

```bash
NODE_OPTIONS='--require ./tools/finance/preload-server-only.cjs' \
  npx tsx tools/research/studio-verify-one-song.ts RVTR001341
```

### Result

| Field | Value |
|-------|-------|
| Status | **published** |
| Runtime | 680ms (collector skipped — existing package) |
| Collector | skipped (existing) |
| Editor | complete (21ms) |
| Director | complete (34ms) |
| Publisher | approved (592ms) |

### Artifacts written

```
data/ops/intelligence/research-department/RVTR001341/
├── collector.json          (pre-existing)
├── editor.json             (new)
├── director-handoff.json   (new)
├── director.json           (new)
├── director-render-spec.json (new)
├── song-dna.json
├── visual-identity.json
└── visual-assets/
```

### Pipeline events emitted

`collector_complete` → `editor_queued` → `editor_started` → `editor_complete` → `director_queued` → `director_started` → `director_complete` → `publisher_queued` → `publisher_started` → `publisher_complete` → `published`

### Outputs verified

| Output | Location |
|--------|----------|
| Story | `editor.json` → Editor workspace `/ops/studio/editor/RVTR001341` |
| Timeline / DNA / Blueprint | `director.json`, `director-render-spec.json` → `/ops/studio/director?rvtr=RVTR001341` |
| Finished package | `/experience/RVTR001341` |
| Publisher review | `/ops/studio/publisher/RVTR001341` |

---

## Root Cause Summary

| Observation | Cause |
|-------------|-------|
| Director waiting after Editor "complete" in MC | Editor was never run via full pipeline; or BP2 ran collector only |
| Open Experience / Open Finished Package always clickable | Tracker UI did not gate on artifact presence |
| Editor complete but no Director handoff (BP2) | Editor worker saved draft without pass-through submit |

**Not broken:** `runProductionSong` full pipeline — verified working.

---

## Files Modified

| File | Change |
|------|--------|
| `lib/ops/studio/editor/worker.ts` | Auto pass-through + Director handoff after draft |
| `lib/ops/studio/production-tracker/types.ts` | `openEnabled`, `openHint` on steps |
| `lib/ops/studio/production-tracker/load-production-tracker.ts` | Gate open actions on artifact flags |
| `components/ops/studio/production-tracker/ProductionTrackerView.tsx` | Disabled state for unavailable actions |
| `app/ops/studio/production-tracker.css` | Disabled button styling |

## Files Created

| File | Purpose |
|------|---------|
| `tools/research/studio-verify-one-song.ts` | Single-RVTR full pipeline verification |
| `reports/sprint-3.24-pipeline-verification.md` | This report |

---

## How to Run Full Pipeline

**One song:**

```bash
NODE_OPTIONS='--require ./tools/finance/preload-server-only.cjs' \
  npx tsx tools/research/studio-verify-one-song.ts RVTR001341
```

**Batch:**

```bash
npm run research:studio:production -- --limit 1
```

**BP2 incremental:** Queue `run-collector`, then `run-editor`, then `run-director` separately (Editor now submits handoff automatically).

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| RVTR001341 full pipeline | Published |
| Tracker buttons gated | Fixed |
| `/experience/RVTR001341` | Ready for patron evaluation |

---

## Execution State: COMPLETE
