# Retroverse Product Map

**Purpose:** Define the purpose, identity, and relationships of each major Retroverse application.  
**Scope:** Architectural documentation only — not a build spec.  
**Updated:** 2026-06-26 (D-002)

**Related docs:**

- [RETROVERSE_PRODUCT_IDENTITY.md](./RETROVERSE_PRODUCT_IDENTITY.md) — product shell, navigation, themes, icons (D-003)
- [RETROVERSE_PROJECT_CONTEXT.md](./RETROVERSE_PROJECT_CONTEXT.md) — repo split, data layers, onboarding
- [docs/studio/STUDIO_BRAIN.md](./studio/STUDIO_BRAIN.md) — Studio kernel, departments, milestones
- [docs/knowledge/README.md](./knowledge/README.md) — Knowledge Department bootstrap
- [RETROVERSE_OPERATING_BOARD.md](./RETROVERSE_OPERATING_BOARD.md) — live priorities and production truth

---

## Overview

Retroverse is not one application. It is a **canonical music graph** with several products built on top of it. Each product has a distinct mission, visual identity, and operator audience.

| Principle | Rule |
|-----------|------|
| **Canonical truth** | RVTR / RVAL / RVAR identity lives in the graph — not in filenames, VDJ rows, or UI state |
| **Operational truth** | VirtualDJ library, tags, and local media paths are what gets played |
| **Production truth** | Studio turns canonical identity into patron-ready experiences |
| **Institutional truth** | Knowledge remembers decisions, timeline, and why things are the way they are |

Products share data. They do not share UI language.

---

## Product 1 — Retroverse Browser

| Field | Value |
|-------|-------|
| **Theme** | VirtualDJ — Red / Black |
| **Mission** | Manage the music library |
| **Operator** | DJ / library curator |
| **Mental model** | *The music library workbench* |

### Responsibilities

- VirtualDJ mirror and reconciliation
- Library browsing and inspection
- RVTR matching and identity assignment
- Metadata editing and recovery
- XML writing (VDJ database)
- Tag management (Retroverse Tags, User2, grouping)
- Search across the local library corpus
- Set preparation and track inspection
- Play history and file-path awareness

### Primary surfaces (today)

| Surface | Route | Role |
|---------|-------|------|
| Classic Browser+ | `/ops/browser-plus` | VDJ reconciliation, execution runner, library ops |
| Browser+ 2.0 | `/ops/browser-plus-2` | Studio-aware library browser, queue launch, RVTR inspection |
| Matching / identity workflows | ops tooling | RVTR assignment, metadata recovery |

Browser+ 2.0 spans Browser and Studio operationally — it is the **handoff surface** where library work meets production queues. Its mission-control panels belong to Studio; its library table and VDJ metadata belong to Browser.

### Source of truth

VirtualDJ database, local media files, MP4/ID3 tags, and VDJ XML exports. The website reflects and writes back — it does not replace the DJ library.

### Must never

- Become the canonical graph editor of record (that lives in Postgres / integrity tooling)
- Own patron experience production (that is Studio)
- Treat fuzzy search results as canonical entities

---

## Product 2 — Retroverse Studio

| Field | Value |
|-------|-------|
| **Theme** | Studio — Blue / Gold (mission control dark) |
| **Mission** | Produce patron experiences |
| **Operator** | Producer / studio operator |
| **Mental model** | *The production studio* |

### Responsibilities

| Area | What it does |
|------|--------------|
| **Collector** | Gather source material, assets, external research, Studio Alpha packages |
| **Research** | Legacy intelligence pipeline — fact extraction, story proposals, `SongPackage` |
| **Editor** | Build song packages, timelines, cards, narratives |
| **Director** | Quality control, confidence, experience planning, render readiness |
| **Publisher** | Export to public surfaces — mobile, Browser+, live, print |
| **Knowledge** | *(cross-product — see Product 3)* Institutional memory consumed by Studio ops |
| **Scheduler** | Job queues, priorities, retries, progress — routes work between departments |
| **Workers** | Department execution, capability profiles, busy/idle tracking |
| **AI** | Ollama / MCP backends attached to workers — not a separate product |
| **Mission Control** | Operations dashboard — health, queue, departments, planned execution |

### Primary surfaces (today)

| Surface | Route | Role |
|---------|-------|------|
| Studio Command Center | `/ops/studio` | Department hub, collector live card |
| Collector | `/ops/studio/collector` | Research office, asset gathering |
| Editor | `/ops/studio/editor` | Editorial office, package building |
| Director | `/ops/studio/director` | QC, experience plan |
| Publisher | `/ops/studio/publisher` | Publish surfaces (stub) |
| Research Center | `/ops/intelligence` | Legacy `SongPackage` pipeline |
| Browser+ 2.0 | `/ops/browser-plus-2` | **Mission Control** — queue, workers, readiness |

### Source of truth

Studio Kernel (`lib/studio/`) for infrastructure. Department artifacts on disk (`research-department/{RVTR}/`). Legacy intelligence packages under `data/ops/intelligence/packages/`. Both pipelines can exist for the same RVTR.

### Design system

Canonical tokens: `app/ops/studio/studio-design-tokens.css` (D-001). All Studio surfaces migrate to `--rs-studio-*` incrementally.

### Must never

- Collapse into a generic SaaS admin dashboard
- Let departments call each other directly (scheduler assigns; workers execute)
- Discard canonical RVTR identity once resolved

---

## Product 3 — Knowledge

| Field | Value |
|-------|-------|
| **Theme** | *To be determined* |
| **Mission** | Remember everything |
| **Operator** | Builder / archivist / future-you |
| **Mental model** | *The institutional memory* |

