# Love Street AI Team — Assignment Roadmap

**Organizational guidance only.** This document does not define product direction.

---

## Purpose

This document answers:

> **Who should own this work?**

It does **not** answer:

> **What should we build next?**

Product milestones, phase approval, and priority live in `docs/studio/STUDIO_BRAIN.md` under user direction. Role definitions live in the individual files under `docs/agents/`. This file connects work types to leads and reviewers.

Use it when starting a task, assigning a Cursor Agent, or routing a PR for review.

---

## Team Overview

### Studio Architect

Reviews proposals against the approved Studio roadmap and existing architecture. Protects the Collector → Editor → Director → Publisher → Renderer pipeline, package contracts, and department boundaries. Does not implement features, design UI, set product priority, or choose milestones. See [studio-architect.md](./studio-architect.md).

### Studio Engineer

Implements approved kernel infrastructure (`lib/studio/`) and thin cross-department shims. Writes production code for execution engine, contracts, status, metrics, and queue primitives when in scope. Keeps changes simple and reversible. Does not own department business logic or Browser+ orchestration. See [studio-engineer.md](./studio-engineer.md).

### Collector Engineer

Owns research ingestion, entity resolution, metadata quality, and Collector packages (`collector.json`). Implements `lib/ops/studio/collector/*` and the Collector worker. Does not write stories, plan scenes, or publish. See [collector-engineer.md](./collector-engineer.md).

### Editor Director

Owns story quality, Narrative Blueprint, editorial review, patron value, fact promotion, and Editor packages (`editor.json`). Implements `lib/ops/studio/editor/*` and the Editor worker. Does not perform external research or experience planning. See [editor-director.md](./editor-director.md).

### Experience Director

Owns scene planning, templates, visual rhythm, experience sequencing, Director packages (`director.json`), and render spec. Implements `lib/ops/studio/director/*` and the Director worker. Does not rewrite editorial narrative or ingest research. See [experience-director.md](./experience-director.md).

### Operations Engineer

Owns Browser+ 2, Mission Control visibility, queue drain, scheduler mapping, worker bootstrap, health reporting, and overnight processing. Implements `lib/ops/browser-plus-2/*` and ops-layer worker/AI wiring. Orchestrates department work without doing department work. See [operations-engineer.md](./operations-engineer.md).

### QA Manager

Independently validates milestones, runs regression checks, verifies package integrity, and signs off operational readiness before release. Routes defects to owning engineers. Does not define roadmap or architecture. See [qa-manager.md](./qa-manager.md).

---

## Assignment Matrix

| Area | Lead | Supporting Roles | Do Not Involve |
|------|------|------------------|----------------|
| Studio architecture review | Studio Architect | Studio Engineer | Department specialists (unless boundary question) |
| Studio kernel (`lib/studio/`) | Studio Engineer | Studio Architect, QA Manager | Collector, Editor, Experience (unless contract touches their package) |
| Department contracts (`contract.ts`, `package.ts`) | Studio Engineer | Studio Architect, QA Manager | Operations Engineer |
| Collector department | Collector Engineer | QA Manager | Editor Director, Experience Director |
| Editor department | Editor Director | QA Manager | Collector Engineer, Experience Director |
| Director department | Experience Director | Studio Engineer, QA Manager | Editor Director, Collector Engineer |
| Publisher department | Studio Engineer | Editor Director, Experience Director, QA Manager | Collector Engineer |
| Renderer / presentation layer | Studio Engineer | Experience Director, QA Manager | Collector Engineer |
| Browser+ 2 / Mission Control UI | Operations Engineer | Studio Architect, QA Manager | Editor Director, Collector Engineer |
| Queue (`studio-queue`, drain loop) | Operations Engineer | Studio Engineer, QA Manager | Department specialists |
| Scheduler (map, adapter, payloads) | Operations Engineer | Studio Engineer, Studio Architect, QA Manager | Editor Director, Collector Engineer |
| Execution engine dispatch | Studio Engineer | Operations Engineer, Studio Architect, QA Manager | Department specialists |
| Department workers (registry, profiles) | Operations Engineer | Studio Engineer, QA Manager | — |
| AI worker backends (Ollama, MCP, cloud) | Operations Engineer | Studio Engineer, Studio Architect | Editor Director, Collector Engineer |
| Health & metrics (BP2 adapters) | Operations Engineer | Studio Engineer, QA Manager | Department specialists |
| Status & readiness (kernel) | Studio Engineer | Studio Architect, QA Manager | Operations Engineer (unless BP2 display only) |
| Intelligence / Research pipeline (legacy) | Collector Engineer | Studio Architect, QA Manager | Experience Director (unless migration approved) |
| Archive department | Studio Engineer | Studio Architect, QA Manager | Editor Director |
| Package integrity validation | QA Manager | Lead for affected department | — |
| Milestone sign-off | QA Manager | Studio Architect (infra milestones), lead implementer | — |
| Product roadmap & phase approval | **User** | Studio Architect (advisory) | All agents as decision-makers |
| Retroverse public UI (non-ops) | Studio Engineer | QA Manager | Operations Engineer |
| Retroverse ops UI (`/ops/studio/*`) | Lead = owning department engineer | Operations Engineer (if shared shell), QA Manager | Wrong department engineer |

**Supporting** means review, validate, or implement shared infrastructure — not co-own the feature.

---

## Milestone Assignment Reference

For approved Studio milestones in `STUDIO_BRAIN.md`, typical leads:

| Milestone | Name | Lead | Supporting |
|-----------|------|------|------------|
| S-001 | Kernel scaffold | Studio Engineer | Studio Architect, QA Manager |
| S-002 | Queue infrastructure | Operations Engineer | Studio Engineer, QA Manager |
| S-003 | Package registry | Studio Engineer | Studio Architect, QA Manager |
| S-004 | Status & readiness | Studio Engineer | Operations Engineer, QA Manager |
| S-005 | Metrics consolidation | Studio Engineer | Operations Engineer, QA Manager |
| S-006 | Department contracts | Studio Engineer | Studio Architect, QA Manager |
| S-007 | Department workers | Studio Engineer | Operations Engineer, department engineers, QA Manager |
| S-008 | Scheduler integration | Operations Engineer | Studio Engineer, Studio Architect, QA Manager |
| S-009 | Execution engine | Studio Engineer | Operations Engineer, Studio Architect, QA Manager |
| S-010 | Studio Brain sync | Studio Architect | Studio Engineer, QA Manager |

Future milestones follow the same rule: **lead = department or layer owner**; kernel/ops splits follow the matrix above.

---

## Typical Workflow

```
Product idea (User)
        ↓
Approved milestone scope (User + STUDIO_BRAIN.md)
        ↓
Architecture review (Studio Architect) — when cross-cutting or contract-changing
        ↓
Implementation (Lead role from Assignment Matrix)
        ↓
Department specialist review — when work touches another department's boundary
        ↓
QA validation (QA Manager)
        ↓
Git commit (User or implementing agent, when requested)
```

**Small, in-scope fixes** inside one department may skip Architect review if they do not change contracts, boundaries, or pipeline flow. QA may be abbreviated for trivial fixes at user discretion.

**Infrastructure milestones** always include Studio Architect review and QA Manager validation before sign-off.

---

## Escalation Rules

Route to the reviewing role when any of the following apply:

| Trigger | Review with | Lead still implements unless reassigned |
|---------|-------------|----------------------------------------|
| Architecture changes (engine, worker interface, department registry) | Studio Architect | Studio Engineer or Operations Engineer |
| Package contract changes (versions, handoff types, artifact kinds) | Studio Architect | Studio Engineer |
| New departments or kernel department IDs | Studio Architect | Studio Engineer |
| Cross-department responsibilities (e.g. research logic in Browser+) | Studio Architect | Wrong owner stops; lead reassigned |
| Breaking changes (disk format, API shape, import path removal) | Studio Architect + QA Manager | Studio Engineer |
| Queue bypassing execution engine | Studio Architect | Operations Engineer |
| Performance regressions (drain latency, batch throughput) | QA Manager | Operations Engineer or Studio Engineer |
| Major UI redesign (ops or public) | Studio Architect | Operations Engineer or Studio Engineer |
| Editorial quality disputes | Editor Director | Studio Architect if scope creep into Director |
| Render-ready / scene plan disputes | Experience Director | Studio Architect if scope creep into Editor |
| Metadata / entity resolution disputes | Collector Engineer | Studio Architect if graph integrity at risk |
| Release or overnight batch failure | QA Manager | Operations Engineer |
| Legacy Intelligence vs Studio Alpha boundary | Studio Architect | Collector Engineer |

**Escalation to User:** scope disputes, approved exceptions to department boundaries, milestone approval, and release hold overrides.

---

## Roles That Should Not Be Involved

| Situation | Exclude |
|-----------|---------|
| Collector ingestion task | Editor Director, Experience Director |
| Editorial narrative task | Collector Engineer, Experience Director |
| Scene template / render spec task | Collector Engineer, Editor Director |
| Queue drain bug | Editor Director, Collector Engineer |
| Kernel type addition | Collector Engineer (unless Collector package field) |
| Browser+ health display tweak | Editor Director, Collector Engineer |
| Architecture-only review | QA Manager as implementer; department engineers as implementers |
| QA validation pass | Implementing agent as sole validator (note self-review in report) |

---

## Long-Term Vision

These seven roles are the permanent AI team for Love Street — independent of Cursor, Claude, local Ollama, or future platforms.

The team structure mirrors the production pipeline and operations layer:

- **Departments** own creative and data transformations (Collector, Editor, Experience Director)
- **Kernel** owns shared infrastructure (Studio Engineer + Architect)
- **Operations** owns how work runs (Operations Engineer)
- **Quality** owns independent verification (QA Manager)

When new tools or agents are added, they should map to an existing role rather than inventing parallel ownership. New roles require user approval and updates to `docs/agents/README.md` and this file.

---

## Success Criteria

After reading this document, you should be able to:

1. **Pick a lead** — one primary role from the Assignment Matrix
2. **Pick reviewers** — supporting roles for boundary, contract, or regression risk
3. **Exclude irrelevant roles** — avoid routing Collector work to Editor Director, etc.

If ownership is unclear, default to **Studio Architect for a boundary review** before coding — not to a department engineer expanding scope.

---

## Related Documentation

| Document | Answers |
|----------|---------|
| [README.md](./README.md) | Team purpose, org chart, quick routing |
| [studio-architect.md](./studio-architect.md) | Architect responsibilities |
| `docs/studio/STUDIO_BRAIN.md` | **What** to build (product roadmap) |
| `.cursor/rules/retroverse-workflow.mdc` | Phase discipline, execution states |

**Maintenance:** Update this file when roles are added, merged, or when department boundaries change in Studio Brain. Do not add product milestones here.
