# Retroverse Studio — Studio Brain

**Single source of truth for AI agents and humans working on Studio.**

Read this before touching Studio infrastructure. Do not restate this philosophy in every prompt — reference this file instead.

---

## Reading Order

1. `.cursor/rules/retroverse-workflow.mdc`
2. `.cursor/rules/retroverse-design.mdc`
3. `.cursor/rules/retroverse-data.mdc`
4. `docs/studio/STUDIO_BRAIN.md`
5. Current approved phase prompt

---

## Mission

Retroverse Studio is the production system that turns canonical song identity (RVTR) into curated patron experiences. Every operation belongs to a department. Work flows through jobs and queues — not ad-hoc cross-department calls. The Studio Kernel (`lib/studio/`) holds shared infrastructure; departments hold business logic.

---

## Current Status

| Field | Value |
|-------|-------|
| **Current Studio Milestone** | S-009 — Multi-Worker Execution Engine |
| **Current Approved Phase** | Phase 9 (complete) |
| **Last Completed Phase** | Phase 9 — `StudioExecutionEngine` registers department workers; scheduler executes through engine |
| **Next Approved Milestone** | *None approved — see Suggested Next below* |

**Recent commits:**

| Milestone | Commit | Summary |
|-----------|--------|---------|
| S-003 | `2feb162` | Package registry — kernel paths, version constants, department shims |
| S-004 | `30fa604` | Status & readiness — kernel `status.ts`, BP2 `studio-status-adapter.ts` |
| S-005 – S-009 | *(in tree)* | Metrics, contracts, workers, scheduler integration, execution engine — see roadmap |

S-001 (kernel scaffold) and S-002 (queue infrastructure) landed in the S-003 commit baseline (`lib/studio/` including `queue.ts`). S-002+ queue and scheduler adapters exist in the working tree; S-005 through S-009 are complete in tree pending commit/review.

---

## Studio Principles

Permanent rules. Do not violate without explicit approval.

1. **Preserve behavior before adding features.** No intentional user-visible changes during infrastructure phases.
2. **Extract before rewriting.** Consolidate, name, organize — do not redesign.
3. **One subsystem per phase.** Finish one scope, stop, report, wait for review.
4. **Stop after every milestone.** Do not roll into the next phase unapproved.
5. **Verify every phase.** Run `tsc --noEmit`. Runtime-test when possible; explain when not.
6. **Keep commits reversible.** Each milestone should leave the repo healthier.
7. **Prefer infrastructure over duplication.** One canonical implementation in the kernel.
8. **Architecture must simplify future work.** Especially MCP and multi-worker integration.

---

## Departments

Ownership only. Implementation lives under `lib/ops/studio/` and related ops paths.

| Department | Mission | Must never |
|------------|---------|------------|
| **Collector** | Gather source material, import assets, external research, metadata acquisition for Studio Alpha packages | Edit story packages, approve, publish |
| **Research** | Legacy intelligence pipeline — fact extraction, story proposals, `SongPackage` under `data/ops/intelligence/packages/` | Replace Studio Alpha packages without approved migration |
| **Editor** | Build song packages, timelines, cards, narratives; validate package completeness | Perform external research, publish |
| **Director** | Quality control, approval workflow, confidence scoring, package readiness, experience planning | Create content, publish |
| **Publisher** | Mobile, Browser+, live experience, printing, export to public surfaces | Edit packages |
| **Archive** | Long-term artifact storage, version history, research-department on-disk layout under `research-department/` | Mutate canonical graph or bypass department contracts |
| **Workers** | Local AI (Ollama), model management, prompt templates, worker assignment — infrastructure only | Own business logic or drain queues directly |
| **Scheduler** | Job queues, priorities, retries, progress, metrics — routes work between departments | Execute department business logic |

**Target interaction model:** Departments do not invoke each other long-term. Scheduler assigns jobs; workers run approved actions.

**UI departments today:** Collector, Editor, Director, Publisher (`/ops/studio/*`). Research Center remains at `/ops/intelligence`. Browser+ 2.0 is the Operations Center.

---

## Studio Kernel

Location: `lib/studio/`

### Exists