### Responsibilities

- Documentation and decision records
- Project timeline and milestone history
- Knowledge graph (projects, systems, concepts, cross-links)
- Search across repo and ops history
- Agent-readable indexes (`markdown-index.json`, `knowledge-graph.json`)
- Executive summaries and inventory for onboarding

### Primary surfaces (today)

| Surface | Location | Role |
|---------|----------|------|
| Knowledge bootstrap | `tools/knowledge-department/` | Discover, index, enrich repo markdown |
| Knowledge outputs | `docs/knowledge/` | Timeline, graph, inventory, executive summary |
| Studio Brain | `docs/studio/STUDIO_BRAIN.md` | Studio-specific institutional memory |
| Cursor rules | `.cursor/rules/` | Agent discipline and design/data philosophy |
| This document | `docs/RETROVERSE_PRODUCT_MAP.md` | Product architecture map |

### Source of truth

Markdown in the repo, checkpoint files, and generated indexes — not runtime application state.

### Must never

- Become the live operational dashboard (that is Studio Mission Control)
- Override canonical graph data or VDJ library truth
- Block production work waiting on perfect documentation

---

## Future Products (placeholders)

No implementation approved. Names and boundaries may change.

| Product | Working mission | Notes |
|---------|-----------------|-------|
| **Finance** | Track money in and out of Retroverse operations | `/ops/finance` exists today — ops-only |
| **Reimbursement** | Patron / operator expense flows | Sub-domain of Finance |
| **Workshop** | 3D printing, physical artifact production | `/ops/atlas/workshop` — exploratory |
| **Live** | Patron-facing live experience, show control | `/ops/live`, `/retroverse-2/live` — partial |
| **Analytics** | Chart significance, patron value, play patterns | Feeds Studio ranking; not a standalone UI yet |
| **Public Archive** | Internet-facing discovery at retroverse.live | Separate visual language (cream/paper, collectible) — not Studio |

---

## Product Relationships

### Data flow (canonical)

```
VirtualDJ Library          Canonical Graph (Postgres)
      │                              │
      ▼                              ▼
 Retroverse Browser  ──RVTR──▶  Retroverse Studio
 (match, tag, edit)            (produce experiences)
                                      │
                                      ▼
                               Public / Live surfaces
```

### Operator flow (daily work)

```
1. Browser     — fix identity, tags, covers, metadata
2. Studio      — run departments, queue jobs, approve packages
3. Publisher   — ship to patron surfaces (future-complete)
4. Live        — perform / broadcast the experience
```

### Knowledge ↔ All

Knowledge does not sit in the production pipeline. It **documents and connects** every product:

| Product | What Knowledge remembers |
|---------|--------------------------|
| Browser | Matching decisions, tag conventions, VDJ workflow changes |
| Studio | Milestones (S-00x, D-00x), department contracts, brain sync |
| Public | Navigation audits, archive philosophy, reliability governance |
| Future | Finance rules, workshop procedures, live runbooks |

```
        ┌─────────────┐
        │  Knowledge  │
        └──────┬──────┘
               │ documents
     ┌─────────┼─────────┐
     ▼         ▼         ▼
 Browser    Studio    Public/Live
     │         │
     └────RVTR─┘
```

### Handoff points

| From | To | Handoff |
|------|-----|---------|
| Browser | Studio | RVTR assigned, tags set, file exists — enqueue department job |
| Studio (Collector) | Studio (Editor) | `collector.json` artifact complete |
| Studio (Editor) | Studio (Director) | `editor.json` artifact complete |
| Studio (Director) | Publisher / Live | Experience plan + render spec ready |
| Studio | Public Archive | Published patron experience (not ops UI) |
| All products | Knowledge | Decisions, milestones, and runbooks captured in `docs/` |

### What is NOT a product boundary

| Item | Lives in |
|------|----------|
| Canonical IDs (RVTR, RVAL, RVAR) | Graph layer — shared by all products |
| Retroverse Tags | RVTR track identity — Browser writes hints; Studio owns canonical tags |
| Browser+ 2.0 | **Split product** — Browser library + Studio Mission Control in one shell |
| Ops gate (`RETROVERSE_OPS=1`) | Infrastructure — not a product |

---

## Visual Identity Summary

| Product | Background | Accent | Feel |
|---------|------------|--------|------|
| **Browser** | Red / Black (VDJ) | Warm, tactile, deck-like | Workbench |
| **Studio** | Dark navy mission control | Blue info, gold working, green healthy | Broadcast ops center |
| **Knowledge** | TBD | TBD | Archive / ledger |
| **Public Archive** | Cream / paper / teal | Editorial, collectible | Museum exhibit *(not Studio)* |

Studio and Browser share ops infrastructure (`/ops/*`) but **must not share visual language**. D-001 established Studio tokens; Browser retains its VDJ identity.

---

## Agent Discipline

When working on Retroverse:

1. **Identify the product** before changing UI or behavior.
2. **Read the product's brain doc** — Studio → `STUDIO_BRAIN.md`; Knowledge → `docs/knowledge/`.
3. **Do not merge products** — Browser workflows stay in Browser; production stays in Studio.
4. **Document cross-product decisions** in Knowledge — not inline in code comments alone.
5. **Respect milestone gates** — see `STUDIO_BRAIN.md` Current Roadmap; no unapproved S-017+ work.

---

## Document History

| Milestone | Change |
|-----------|--------|
| D-002 | Initial product map — Browser, Studio, Knowledge, future placeholders, relationships |
