# Studio Navigation Audit — Sprint 3.20

**Date:** 2026-06-27  
**Scope:** Retroverse Studio, Mission Control, Command Center entry points, Browser+ 2.0 Studio Ops  
**Goal:** One coherent system before large-scale package generation. No route deletes; naming and link clarity only.

---

## Executive Summary

Studio today runs on **two parallel navigation systems** and **two pages both called Mission Control**. That is the primary source of confusion.

| System | Chrome | Used by |
|--------|--------|---------|
| **StudioShell** | Left rail: Studio → Training → departments → Command Center | `/ops/studio/*` |
| **RetroverseShell + StudioProductChrome** | Universe strip + product nav | `/ops/browser-plus-2` only |

**Mission Control is split:**

| URL | UI title | Actual role |
|-----|----------|-------------|
| `/ops/studio` | Mission Control (LivingStudioHome) | Live department status, pipeline, activity (Sprint 3.18) |
| `/ops/browser-plus-2` | Studio · Mission Control / Operations Center | Library browser, batch queue, health, daily report |

Operators cannot tell which is “home.” Training, missing-package CTAs, and `StudioProductChrome` still point at Browser+ 2 as Mission Control.

**Recommendation:** `/ops/studio` = **Mission Control** (operational home). `/ops/browser-plus-2` = **Library & Queue** (batch + library ops). Preserve URLs; fix labels and nav targets.

---

## 1. Current Navigation Map

### Command Center (`/ops`)

```
/ops  (Retroverse Command Center — hub, no product chrome)
├── Studio
│   └── Studio Dashboard → /ops/studio          ← actually Mission Control
├── Manage My Library
│   └── Browser+ 2.0 — Studio Ops → /ops/browser-plus-2   ← also labeled Mission Control internally
│   └── VirtualDJ Browser+ → /ops/browser-plus
│   └── Automation Factory, Atlas, Media Sync, …
├── Research → /ops/intelligence
└── (All-Star, Run A Show, Finance, …)
```

### Studio product (`resolveProductFromPath` → `"studio"`)

```
/ops/studio                          Mission Control (live dashboard)     PRODUCTION
├── collector                        Research Library                       PRODUCTION
│   └── [rvtr]                       Song research workspace              PRODUCTION
├── editor                           Story Desk                             PRODUCTION
│   └── [rvtr]                       Editor workspace                       PRODUCTION
├── director                         Director production room               PRODUCTION
├── publisher                        Publisher board                        PRODUCTION
│   ├── [rvtr]                       Review / decision workspace            PRODUCTION
│   ├── lab                          Quality Lab (patterns, drift)          PROTOTYPE-ADJACENT
│   └── museum                       Museum Wall (published gallery)        PRODUCTION
├── training                         Training Mode health                   PROTOTYPE (in StudioShell nav)
├── training/[rvtr]/[department]     Per-department training walkthrough    PROTOTYPE
├── experience-lab/[rvtr]            Experience Lab (no StudioShell)        PROTOTYPE / ORPHAN CHROME
├── visual-analysis                  Placeholder department page            LEGACY STUB
├── audio-analysis                   Placeholder department page            LEGACY STUB
└── quality-control                  Placeholder department page            LEGACY STUB
```

**Chrome:** `StudioShell` only — no Universe strip, no `StudioProductChrome`.

### Browser product (`resolveProductFromPath` → `"browser"`)

```
/ops/browser-plus-2                  Operations Center (mislabeled Mission Control)   PRODUCTION (batch)
/ops/browser-plus                    Classic VirtualDJ Browser+                       LEGACY (linked from BP2)
```

**Chrome:** `RetroverseShell` + `StudioProductChrome` + Universe strip.

### Intelligence (Studio-adjacent, separate product path)

```
/ops/intelligence                    Research Center (legacy SongPackage pipeline)
/ops/intelligence/package/[rvtr]   Legacy package viewer (BP2 links here for research)
```

### Patron surfaces (downstream of Publisher)

```
/experience/[rvtr]                   Published patron experience
/retroverse-2/song/[rvtr]          BP2 “Open Song” target
```

---

## 2. Duplicate Links & Destinations

| Issue | Locations | Details |
|-------|-----------|---------|
| **Two “Mission Control” homes** | `/ops/studio`, `/ops/browser-plus-2` | Same name, different purposes |
| **Dashboard = Mission Control URL** | `StudioProductChrome`: Dashboard → `/ops/studio` | Redundant with intended MC home |
| **Studio product home vs chrome** | `product-registry`: Studio `homeHref` = `/ops/studio`; Browser `homeHref` = `/ops/browser-plus-2` | Product switcher “Browser” lands on Studio Ops page |
| **Command Center double entry** | `/ops` lists Studio Dashboard + Browser+ 2.0 Studio Ops | Both are Studio workflow entry points |
| **Back links say “Studio”** | Collector/Editor library homes, department detail | All → `/ops/studio` (OK if MC) but label inconsistent |
| **Training → wrong MC** | `training/page.tsx`: “← Mission Control” → `/ops/browser-plus-2` | Should → `/ops/studio` |
| **Missing package CTAs** | `CollectorPackageMissing`, `EditorStoryMissing` | “Open Mission Control” → `/ops/browser-plus-2` |
| **Operator guide** | `page-guides.ts` | MC guide describes batch queue on BP2; dashboard guide describes department cards on `/ops/studio` |
| **Pipeline health twice** | `/ops/studio` PipelineDiagnosticsPanel + BP2 StudioHealthDashboard | Overlapping metrics, different loaders (3.18 vs BP2) |
| **Publisher subnav** | Publisher board ↔ Lab ↔ Museum | OK internally; Lab is easy to confuse with `/experience-lab/[rvtr]` |

