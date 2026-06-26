# Browser+ 2 — Browser vs Studio Separation Plan

**Purpose:** Classify every major Browser+ 2 feature by product ownership before additional shell work.  
**Scope:** Planning only (D-006). No code movement, routing changes, or UI redesign.  
**Updated:** 2026-06-26 (D-006)

**Related docs:**

- [RETROVERSE_PRODUCT_MAP.md](./RETROVERSE_PRODUCT_MAP.md)
- [RETROVERSE_PRODUCT_IDENTITY.md](./RETROVERSE_PRODUCT_IDENTITY.md)

---

## Executive Summary

Browser+ 2 (`/ops/browser-plus-2`) is a **split surface**: one route, one loader, one client — but roughly **40% Browser**, **45% Studio**, **15% Shared/bridge** by feature count. The UI stacks **Studio mission control above** a **library workbench** that already uses Studio-skewed table columns and filters.

D-005 wrapped the entire page in `RetroverseShell product="studio"`. That was a valid pilot but **does not match long-term ownership** — D-003 specifies context-aware product identity (library → Browser, mission control → Studio).

Recommended end state: **same route, two product zones** (or eventual split routes), **shared RVTR row model**, **split loaders and APIs**, **dual shell context**.

---

## 1. Feature Inventory

Legend: **B** = Browser · **S** = Studio · **X** = Shared

### 1.1 Shell & Navigation

| Feature | Location | Bucket | Notes |
|---------|----------|--------|-------|
| RetroverseShell / UniverseStrip | `page.tsx` | **X** | D-005 pilot; tier-1 is product-neutral |
| ProductSwitcher (Browser / Studio / Knowledge) | `components/ops/shell/` | **X** | Cross-product navigation |
| StudioProductChrome (tier-2) | `page.tsx` | **S** | Mission line + dept nav; active = Mission Control |
| BP2 page header (title, crumbs, quick links) | `BrowserPlus2Client` L646–674 | **X** | Redundant with shell; transitional |
| Refresh model | Client `loadModel()` | **X** | Reloads monolithic model |

### 1.2 Mission Control (Studio Ops)

| Feature | Location | Bucket | Notes |
|---------|----------|--------|-------|
| Mission Control dashboard (hero lamp, stats, Live Now, Needs Attention) | `StudioOperationsDashboard.tsx` | **S** | Workers, departments, AI engines |
| Production Queue panel (pause / resume / cancel / retry) | `StudioQueuePanel.tsx` | **S** | `studio-queue.ts` |
| Batch bar (Run Collector/Editor/Director, overnight presets) | `StudioBatchBar.tsx` | **S** | Enqueues via studio-queue API |
| Studio queue API | `app/api/ops/browser-plus-2/studio-queue/` | **S** | Should move under `/api/ops/studio/` |
| Scheduler planning / worker resolution | `studio-scheduler-*.ts`, `load-studio-operations.ts` | **S** | Thin adapters over Studio kernel |
| Studio ops labels | `studio-ops-labels.ts` | **S** | Presentation |

### 1.3 Library Overview & Health

| Feature | Location | Bucket | Notes |
|---------|----------|--------|-------|
| Library Overview stats grid | `StudioHealthDashboard.tsx` | **X** | Studio metrics **derived from library rows** — bridge widget |
| Readiness panels (Sunday / Top 100 / Top 500) | Client + `cohorts.ts`, `readiness.ts` | **X** | Cohort filters + production blockers |
| Work queue cards (Needs Identity → Experience Ready) | Client `OPERATIONS_QUEUES` | **X** | Cross-product pipeline states |
| Operations drawer (video counts, browse-all) | Client | **X** | Summary + filter shortcuts |

### 1.4 Automation Queues

| Feature | Location | Bucket | Notes |
|---------|----------|--------|-------|
| Research Queue (tier buttons, active job status) | Client + `research-build-queue.ts` | **S** | Legacy intelligence build automation |
| Research queue API | `app/api/ops/browser-plus-2/research-queue/` | **S** | Invokes research build jobs |
| Review Next | `mission-actions.ts` | **X** | Filter + open research package |