| Module | Purpose |
|--------|---------|
| `types.ts` | RVTR, job status, studio stage, story status, confidence label, need flags, log entry primitives |
| `status.ts` | **Canonical** stage derivation, confidence labels, editorial story status, render-ready checks, need flags, missing items, RVTR normalization, job status normalization |
| `department.ts` | Department registry, boundaries, UI metadata (`research`, `archive` kernel ids) |
| `package.ts` | **Canonical** paths, version constants, artifact kinds |
| `contract.ts` | **Canonical** department I/O contracts, handoff boundary types, `STUDIO_DEPARTMENT_CONTRACTS` |
| `queue.ts` | JSON queue store, in-process single-flight, file runner lock |
| `job.ts` | `StudioJob` envelope types |
| `worker.ts` | **Canonical** `StudioDepartmentWorker` interface — run, validate, status, capabilities, health |
| `engine.ts` | **Canonical** `StudioExecutionEngine` — registration, discovery, selection, sequential execution |
| `event.ts` | Job lifecycle event types |
| `asset.ts` | Asset reference types |
| `metrics.ts` | **Canonical** health aggregation — `buildStudioHealthCounts`, `completionPct`, snapshots |
| `logger.ts` | Process log helpers |
| `index.ts` | Public barrel export |

### Adopted by (thin shims)

**Package & status**

- `lib/ops/studio/*/paths.ts` — re-export kernel paths
- `lib/ops/studio/*/package-contract.ts` — re-export version constants + contract types
- `lib/ops/studio/department-contracts.ts` — re-export kernel contracts
- `lib/ops/studio/departments.ts` — re-exports `lib/studio/department`
- `lib/ops/browser-plus-2/studio-status-adapter.ts` — kernel status helpers for BP2
- `lib/ops/browser-plus-2/load-studio-package-hints.ts` — consumes status adapter (Studio Alpha hints)

**Metrics**

- `lib/ops/browser-plus-2/studio-metrics-adapter.ts` — kernel metrics for BP2 health
- `lib/ops/browser-plus-2/studio-health.ts` — thin wrapper over metrics adapter

**Queue & scheduler**

- `lib/ops/browser-plus-2/studio-queue.ts` — JSON queue store + drain loop
- `lib/ops/browser-plus-2/studio-scheduler-map.ts` — queue department → worker/action mapping
- `lib/ops/browser-plus-2/studio-scheduler-adapter.ts` — executes via `getStudioExecutionEngine()`

**Workers**

- `lib/ops/studio/workers/index.ts` — department worker registry (`getDepartmentWorker`)
- `lib/ops/studio/workers/execution-engine.ts` — bootstraps `StudioExecutionEngine` with primary workers
- `lib/ops/studio/workers/artifact-status.ts` — shared artifact presence checks
- `lib/ops/studio/{collector,editor,director,publisher,archive}/worker.ts` — department worker adapters
- `lib/ops/intelligence/research-worker.ts` — Research department worker

Intelligence pipeline readiness (`lib/ops/browser-plus-2/readiness.ts`) remains separate — it governs `SongPackage` / patron experience gates, not Studio Alpha stage logic.

### Execution flow (today)

```
Browser+ 2 queue drain
  → studio-scheduler-map (department → workerId + action)
  → studio-scheduler-adapter (collector payload via resolve-collector-row)
  → getStudioExecutionEngine().execute()
      → selectWorker (idle instance)
      → worker.validate()
      → worker.run()  ← wraps existing department runners
```

Sequential only — one worker executes at a time. Engine supports multiple registered instances; parallel dispatch is a future extension.

---

## Legacy Systems

Architectural constraints. **Do not merge without an approved migration plan.**

| System | Location | Role |
|--------|----------|------|
| **Intelligence pipeline** | `lib/ops/intelligence/*`, `SongPackage` JSON | Legacy research + publish path; Research Center UI |
| **Studio Alpha pipeline** | `data/ops/intelligence/research-department/RVTR*/` | Collector → Editor → Director artifacts (`collector.json`, `editor.json`, `director.json`) |
| **Browser+ 2.0** | `/ops/browser-plus-2` | Studio Operations Center — queue, health, batch launch, inspect RVTR |
| **Classic Browser+** | `/ops/browser-plus` | VDJ reconciliation, execution runner (legacy queue) |

Both pipelines can exist for the same RVTR. Browser+ 2 loads hints from **both**. Kernel `package.ts` tracks artifact kinds separately (`intelligence` vs `collector`/`editor`/`director`).

---

## Architecture Decisions

Stable decisions — do not undo accidentally.