---

## 3. Orphan & Hard-to-Reach Pages

| Route | Issue |
|-------|-------|
| `/ops/studio/experience-lab/[rvtr]` | No `StudioShell`, no product chrome, no link from department nav |
| `/ops/studio/visual-analysis` | Registered in `STUDIO_DEPARTMENTS` but `available: false`; placeholder only |
| `/ops/studio/audio-analysis` | Same |
| `/ops/studio/quality-control` | Same |
| `/ops/studio/training/*` | In `StudioShell` nav but not in `StudioProductChrome`; hidden from BP2 chrome |
| `/ops/experience-director-pilot` | Legacy pilot; not in Studio nav |
| `/ops/intelligence/*` | Parallel research pipeline; reachable from BP2 row actions only |

---

## 4. Legacy / Prototype Pages (preserve, do not delete)

| Page | Status | Recommendation |
|------|--------|----------------|
| `/ops/browser-plus` | Legacy browser | Keep; label “Classic Browser+” (already on BP2) |
| `/ops/intelligence` | Legacy Research Center | Keep; label “Research Center (legacy)” in docs |
| `/ops/studio/training` | Training academy | Hide from primary nav until post-live-test; keep URL |
| `/ops/studio/publisher/lab` | Quality patterns / drift | Treat as Publisher internal tool; rename display to “Publisher Analytics” later |
| `/ops/studio/experience-lab/[rvtr]` | Design prototype | Hide from nav; link from Director review only |
| `/ops/studio/{visual,audio}-analysis`, `quality-control` | Phase 0 stubs | Hide from any nav; redirect to department “coming soon” message later |
| `/ops/experience-director-pilot` | Old pilot | Mark legacy in Command Center; no Studio nav link |

---

## 5. Naming Inconsistencies

| Term used | Means |
|-----------|-------|
| Studio Dashboard | `/ops/studio` |
| Mission Control | `/ops/studio` OR `/ops/browser-plus-2` depending on page |
| Operations Center | BP2 header subtitle |
| Browser+ 2.0 — Studio Ops | Command Center label for BP2 |
| Command Center | `/ops` hub |
| Story Desk | Editor department page title |
| Research Library | Collector department page title |
| Quality Lab | Publisher `/publisher/lab` |
| Experience Lab | Different route: `/experience-lab/[rvtr]` |

---

## 6. Proposed Navigation Tree

Single mental model: **Mission Control → Departments → Song workspace**. Library/batch is a sibling tool, not a second home.

```
Retroverse Command Center (/ops)
│
├── Studio (/ops/studio)  ★ MISSION CONTROL — operational home
│   ├── Live status · pipeline · activity · diagnostics
│   ├── Quick: Library & Queue · Command Center
│   │
│   ├── Collector (/ops/studio/collector)
│   │   ├── Research library index
│   │   └── Song (/ops/studio/collector/[rvtr])
│   │
│   ├── Editor (/ops/studio/editor)
│   │   ├── Cleanup / normalization index
│   │   └── Song (/ops/studio/editor/[rvtr])
│   │
│   ├── Director (/ops/studio/director)
│   │   └── ?rvtr= query for song context
│   │
│   └── Publisher (/ops/studio/publisher)
│       ├── Publish board
│       ├── Review (/ops/studio/publisher/[rvtr])
│       ├── Museum (/ops/studio/publisher/museum) — published packages
│       └── [internal] Quality Lab (/ops/studio/publisher/lab)
│
├── Library & Queue (/ops/browser-plus-2)  — batch, overnight, library table, daily report
│   └── Classic Browser+ (/ops/browser-plus)
│
├── Research Center (/ops/intelligence)  — legacy; not Studio Alpha pipeline
│
└── Browser (product switcher) → Library & Queue (/ops/browser-plus-2)
    Studio (product switcher) → Mission Control (/ops/studio)
```

### Song workspace tabs (per RVTR)

Current `SongWorkspaceTabs` only enables Research + Story. Proposed (labels aligned to Sprint 3.19):

