# Love Street AI Team

Canonical definitions for AI agents working on the Love Street / Retroverse Studio ecosystem.

These documents describe **roles**, **boundaries**, and **handoffs** — not product roadmap. Product direction comes from the user. Agents evaluate and implement against the approved roadmap in `docs/studio/STUDIO_BRAIN.md`.

---

## Purpose

Love Street turns canonical song identity (RVTR) into curated patron experiences through a fixed production pipeline:

```
Collector → Editor → Director → Publisher → Renderer
```

The AI team mirrors that pipeline. Each role owns a slice of responsibility so work stays:

- **Separated** — departments do not absorb each other's jobs
- **Traceable** — inputs and outputs are package-shaped artifacts
- **Reviewable** — architecture and quality have explicit owners

This folder is the source of truth for **who does what**. When Cursor Agents are configured later, each agent definition should be copied or adapted from the corresponding file here — not invented ad hoc in chat.

---

## Organization

```
                    ┌─────────────────────┐
                    │   Product (User)    │
                    │  roadmap & priority │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Studio Architect   │
                    │  review & boundaries│
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
┌────────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
│ Studio Engineer │   │  QA Manager     │   │ Operations Eng. │
│ kernel + glue   │   │ validate & ship │   │ Browser+ / ops  │
└────────┬────────┘   └─────────────────┘   └────────┬────────┘
         │                                             │
    ┌────┴────┬────────────┬────────────┐             │
    │         │            │            │             │
┌───▼───┐ ┌───▼───┐ ┌──────▼──────┐ ┌───▼───┐        │
│Collect│ │Editor │ │ Experience  │ │Publish│◄───────┘
│Engineer│ │Director│ │  Director   │ │(future)│
└───────┘ └───────┘ └─────────────┘ └───────┘
```

**Orchestration layer:** Operations Engineer owns Browser+ 2, queue, scheduler, workers, and health — the layer that *launches* department work without *doing* department work.

**Quality gate:** QA Manager validates milestones independently of the engineer who built them.

---

## Roles

| Role | File | Owns |
|------|------|------|
| Studio Architect | [studio-architect.md](./studio-architect.md) | Pipeline integrity, package contracts, responsibility boundaries |
| Studio Engineer | [studio-engineer.md](./studio-engineer.md) | Kernel infrastructure, cross-department glue, approved implementations |
| Collector Engineer | [collector-engineer.md](./collector-engineer.md) | Research ingestion, entity resolution, `collector.json` |
| Editor Director | [editor-director.md](./editor-director.md) | Story quality, narrative blueprint, `editor.json` |
| Experience Director | [experience-director.md](./experience-director.md) | Scene planning, templates, `director.json`, render spec |
| Operations Engineer | [operations-engineer.md](./operations-engineer.md) | Browser+, queue, scheduler, workers, health, overnight runs |
| QA Manager | [qa-manager.md](./qa-manager.md) | Milestone validation, regression, package integrity, release readiness |

---

## Which role for which work?

| You want to… | Start with |
|--------------|------------|
| Review a proposal before coding | Studio Architect |
| Add kernel types, contracts, or engine behavior | Studio Engineer (+ Architect review) |
| Improve research ingestion or metadata quality | Collector Engineer |
| Fix narrative structure, patron value, editorial review | Editor Director |
| Change scene templates, experience sequencing, render spec | Experience Director |
| Fix queue drain, scheduler mapping, BP2 health UI | Operations Engineer |
| Verify a milestone before merge or release | QA Manager |
| Define what to build next | **User** — not any agent |

When work spans roles, the **implementing** agent does the code; the **owning** agent's boundaries still apply. Example: a queue change is Operations Engineer; the Architect confirms it does not bypass the execution engine.

---

## Relationship to Cursor Agents

These files are **standalone documentation** today. They are designed so that:

1. Each file can be pasted into a Cursor Agent's system prompt or rules block with minimal editing
2. Cross-references point to other files in this folder and to `docs/studio/STUDIO_BRAIN.md`
3. Workspace rules in `.cursor/rules/` remain global constraints; agent files define **role-specific** scope

Do not configure Cursor Agents from this sprint. When agents are created:

- One agent per role (or a deliberate merge documented in commit notes)
- Agent reads its role file + `STUDIO_BRAIN.md` + relevant `.cursor/rules/`
- Architect agent reviews; it does not implement features or set roadmap

---

## Related documentation

| Document | Purpose |
|----------|---------|
| [roadmap.md](./roadmap.md) | **Who** leads each work area — assignment guide (not product roadmap) |
| `docs/studio/STUDIO_BRAIN.md` | Approved milestones, kernel map, department table |
| `.cursor/rules/retroverse-workflow.mdc` | Studio phase discipline, execution states |
| `.cursor/rules/retroverse-data.mdc` | Canonical graph, RVTR/RVAR/RVAL, search philosophy |
| `.cursor/rules/retroverse-design.mdc` | Retroverse UI design language |

---

## Maintenance

Update role files when department boundaries or package contracts change. Update this README when roles are added or merged. Product roadmap changes live in `STUDIO_BRAIN.md` under user direction — not in this folder.