### 1.5 Filters & Search

| Feature | Location | Bucket | Notes |
|---------|----------|--------|-------|
| Work queue filters (`BP2_FILTERS`) | `work-queues.ts` | **X** | Identity/research/review/cover/ready |
| Studio filters (`BP2_STUDIO_FILTERS`) | `studio-filters.ts` | **S** | Dept stage, patron value, confidence |
| Filter sidebar UI | Client | **X** | Hosts both filter sets |
| Text search | — | — | **Not implemented in BP2** (Classic Browser+ only) |

### 1.6 Library Browser Table

| Feature | Location | Bucket | Notes |
|---------|----------|--------|-------|
| Library table shell | Client L1266+ | **B** | Core browse surface |
| Artist / Title cells | `MetadataDisplayCell.tsx` | **B** | XML vs filename display |
| Row selection / select-all | Client | **X** | Used for Studio batch enqueue |
| RVTR column | Client | **X** | Canonical identity |
| Plays column | Client | **B** | VDJ play history |
| Studio columns (Status, Patron, Confidence, Story, Perf, Assets, Versions, Updated) | Client table | **S** | **Misplaced in Browser table today** |

### 1.7 Song Inspector — Browser

| Feature | Location | Bucket | Notes |
|---------|----------|--------|-------|
| Cover thumbnail | Client | **B** | Artwork inspection |
| Metadata display lines (artist/title) | `MetadataDisplayCell` | **B** | Read-only; XML truth |
| VirtualDJ panel (Label, Grouping, RV Tags, path, plays, dates) | Client | **B** | VDJ mirror read-only |
| Metadata Recovery panel | `MetadataRecoveryPanel.tsx` | **B** | Filename recovery analysis |
| Metadata Recovery report modal | `MetadataRecoveryReport.tsx` | **B** | Library-wide repair report |
| Filename metadata recovery logic | `filename-metadata-recovery.ts` | **B** | |
| Metadata impact analysis | `metadata-impact.ts` | **B** | |
| Play in VirtualDJ link | Client | **B** | → Classic Browser+ |

### 1.8 Song Inspector — Studio / Production

| Feature | Location | Bucket | Notes |
|---------|----------|--------|-------|
| Studio Status panel | Client | **S** | Stage, patron value, package versions |
| Studio Actions (Open Collector/Editor/Director, Experience Plan) | Client + `mission-actions.ts` | **S** | Deep-links to dept pages |
| Path To Ready checklist | `readiness.ts` | **X** | Production pipeline state |
| Next Action + button | `readiness.ts`, Client | **X** | Spans Browser + Studio + Research |
| Work Queue chips / inspector Work Queue panel | `work-queues.ts` | **X** | |
| Patron priority badge | `readiness.ts` | **S** | Sunday / Top 100 / Top 500 |

### 1.9 Song Inspector — Research / Intelligence

| Feature | Location | Bucket | Notes |
|---------|----------|--------|-------|
| Story panel | Client (package fetch) | **S** | Research dept output |
| Chart Journey panel | Client + `/api/chart-journey` | **X** | Graph/chart data |
| Research Summary panel | Client | **S** | Facts, stories, artifacts |
| Add story line | Client + `story-line` API | **S** | Writes intelligence package |
| Artifact readiness checklist | Client | **S** | |
| Intelligence Actions (Open Song, Research, Live, Copy RVTR) | Client | **X** | Cross-surface links |

### 1.10 Data Loading & APIs

| Feature | Location | Bucket | Notes |
|---------|----------|--------|-------|
| Monolithic model loader | `load-browser-plus-2.ts` | **X** | Single `Bp2Model` — **primary coupling point** |
| VDJ library base (`loadBrowserPlusModel`) | `lib/ops/browser-plus/` | **B** | XML mirror, rows, paths |
| VDJ database scan (remix) | `vdj-database` | **B** | |
| Identity derivation | `status.ts` | **B** | |
| Package hints (research status) | `load-package-hints.ts` | **S** | Intelligence pipeline |
| Studio package hints | `load-studio-package-hints.ts` | **S** | Dept artifacts |
| Cohort context (Sunday/Top100/Top500) | `cohorts.ts` | **X** | |
| Cover info by RVTR | intelligence covers | **X** | |
| Studio health builder | `studio-health.ts` | **S** | |
| Main GET API | `app/api/ops/browser-plus-2/route.ts` | **X** | Returns full model |

