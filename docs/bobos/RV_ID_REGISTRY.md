# BobOS RV ID Registry

Stable operator/admin identifiers for BobOS subsystems. Display names may change; **RV IDs must not**.

> **Separate namespace:** Canonical music graph IDs (RVAR, RVAL, RVTR) are not BobOS subsystem IDs.

## ID format

- **Internal registry keys (code):** `RV02-03` — used in `lib/bobos/rv-ids.ts` and Cursor reports
- **Operator-facing display (UI + this doc):** `RV 02-03` — spaced after `RV` via `formatRvId()`

## Top-level domains

| Domain | Scope |
|--------|--------|
| **RV 00** | Platform — Retroverse entrypoint, startup, diagnostics |
| **RV 01** | Cockpit — dashboard, runtime, broadcast, ops control |
| **RV 02** | Events — planning, passes, giveaway, homepage |
| **RV 03** | Music — VDJ, library, years, song package pipeline |
| **RV 04** | AI — packages, usage, queues |
| **RV 05** | Live — public `retroverse.live` surfaces (IDs documented; not shown on public UI) |
| **RV 06** | Media — video, covers, collections |
| **RV 07** | Finance |
| **RV 08** | Marketplace — reserved (cockpit workspaces; routes TBD) |
| **RV 09** | All-Star Baseball |
| **RV 10** | Shared Services — runtime, bridge, ops gate |

## RV00 — Platform

| ID | Display name | Route / surface |
|----|--------------|-----------------|
| RV 00-00 | Retroverse | Cold-start: `tools/mac/RETROVERSE.command` + `tools/retroverse/launch.ts`. Browser documentation library: `/bobos/docs` (indexed panel manuals) |

Reserved for later (not yet implemented — see `docs/studio/` planning notes): RV 00-01 Configuration, RV 00-02 Updates, RV 00-03 Diagnostics, RV 00-04 Backup & Restore, RV 00-05 Logs.

## RV01 — Cockpit

| ID | Display name | Route / surface |
|----|--------------|-----------------|
| RV 01-01 | BobOS Cockpit | `/bobos` |
| RV 01-02 | Runtime | Cockpit panel `retroverse-runtime` — monitors/restarts services once BobOS is already running |
| RV 01-03 | Broadcast Control | Cockpit panel `broadcast` |
| RV 01-21 | Song Requests | `/bobos/song-requests` — local live-request operator screen |
| RV 01-04 | VirtualDJ Bridge | `/bobos/bridge` |
| RV 01-05 | Operations Directory | `/ops` |
| RV 01-06 | Operations Hub | `/ops/hub` *(directory; route TBD)* |
| RV 01-07 | Retroverse Map | `/ops/map` |
| RV 01-08 | Sunday Nights Prep | `/ops/sunday-nights` |
| RV 01-09 | Event Command Center | `/ops/live` |
| RV 01-10 | Live Control Center | `/ops/live-control` |
| RV 01-11 | Live Companion | `/ops/live-companion` |
| RV 01-12 | Event Control | `/ops/event-control` |
| RV 01-13 | Presentation Control | `/bobos/presentation` |
| RV 01-14 | Recovery Operations | `/ops/recovery` *(directory; route TBD)* |
| RV 01-15 | Library Atlas | `/ops/infrastructure` *(directory; route TBD)* |
| RV 01-16 | Continuity Audit | `/ops/continuity` |
| RV 01-17 | Graph Integrity | `/ops/integrity` |
| RV 01-18 | Atlas World | `/ops/atlas` |
| RV 01-19 | Automation Factory | `/ops/automation-factory` |

## RV02 — Events

**RV02 Pass System: NOT VERIFIED** — Owner: BobOS · Repo: RETROVERSE_PUBLIC.  
Contains: Event Hub, Event Producer, Design Builder, Pass Management.  
Blocked on Design Builder (RV02-03) full generate + print package. Event Studio integration is out of scope.  
See `docs/bobos/RV02_PASS_SYSTEM.md`.

| ID | Display name | Route | Panel verification |
|----|--------------|-------|--------------------|
| RV 02-01 | Event Hub | `/bobos/event` | VERIFIED (launcher) |
| RV 02-02 | Event Producer | `/bobos/producer` | VERIFIED |
| RV 02-03 | Design Builder | `/bobos/passes` | **NOT VERIFIED** |
| RV 02-04 | Pass Registration | `/bobos/pass-registration` → Pass Management | **Retired** (public claim = RV05-05) |
| RV 02-05 | Pass Management | `/bobos/pass-management` | VERIFIED |
| RV 02-06 | Legacy Event Tools | `/ops/event-studio` | Deprecated (out of Pass System closure) |
| RV 02-16 | Content Creator (Passes) | `/ops/content-creator` | Not in Pass System closure |
| RV 02-17 | Show Builder | `/ops/show-builder` | Not in Pass System closure |

## RV03 — Music

| ID | Display name | Route |
|----|--------------|-------|
| RV 03-01 | VirtualDJ Browser+ | `/ops/browser-plus` |
| RV 03-02 | Browser+ 2.0 | `/ops/browser-plus-2` |
| RV 03-03 | Production Library | `/ops/library` |
| RV 03-04 | Year Workspace | `/ops/year/[year]` |
| RV 03-12 | Artist Pipeline | `/bobos/pipeline` |
| RV 03-13 | Song Package Pipeline | `/ops/studio` |

## RV04 — AI

| ID | Display name | Route |
|----|--------------|-------|
| RV 04-01 | Song Packages Workbench | `/ops/intelligence` |
| RV 04-06 | AI Usage | `/bobos/ai` |

## RV05 — Live (public; IDs for reports only)

| ID | Display name | Route |
|----|--------------|-------|
| RV 05-01 | Retroverse Live Site | `apps/live` |
| RV 05-02 | Retroverse Live Player | `/retroverse-live` |
| RV 05-03 | Sunday Nights Public | `/sunday-nights` |
| RV 05-04 | Now Playing Song | `/song/[rvtr]` |
| RV 05-05 | Pass Claim | `/pass/[serial]` |
| RV 05-06 | Public Homepage | `/` |

## RV06 — Media

| ID | Display name | Route |
|----|--------------|-------|
| RV 06-01 | Media Lab | `/ops/media-lab` |
| RV 06-02 | Graph Bridge | `/ops/graph-bridge` |
| RV 06-03 | Cover Review | `/ops/review/covers` |

## RV07 — Finance

| ID | Display name | Route |
|----|--------------|-------|
| RV 07-01 | Finance Home | `/ops/finance` |

## RV08 — Marketplace

Reserved. Cockpit workspace tabs only until routes exist.

## RV09 — All-Star Baseball

| ID | Display name | Route |
|----|--------------|-------|
| RV 09-01 | Living Archive Dashboard | `/ops/allstar` |

## RV10 — Shared Services

| ID | Display name | Surface |
|----|--------------|---------|
| RV 10-01 | Ops Gate / Site Mode | `lib/ops/ops-gate`, `lib/runtime/site-mode` |
| RV 10-02 | BobOS Runtime | Dev-server orchestration |
| RV 10-11 | Pipeline Kernel | `lib/studio/` |

## Toggle

- **Storage key:** `bobos.showRvIds`
- **Default:** OFF
- **Scope:** BobOS/admin surfaces only — never on public Live pages

## Cursor reports

All BobOS change reports must list **Affected RV IDs** (internal keys, e.g. `RV02-03`). Use spaced form (`RV 02-03`) in operator-facing copy.