1. **Kernel = infrastructure, not business logic.** Departments keep runners, stores, UI.
2. **Queue-driven architecture.** Scheduler assigns jobs; workers execute via engine — no direct runner imports in queue code.
3. **Thin adapters preferred.** Existing import paths (`./paths`, `./package-contract`, BP2 adapters) re-export from kernel — do not mass-rewrite call sites in infrastructure phases.
4. **Department ownership is strict.** See table above. I/O contracts live in `lib/studio/contract.ts`.
5. **Canonical IDs:** RVTR = track identity. Respect RVAR / RVAL / RVTR graph rules (see `.cursor/rules/retroverse-data.mdc`).
6. **Package versions live in `lib/studio/package.ts`.** Single source: Collector v4, Editor v2, Director plan/render spec v0.3.
7. **Status and readiness live in `lib/studio/status.ts`.** Stage, confidence, need flags, missing items, render-ready checks. BP2 types alias kernel types (`Bp2StudioStage` = `StudioStage`).
8. **Health metrics live in `lib/studio/metrics.ts`.** BP2 `Bp2StudioHealth` aliases `StudioHealthCounts`.
9. **Disk layout for Studio Alpha:** `{bundledIntelligenceRoot}/research-department/{RVTR}/` — use kernel path helpers only.
10. **Department workers live in `lib/ops/studio/*/worker.ts`.** Each wraps existing runners; exposes `run`, `validate`, `status`, `capabilities`.
11. **Scheduler executes through `StudioExecutionEngine`.** Register → discover → select → validate → run. Do not call department runners directly from queue drain code.
12. **AI Workers department** manages workers, not workflows. Ollama/MCP backends attach to worker interfaces later — not yet wired.

---

## Working Agreement

How AI agents should work on Retroverse Studio.

1. **Respect scope.** Read the phase prompt. Touch only files in scope.
2. **Never expand phases without approval.** No milestone beyond the approved roadmap unless explicitly told.
3. **Produce implementation reports** using the phase template (files created/modified, behavior changes, typecheck, technical debt, ready for next phase).
4. **Stop after every approved milestone.** Do not continue to the next phase in the same session unless told.
5. **Explain behavior changes before making them.** Default expectation: **none**.
6. **Preserve compatibility.** Same JSON paths, API shapes, and on-disk formats unless migration is explicitly approved.
7. **No opportunistic refactoring.** Fix only blockers directly in scope.
8. **Reference this file** at the start of Studio work instead of re-deriving philosophy.

---

## Current Roadmap

| Milestone | Phase | Name | Status |
|-----------|-------|------|--------|
| **S-001** | 0 | Studio Kernel Scaffold — types, department registry, stubs | Complete — baseline in `2feb162` |
| **S-002** | 1 | Queue Infrastructure — `lib/studio/queue.ts`, BP2 studio-queue adapter | Complete — in tree |
| **S-003** | 2 | Package Registry Consolidation — canonical paths and versions | Complete — `2feb162` |
| **S-004** | 3 | Status & Readiness Consolidation — `lib/studio/status.ts`, BP2 adapter | Complete — `30fa604` |
| **S-005** | 4 | Metrics Consolidation — kernel metrics, BP2 health adapters | Complete — in tree |
| **S-006** | 5 | Department Contracts — `lib/studio/contract.ts`, contract registry | Complete — in tree |
| **S-007** | 6 | Department Workers — `StudioDepartmentWorker` per department | Complete — in tree |
| **S-008** | 7 | Scheduler Integration — queue executes via worker registry | Complete — in tree |
| **S-009** | 8 | Multi-Worker Execution Engine — `lib/studio/engine.ts` | Complete — in tree |
| **S-010** | 9 | Studio Brain + Milestone Sync — this document | Complete — in tree |

**No further milestones are approved.** Do not begin S-011+ without explicit approval.

### Suggested next (not approved)

Candidates for the next milestone direction — pick one when ready to approve:

- **Parallel execution** — extend `StudioExecutionEngine` to dispatch multiple idle workers (engine already registers instances)
- **AI worker backends** — wire Ollama/MCP to `StudioAiWorker` without changing department logic
- **Publisher worker implementation** — move from validate-only stub to real publish surfaces
- **Commit batch** — land S-002 through S-010 as reviewed commits

---

## Quick Reference

```
lib/studio/              ← Kernel (infrastructure)
  contract.ts            ← Department I/O contracts
  engine.ts              ← Multi-worker execution engine
  worker.ts              ← Department worker interface
  metrics.ts             ← Health aggregation
lib/ops/studio/          ← Department implementations + workers/
lib/ops/browser-plus-2/  ← Operations Center + queue + scheduler adapters
lib/ops/intelligence/    ← Legacy Research pipeline + research-worker
docs/studio/STUDIO_BRAIN.md  ← This file
.cursor/rules/retroverse-workflow.mdc  ← Agent workflow + execution states
```

**Before coding:** `tsc --noEmit` after changes.

**When unsure:** Extract and shim. Do not rewrite.