### 1.11 Classic Browser+ (not in BP2 — Browser home reference)

| Feature | Location | Bucket | Notes |
|---------|----------|--------|-------|
| Match agent / match queue | `browser-plus/` | **B** | RVTR assignment |
| VDJ label write / XML sync | `vdj-label-write.ts` | **B** | Not in BP2 |
| Folder tree / column picker | Classic UI | **B** | Not in BP2 |
| Saved filters / modes | Classic UI | **B** | Not in BP2 |
| Execution runner UI | Classic / automation | **S** | Partial overlap with research queue |

---

## 2. Recommended Destination

| Current BP2 area | Destination product | Target surface (future) |
|------------------|---------------------|-------------------------|
| Universe strip + switcher | **Shared** | All ops products |
| Mission Control dashboard | **Studio** | `/ops/studio/mission-control` or BP2 `#studio` zone |
| Production Queue + batch bar | **Studio** | Same |
| Studio filters | **Studio** | Studio queue / mission views |
| Research build queue | **Studio** | Research automation (subset of Studio) |
| Library table (core browse) | **Browser** | `/ops/browser-plus-2` Browser shell zone |
| VDJ inspector, metadata recovery | **Browser** | Browser inspector |
| Studio table columns | **Studio** | Studio queue view or toggle column set |
| Studio inspector panels | **Studio** | Studio track detail / dept handoff |
| Work queue filters & readiness | **Shared** | Both products; filter API on shared row model |
| Next Action / Path To Ready | **Shared** | Computed field on `RvtrWorkbenchRow` |
| Library Overview health grid | **Shared** | Optional widget in both shells |
| Monolithic loader | **Split** | `loadBrowserLibrary()` + `loadStudioMission()` |
| BP2 header quick links | **Shared** | Absorbed into product shells (D-005+ pattern) |

**Route recommendation (no change yet):** Keep `/ops/browser-plus-2` as **handoff surface** with scroll-linked or tabbed **Browser zone** + **Studio zone**. Optional future alias: `/ops/studio/mission-control` → same Studio zone deep link.

**Shell recommendation:** Replace single `product="studio"` with **context-aware shell** (D-003 §2.3): highlight Browser when library/inspector focused, Studio when mission control focused; optional dual badge on wide displays.

---

## 3. Migration Order

| Phase | Milestone | Work | Depends on |
|-------|-----------|------|------------|
| **0** | D-006 | This plan | — |
| **1** | D-007+ doc | Define `RvtrWorkbenchRow` shared type (extract from `Bp2Row`) | D-006 |
| **2** | Data | Split `load-browser-plus-2.ts` → browser loader + studio loader; compose in thin facade for backward compat | Phase 1 |
| **3** | API | Add `/api/ops/browser/library` and `/api/ops/studio/mission`; keep old API as merge | Phase 2 |
| **4** | UI shell | Context-aware `RetroverseShell` on BP2 (Browser vs Studio chip) | D-005 |
| **5** | UI layout | DOM split: `#bp2-studio` (mission control stack) vs `#bp2-library` (filters + table + browser inspector) | Phase 4 |
| **6** | Components | Move `Studio*Dashboard`, `StudioQueuePanel`, `StudioBatchBar` → `components/ops/studio/mission-control/` | Phase 5 |
| **7** | Table | Default Browser columns; Studio columns in Studio queue view or column mode toggle | Phase 5 |
| **8** | Inspector | Tab or accordion: **Library** (VDJ/metadata) vs **Production** (studio/research) | Phase 5 |
| **9** | Studio pages | Wrap `/ops/studio/*` with same shell pattern (not BP2-only) | D-005 pattern |
| **10** | Cleanup | Remove duplicate BP2 header links; retire monolithic API | Phases 3–9 |