| Tab | Route | Department |
|-----|-------|------------|
| Research | `/ops/studio/collector/[rvtr]` | Collector |
| Cleanup | `/ops/studio/editor/[rvtr]` | Editor |
| Experience | `/ops/studio/director?rvtr=` | Director (enable tab) |
| Publish | `/ops/studio/publisher/[rvtr]` | Publisher (enable tab) |

Defer tab enablement until after live test — document only.

---

## 7. Mission Control Recommendations

### Role

Mission Control (`/ops/studio`) = **operational home**: what is running, what is queued, what finished, where to go next. Not a link farm.

### Recommended layout (top → bottom)

1. **Status strip** — department run state (idle/running/waiting) with queue counts *(live poll — exists)*
2. **Active song** — single focal card when any department is working *(exists)*
3. **Pipeline** — five stages with counts; click → department *(exists)*
4. **Quick actions row** *(add)*
   - Library & Queue → `/ops/browser-plus-2`
   - Run year batch → docs/command for `npm run research:studio:year-batch`
   - Publisher board → `/ops/studio/publisher`
5. **Department grid** — four cards; click → department *(exists)*
6. **Activity + recent publications** *(exists)*
7. **Pipeline diagnostics** — collapsed by default; power-user health *(exists; consider collapse)*

### What Mission Control should NOT host (stay on Library & Queue)

- Full VDJ library table
- Batch enqueue / overnight presets
- Row-level metadata recovery
- Song DNA inspector
- Daily production report (until unified loader)

### What to expose directly from Mission Control

| Surface | Now | Recommend |
|---------|-----|-----------|
| Collector / Editor / Director / Publisher | Department cards | Keep |
| Activity | Timeline | Keep |
| Queue counts | Live status | Keep |
| Batch processing | Only via BP2 | Link “Library & Queue” prominently |
| Packages | Via departments | Add “Publisher board” quick action |
| Review | Per department | Director + Publisher cards sufficient |
| Reports | BP2 daily report | Link from quick actions |

### Chrome consolidation (future — not this sprint)

Wrap `/ops/studio/*` in `RetroverseShell` + updated `StudioProductChrome` so Studio matches the blue Command Center experience. Out of scope for safe fixes.

---

## 8. Browser vs Studio (preserve)

| Browser | Studio |
|---------|--------|
| Music library search & browse | Production pipeline |
| RVTR assignment, covers, tags | Package creation (collector.json → publish) |
| VirtualDJ integration | Department workflow |
| `/ops/browser-plus-2`, `/ops/browser-plus` | `/ops/studio/*` |
| Batch enqueue from library rows | Department status & song workspaces |

Do not merge product switcher entries. Clarify labels only.

---

## 9. Recommended Removals / Consolidations

### Safe now (labels + links only)

- [x] `StudioProductChrome`: Mission Control → `/ops/studio`; BP2 → “Library & Queue”
- [x] Remove duplicate “Dashboard” nav item (MC covers it)
- [x] Training + missing-package CTAs → `/ops/studio` for Mission Control
- [x] BP2 header kicker: “Browser+ · Library & Queue” (not Mission Control)
- [x] `StudioShell` rail brand: “Mission Control”
- [x] Command Center Studio section: Mission Control + Library & Queue links

### After live test (needs review)

- Unify pipeline health (one loader on MC; BP2 links to MC for dept counts)
- Adopt `RetroverseShell` on all `/ops/studio/*` pages
- Hide Training from primary rail; keep under guide menu
- Enable Experience + Publish song tabs
- Redirect stubs (`visual-analysis`, etc.) to MC with “coming soon”
- Rename Publisher “Quality Lab” vs Experience Lab route

### Do not delete

- Any route listed in §4
- `/ops/intelligence` pipeline
- Classic Browser+

---

## 10. Safe Implementation Applied (Sprint 3.20)

| Change | File |
|--------|------|
| Mission Control nav → `/ops/studio` | `StudioProductChrome.tsx` |
| BP2 nav → “Library & Queue” | `StudioProductChrome.tsx` |
| Removed duplicate Dashboard link | `StudioProductChrome.tsx` |
| Rail brand “Mission Control” + Library & Queue link | `StudioShell.tsx` |
| BP2 header rename | `BrowserPlus2Client.tsx` |
| Training MC link | `training/page.tsx` |
| Missing package CTAs | `CollectorPackageMissing.tsx`, `EditorStoryMissing.tsx` |
| Command Center Studio links | `app/ops/page.tsx` |
| Operator guide MC purpose | `page-guides.ts` |

---

## 11. Verification Checklist (tomorrow night)

- [ ] Open Command Center → Studio → lands on Mission Control with live departments
- [ ] From Mission Control, reach all four departments in one click
- [ ] Batch overnight run via Library & Queue (BP2), return to MC for status
- [ ] Song path: Collector `[rvtr]` → Editor `[rvtr]` without getting lost
- [ ] Publisher review → Museum for published set
- [ ] No page title says “Mission Control” on BP2

---

## Execution State

**COMPLETE** — Audit delivered, safe navigation fixes applied, structural renames deferred for review.