**Do not migrate Classic Browser+ (`/ops/browser-plus`) until BP2 Browser zone covers:** match/RVTR assign, XML write, tag edit.

---

## 4. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Monolithic loader** — any split breaks load time assumptions | High | Facade composes split loaders; perf-test before cutover |
| **Batch enqueue depends on library selection** | High | Keep shared selection state in handoff layer until Studio queue UI can pick RVTRs independently |
| **Next Action spans products** | Medium | Keep `computeNextAction` in shared lib; UI routes to correct product |
| **D-005 Studio-only shell** mis signals product on library work | Medium | Phase 4 context chip; document interim state |
| **`resolveProductFromPath` vs shell `product="studio"`** conflict | Low | Align registry: BP2 = dual; path helper returns primary zone |
| **Research queue vs Browser identity** | Medium | Research automation stays Studio; identity fixes stay Browser |
| **Table column split** confuses operators during transition | Medium | Column mode toggle before hard removal |
| **Two inspectors for one row** | Low | Shared selected RVTR state; split panels not split data |
| **CSS/theme bleed** | Medium | Browser zone gets `--rs-browser-*`; Studio zone keeps `--rs-studio-*` (D-001/D-004) |
| **Scheduler/kernel coupling** | High | Move only UI + adapters; never duplicate queue logic |

---

## 5. Estimated Effort

Rough engineering estimates for **one operator** familiar with the codebase. Presentation-only phases are smaller; loader/API splits are larger.

| Phase | Description | Effort |
|-------|-------------|--------|
| D-006 | Separation plan (this doc) | **Done** |
| Shared row type extraction | Types + tests, no UI change | **0.5–1 day** |
| Loader split + facade | `load-browser-plus-2.ts` decompose | **2–3 days** |
| API split | Two endpoints + compat shim | **1–2 days** |
| Context-aware shell on BP2 | Product chip by scroll/zone | **1 day** |
| DOM zone split (BP2 client) | Reorder sections, IDs, minimal CSS | **2–3 days** |
| Component re-home (Studio → studio/) | Move 4 components + imports | **1 day** |
| Browser shell tier-2 (`BrowserProductChrome`) | Mirror StudioProductChrome | **1 day** |
| Table column modes | Browser default + Studio optional | **2 days** |
| Inspector partition | Library vs Production tabs | **2–3 days** |
| Studio dept pages shell wrap | Same as D-005 for `/ops/studio/*` | **1–2 days** |
| Monolith retirement + cleanup | Remove shim, header dupes | **1–2 days** |

**Total (full separation on BP2):** ~**15–22 days** incremental work across milestones.

**Minimum viable separation (MVS):** Phases 1–5 only — ~**7–10 days** — gives distinct zones + dual shell context without table/inspector surgery.

---

## 6. Current vs Target (ASCII)

**Today:**

```
[ Universe: Studio active (D-005) ]
[ Tier-2: Studio / Mission Control     ]
[ BP2 header (mixed links)             ]
┌─ STUDIO ─────────────────────────────┐
│ Mission Control · Queue · Batch      │
│ Health · Readiness · Research Queue  │
├─ MIXED ──────────────────────────────┤
│ Filters (Browser + Studio)           │
│ Inspector (Browser + Studio + Research)│
│ Library table (mostly Studio cols)   │
└──────────────────────────────────────┘
```

**Target:**

```
[ Universe: RETROVERSE + switcher       ]
[ Tier-2: Browser OR Studio (context) ]
┌─ STUDIO ZONE ────────────────────────┐
│ Mission Control · Queue · Batch      │
│ Studio filters · Studio table cols   │
└──────────────────────────────────────┘
┌─ BROWSER ZONE ───────────────────────┐
│ Library filters · VDJ table cols     │
│ Metadata inspector · Recovery        │
└──────────────────────────────────────┘
        ↑ shared: RVTR selection, Next Action
```

---

## Document History

| Milestone | Change |
|-----------|--------|
| D-006 | Initial Browser vs Studio separation audit and migration plan |
