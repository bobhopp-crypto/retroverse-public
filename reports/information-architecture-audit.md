# Retroverse Information Architecture Audit

**Sprint:** 3.22  
**Date:** 2026-06-27  
**Scope:** Audit only — no renames applied  
**Goal:** Establish a shared vocabulary before future UI redesign

---

## Executive Summary

Retroverse has grown into a **multi-product ops platform** with strong department logic but **inconsistent naming at the boundaries**. The biggest confusion clusters are:

1. **Two Studio “homes”** — Mission Control (`/ops/studio`) vs Operations Center (`/ops/browser-plus-2`)
2. **“Research” overload** — Research Studio (global nav), Research Center (intelligence), Research Library (Collector), Packages (shortcut)
3. **“Lab” overload** — Creative Lab, Experience Lab, Quality Lab / Quality Laboratory
4. **Two navigation chrome systems** — `StudioShell` on Studio pages vs `RetroverseShell` + `StudioProductChrome` on Browser+ 2 only
5. **Department vs workspace naming** — nav says Collector; page says Research Library

Nothing is broken at the architecture level. The pipeline and department responsibilities are clear in code. The **language layer** has not kept pace.

---

## Current Navigation Hierarchy

### Top-level zones (`lib/navigation/app-zones.ts`)

```
Public          → /                          (discovery, search, artists)
Live            → /retroverse-2/live         (live channel)
Research Studio → /ops/studio                ⚠ label conflicts with Research Center
Command Center  → /ops                        (ops hub)
Diagnostics     → /diagnostics                (dev tools, gated)
```

### Command Center hub (`/ops`)

```
RETROVERSE COMMAND CENTER
│
├── Top quick actions
│   ├── Studio              → /ops/studio
│   ├── Packages            → /ops/intelligence   ⚠ alias for Research Center
│   ├── Live Control        → /ops/live-control
│   ├── Factory, Backups, Storage, …
│
├── Main Things I Use
│   ├── All-Star Baseball   → /ops/allstar/*
│   ├── Run A Show          → live-control, sunday-nights, live, companion, event-control
│   ├── Studio
│   │   ├── Mission Control     → /ops/studio
│   │   └── Library & Queue     → /ops/browser-plus-2
│   ├── Research
│   │   └── Research Center     → /ops/intelligence
│   ├── Create Stuff        → Content Creator
│   └── Manage My Library
│       ├── Browser+ 2.0 — Studio Ops  → /ops/browser-plus-2   ⚠ duplicate of Library & Queue
│       ├── VirtualDJ Browser+         → /ops/browser-plus
│       └── Atlas, Media Sync, Cover Tools, …
│
└── Other Tools (collapsed) — finance, media lab, creative lab, crossroads, etc.
```

### Studio product (`/ops/studio/*`)

**Chrome:** `StudioShell` left rail (not `RetroverseShell`)

```
Mission Control (brand)     → /ops/studio
Library & Queue             → /ops/browser-plus-2
Training                    → /ops/studio/training
Collector                   → /ops/studio/collector
Editor                      → /ops/studio/editor
Director                    → /ops/studio/director
Publisher                   → /ops/studio/publisher
Command Center (back)       → /ops
```

**Mission Control page flow (Sprint 3.21):**

```
Hero status → Primary actions → Production pipeline → Studio Today
→ Department rooms → Recent packages → Studio activity
```

### Studio departments and sub-surfaces

```
/ops/studio                          Mission Control
├── /training                        Training Mode
├── /training/[rvtr]/[department]    Department walkthrough
│
├── /collector                       Research Library
│   └── /collector/[rvtr]           Song workspace (Research tab)
├── /editor                          Story Desk
│   └── /editor/[rvtr]               Song workspace (Story tab)
├── /director                        Director
├── /publisher                       Publisher (kanban board)
│   ├── /publisher/lab               Quality Lab / Quality Laboratory
│   ├── /publisher/museum            Museum Wall
│   └── /publisher/[rvtr]            Publisher review
│
├── /experience-lab/[rvtr]           Experience Lab (no StudioShell)
├── /quality-control                 Coming soon (kernel dept)
├── /audio-analysis                  Coming soon
└── /visual-analysis                 Coming soon
```

**Song workspace tabs** (`SongWorkspaceTabs`):

| Tab | Label | Route | Status |
|-----|-------|-------|--------|
| research | Research | `/ops/studio/collector/[rvtr]` | Active |
| story | Story | `/ops/studio/editor/[rvtr]` | Active |
| experience | Experience | — | Disabled placeholder |
| publish | Publish | — | Disabled placeholder |
| history | History | — | Disabled placeholder |

### Library & batch (`/ops/browser-plus-2`)

**Chrome:** `RetroverseShell` + `StudioProductChrome` (active: library-queue)

```
Kicker:  Browser+ · Library & Queue
H1:      Operations Center
Metadata: Browser+ 2.0 — Studio Operations Center
Link:    Mission Control → /ops/studio
Link:    Classic Browser+ → /ops/browser-plus
```

### Pre-Studio research (`/ops/intelligence`)

```
Research Center                    /ops/intelligence
├── #dashboard, #gallery, #queue, #maintenance   (anchor nav; CSS: package-center__*)
├── /backfill                      Research Backfill
├── /runs/current                  Overnight Research Build
├── /package/[rvtr]                Song Research
│   └── /artifacts                 Artifact Studio
└── (linked) /ops/experience-director-pilot   legacy pilot
```

### Classic browser (`/ops/browser-plus`)

```
Kicker: VirtualDJ Browser+ · Collection Manager
H1:     Browser Grid
```

### Creative surfaces (outside Studio pipeline)

```
/ops/creative-lab          Creative Lab — posters, passes, artwork workstation
/ops/media-lab             Media Lab — performances, collections
/ops/content-creator/*     Content Creator — generated graphics
```

### Live cluster

```
/ops/live-control          Live Control Center — H1 "Command The Channel"
/ops/live                  Bridge Health — VDJ bridge diagnostics
/ops/live-companion        Live Public View — DJ companion mirror
/ops/sunday-nights         Sunday Nights show ops
/ops/event-control         Event Command Center
```

### Patron-facing

```
/                          Public discovery
/experience/[rvtr]         Published experience player (patron URL)
/retroverse-2/live         Live channel (public zone)
```

### Diagnostics

```
/diagnostics               H1 Diagnostics
├── Graph Inspector        /inspect
├── Control Center         /control-center
└── Command Center         /ops
```

---

## Complete Terminology Inventory

### Places (where users go)

| Term | Route(s) | Where labeled | Notes |
|------|----------|---------------|-------|
| **Public** | `/`, search, artist, album, track | Global nav zone | Patron discovery |
| **Live** | `/retroverse-2/live`, `/live` | Global nav zone; also Bridge Health route | Overloaded — zone vs ops page |
| **Command Center** | `/ops` | H1, metadata, StudioShell back, diagnostics card | Primary ops hub |
| **Retroverse Ops Console** | `/ops` (blocked) | Disabled-state H1 only | Legacy error label |
| **Mission Control** | `/ops/studio` | Hero H1, StudioShell brand, metadata, MC actions | Studio operational home |
| **Operations Center** | `/ops/browser-plus-2` | BP2 H1 | Conflicts with Mission Control role |
| **Library & Queue** | `/ops/browser-plus-2` | StudioShell, StudioProductChrome, BP2 kicker | Preferred batch/library name |
| **Browser+ 2.0 — Studio Ops** | `/ops/browser-plus-2` | Command Center link only | Legacy marketing label |
| **VirtualDJ Browser+** | `/ops/browser-plus` | BP2 link, Command Center | Classic/legacy browser |
| **Browser Grid** | `/ops/browser-plus` | Classic browser H1 | |
| **Research Center** | `/ops/intelligence` | H1, metadata, back links | Pre-Studio song research hub |
| **Research Backfill** | `/ops/intelligence/backfill` | Page title | |
| **Overnight Research Build** | `/ops/intelligence/runs/current` | Page title | |
| **Song Research** | `/ops/intelligence/package/[rvtr]` | Kicker | Per-song intelligence workspace |
| **Artifact Studio** | `/ops/intelligence/package/[rvtr]/artifacts` | Kicker, metadata | Visual artifact view |
| **Creative Lab** | `/ops/creative-lab` | H1, metadata, sidebar | Poster/art workstation |
| **Media Lab** | `/ops/media-lab` | Ops links | Related creative surface |
| **Live Control Center** | `/ops/live-control` | Metadata, kicker | Show operations |
| **Command The Channel** | `/ops/live-control` | H1 | Live Control hero |
| **Bridge Health** | `/ops/live` | H1, metadata | VDJ bridge — not the Live zone |
| **Live Public View** | `/ops/live-companion` | H1 | DJ-facing patron mirror |
| **Diagnostics** | `/diagnostics` | Global zone, H1 | Dev/inspect |
| **Control Center** | `/control-center` | Diagnostics card | Dev launchpad (not Command Center) |
| **Training Mode** | `/ops/studio/training` | H1, metadata | Studio academy |
| **Experience Director Pilot** | `/ops/experience-director-pilot` | Metadata | Legacy experiment |

### Departments (who performs work)

| Term | Route | Nav label | Page H1 | Mission (kernel) |
|------|-------|-----------|---------|------------------|
| **Collector** | `/ops/studio/collector` | Collector | Research Library | Gather source material |
| **Editor** | `/ops/studio/editor` | Editor | Story Desk | Clean and normalize research |
| **Director** | `/ops/studio/director` | Director | Director | Design patron experience |
| **Publisher** | `/ops/studio/publisher` | Publisher | Publisher | Publish approved experiences |
| **Visual Analysis** | `/ops/studio/visual-analysis` | — | Coming soon | Kernel dept, no nav yet |
| **Audio Analysis** | `/ops/studio/audio-analysis` | — | Coming soon | Kernel dept, no nav yet |
| **Quality Control** | `/ops/studio/quality-control` | — | Coming soon | Kernel dept — conflicts with Quality Lab |

### Workspaces (where creative work happens)

| Term | Route | Status | Notes |
|------|-------|--------|-------|
| **Research Library** | `/ops/studio/collector` | Active | Collector department room |
| **Story Desk** | `/ops/studio/editor` | Active | Editor department room |
| **Director** | `/ops/studio/director` | Active | Production room |
| **Director Studio** | → `/ops/studio/director` | Action label only | MC button; page is "Director" |
| **Publisher board** | `/ops/studio/publisher` | Active | Informal; H1 is "Publisher" |
| **Publisher review** | `/ops/studio/publisher/[rvtr]` | Active | Per-song approval |
| **Quality Lab** | `/ops/studio/publisher/lab` | Active | Nav/metadata label |
| **Quality Laboratory** | `/ops/studio/publisher/lab` | Active | Same page H1 — inconsistent |
| **Museum Wall** | `/ops/studio/publisher/museum` | Active | Published gallery |
| **Experience Lab** | `/ops/studio/experience-lab/[rvtr]` | Prototype | Design Studio kicker; no StudioShell |
| **Design Studio** | Experience Lab kicker | Sub-mode | Inside Experience Lab |
| **Song workspace tabs** | collector/editor/[rvtr] | Partial | Research · Story · (Experience · Publish · History disabled) |
| **Story Designer** | — | Not in UI | Not implemented as label |
| **DNA Designer** | — | Not in UI | DNA exists as page type in Director copy |
| **Timeline Designer** | — | Not in UI | Timeline exists as page type in Director copy |

### Outputs (what Retroverse produces)

| Term | Where used | Meaning |
|------|------------|---------|
| **Song Package** | Collector mission, operator guides, pipeline copy | Canonical unit of Studio production |
| **Package** | Intelligence gallery, Command Center "Packages" shortcut | Often means intelligence/research artifact set |
| **Story** | Editor, song workspace tab, Director mission | Editorial narrative layer |
| **Timeline** | Director mission, experience plan | Chronological patron page |
| **DNA** | Director mission, experience-lab theme code | Song identity / visual DNA page |
| **Experience** | `/experience/[rvtr]`, disabled workspace tab | Patron-facing published product |
| **Publication / Published** | Publisher, MC metrics, Museum | Live patron URL state |
| **Museum** | Museum Wall, Editor "Museum Recommendation", renderer | Published gallery + exhibit metaphor |
| **Record Label** | — | Not a current UI label |
| **Artist Spotlight** | — | Not a current UI label |
| **Recent Packages** | Mission Control section | Published experiences with artwork |

### Systems (background infrastructure)

| Term | Where used | Meaning |
|------|------------|---------|
| **Pipeline** | MC production flow, operator guides, STUDIO_BRAIN | Collector → Editor → Director → Publisher |
| **Queue** | Library & Queue, department stats, BP2 | Songs waiting for production |
| **Batch Processing** | MC primary action | Overnight/multi-song runs via BP2 |
| **Studio Activity** | MC feed | Live pipeline events |
| **Studio Today** | MC metrics panel | Daily production summary |
| **Publishing** | Publisher department | Approve + go live |
| **Search** | Public zone | Patron discovery (not ops) |
| **Activity** | Department feeds, pipeline events | Operational log |
| **Browser+** | Product family name | VDJ library integration layer |
| **Retroverse Studio** | Metadata suffix, MC kicker | Product brand line |

### Product / zone names (global)

| Term | Source | Route | Issue |
|------|--------|-------|-------|
| **Research Studio** | `app-zones.ts` | `/ops/studio` | Implies research; collides with Research Center |
| **Studio** | ProductSwitcher, Command Center | `/ops/studio` | Correct product name |
| **Browser** | ProductSwitcher | `/ops/browser-plus-2` | Product pill name |
| **Knowledge** | ProductSwitcher | disabled | Coming soon |

---

## Duplicate Names

| Duplicate | Locations | Same purpose? |
|-----------|-----------|---------------|
| **Mission Control** vs **Operations Center** | `/ops/studio` vs `/ops/browser-plus-2` H1 | No — status home vs library/batch |
| **Library & Queue** vs **Browser+ 2.0 — Studio Ops** | Studio nav vs Command Center | Yes — same route |
| **Library & Queue** vs **Operations Center** | Nav vs BP2 H1 | Yes — same route, different names |
| **Research Studio** vs **Research Center** | Global nav vs `/ops/intelligence` | No — Studio vs intelligence hub |
| **Packages** vs **Research Center** | Command Center top action vs Research section | Yes — same route |
| **Quality Lab** vs **Quality Laboratory** | Nav link vs page H1 | Yes — same page |
| **Publisher** vs **Publisher board** | H1 vs back links | Yes — informal casing |
| **Command Center** vs **Control Center** | `/ops` vs `/control-center` | No — ops hub vs dev launchpad |
| **Live** (zone) vs **Bridge Health** (`/ops/live`) | Global nav vs ops page | No — patron channel vs VDJ bridge |
| **Experience Lab** vs **Quality Lab** vs **Creative Lab** | Three different routes | No — design prototype vs publisher analytics vs poster workstation |

---

## Conflicting Concepts

| Word | Meaning A | Meaning B | Where |
|------|-----------|-----------|-------|
| **Studio** | Production pipeline product (`/ops/studio`) | "Studio Operations Center" in BP2 metadata | BP2 page title |
| **Research** | Collector's Research Library | Research Center intelligence hub | Department vs `/ops/intelligence` |
| **Research Studio** | Global nav label for Studio | Implies all research lives here | `app-zones.ts` |
| **Package** | Song package (Studio pipeline unit) | Intelligence package (research artifacts) | Studio vs intelligence |
| **Museum** | Museum Wall (published gallery UI) | Museum exhibit mode in renderer | UI vs rendering concept |
| **Public** | Discovery zone (`/`) | "Public preview" in Publisher review | Zone vs preview panel |
| **Live** | Live channel zone | Bridge Health ops page at `/ops/live` | Zone vs diagnostics |
| **Lab** | Creative workstation | Publisher quality analytics | Overloaded suffix |
| **Experience** | Patron URL `/experience/[rvtr]` | Disabled song workspace tab | Output vs future workspace |
| **Queue** | Production queue (Studio) | Intelligence queue section | Same word, different systems |

---

## Legacy Terminology

| Term | Status | Evidence |
|------|--------|----------|
| **Package Center** | Removed from UI | CSS only: `package-center__*` in intelligence components |
| **Studio Dashboard** | Reports only | Code uses Mission Control; `StudioDashboardPage` is function name |
| **Mission Control (for BP2)** | Partially cleaned | Comments/types in `lib/ops/browser-plus-2/` may still reference |
| **Browser+ 2.0 — Studio Ops** | Still in Command Center | `app/ops/page.tsx` Manage My Library |
| **Experience Director Pilot** | Legacy page | `/ops/experience-director-pilot` — not in Studio nav |
| **Retroverse Ops Console** | Blocked-state only | When ops gate disabled |
| **Card** (intelligence) | Code/data | Reports propose "Story line" replacement |
| **Publisher Board** (capitalized) | Not used | Lowercase "Publisher board" in back links |
| **Story / DNA / Timeline Designer** | Never implemented | Only page-type vocabulary in Director copy |

---

## Pages With Unclear Purpose (to a new operator)

| Page | Why unclear |
|------|-------------|
| `/ops/browser-plus-2` | H1 says Operations Center; nav says Library & Queue; metadata says Studio Operations Center |
| `/ops/intelligence` | "Research Center" vs Collector "Research Library" — both feel like research |
| `/ops/studio/experience-lab/[rvtr]` | Orphan chrome; overlaps Quality Lab and Director conceptually |
| `/ops/live` | Named "Bridge Health" but linked under "Run A Show" as "Live" |
| `/ops/studio/publisher/lab` | "Quality Lab" sounds like `/ops/studio/quality-control` (coming soon) |
| `/control-center` vs `/ops` | Both feel like "command" surfaces |

---

## Multiple Pages, Same Purpose (or overlapping)

| Purpose | Pages | Recommendation |
|---------|-------|----------------|
| Studio operational home | `/ops/studio` (Mission Control), formerly BP2 | **Keep MC only** — already aligned in Sprint 3.20 |
| Library browse + batch queue | `/ops/browser-plus-2`, `/ops/browser-plus` | Two products — classic vs modern; label clearly |
| Song research (pre-pipeline) | `/ops/intelligence`, `/ops/studio/collector` | Different lifecycle stages — needs distinct names |
| Published output gallery | `/ops/studio/publisher/museum`, `/experience/[rvtr]` | Ops gallery vs patron player — OK if labeled |
| Quality analytics | `/ops/studio/publisher/lab`, `/ops/studio/quality-control` (future) | Will collide unless renamed early |
| Experience design | `/ops/studio/director`, `/ops/studio/experience-lab/[rvtr]` | Prototype should nest under Director or be renamed |

---

## Recommended Taxonomy

### Places
Where users navigate. One primary name per route.

| Canonical name | Route | Role |
|----------------|-------|------|
| **Public** | `/` | Patron discovery |
| **Live** | `/retroverse-2/live` | Patron live channel |
| **Command Center** | `/ops` | Ops hub and launcher |
| **Mission Control** | `/ops/studio` | Studio status + department entry |
| **Library & Queue** | `/ops/browser-plus-2` | VDJ library, batch runs, queue management |
| **Research Center** | `/ops/intelligence` | Pre-Studio intelligence hub |
| **Museum Wall** | `/ops/studio/publisher/museum` | Published package gallery (ops) |
| **Creative Lab** | `/ops/creative-lab` | Poster/art workstation |
| **Diagnostics** | `/diagnostics` | Dev tools |

### Departments
Who performs work. Keep kernel names unchanged.

- **Collector** — gather source material  
- **Editor** — clean and normalize data  
- **Director** — design patron experience  
- **Publisher** — publish approved experiences  

Future kernel departments (not yet in nav): Visual Analysis, Audio Analysis, Quality Control.

### Workspaces
Where work happens inside a department. Pattern: **nav = role, H1 = room**.

| Department | Workspace name (H1) | Per-song route |
|------------|---------------------|----------------|
| Collector | Research Library | `/collector/[rvtr]` |
| Editor | Story Desk | `/editor/[rvtr]` |
| Director | Director | `/director` (+ `?rvtr=`) |
| Publisher | Publisher | `/publisher/[rvtr]` review |

Song workspace tabs (future): Research → Story → Experience → Publish → History.

### Outputs
What Retroverse produces.

| Output | Description |
|--------|-------------|
| **Song Package** | Canonical Studio unit (RVTR-scoped artifacts through pipeline) |
| **Story** | Editorial narrative layer |
| **Timeline** | Chronological patron page |
| **DNA** | Song identity / visual DNA page |
| **Experience** | Composed patron product at `/experience/[rvtr]` |
| **Publication** | Approved, live state |

### Systems
Background infrastructure — use in copy, not as page titles.

- Pipeline, Queue, Batch, Activity, Publishing, Search

---

## Recommended Hierarchy (target state)

```
Retroverse
├── Public                         /
├── Live                           /retroverse-2/live
├── Experience (patron)            /experience/[rvtr]
│
└── Command Center                 /ops
    ├── Mission Control            /ops/studio
    │   ├── Collector → Research Library
    │   ├── Editor → Story Desk
    │   ├── Director
    │   └── Publisher
    │       ├── Review board
    │       ├── Quality Lab
    │       └── Museum Wall
    │
    ├── Library & Queue            /ops/browser-plus-2
    │   └── Classic Browser+       /ops/browser-plus
    │
    ├── Research Center            /ops/intelligence
    ├── Creative Lab               /ops/creative-lab
    ├── Live Control               /ops/live-control
    └── Diagnostics                /diagnostics
```

---

## Items That Should Remain Unchanged

| Item | Reason |
|------|--------|
| Department IDs: collector, editor, director, publisher | Canonical pipeline; stable URLs |
| Routes `/ops/studio/*`, `/ops/browser-plus-2` | Bookmarks, APIs, training docs |
| **Mission Control** as `/ops/studio` home | Sprint 3.18–3.21 investment; live status source |
| **Library & Queue** as BP2 label | Clear purpose; distinct from MC |
| Department vs workspace pattern (Collector / Research Library) | Intentional "enter a room" metaphor |
| **Command Center** as `/ops` hub name | Established ops entry |
| **Public**, **Live**, **Diagnostics** as top zones | Clean patron vs ops vs dev split |
| Kernel department registry (`lib/studio/department.ts`) | Source of truth for missions |
| Song workspace tab order | Matches pipeline mental model |

---

## Items Recommended for Future Renaming

Priority-ordered. **Do not apply in this sprint.**

### P0 — High confusion

| Current | Recommend | Where |
|---------|-----------|-------|
| Global nav **Research Studio** | **Studio** | `lib/navigation/app-zones.ts` |
| BP2 H1 **Operations Center** | **Library & Queue** (or subtitle only) | `BrowserPlus2Client.tsx` |
| BP2 metadata **Studio Operations Center** | **Library & Queue — Retroverse Studio** | `browser-plus-2/page.tsx` |
| Command Center **Packages** (top action) | **Research Center** | `app/ops/page.tsx` |
| Command Center **Browser+ 2.0 — Studio Ops** | **Library & Queue** | `app/ops/page.tsx` |
| MC action **Open Director Studio** | **Open Director** | `mission-control-copy.ts` |

### P1 — Medium confusion

| Current | Recommend | Where |
|---------|-----------|-------|
| **Quality Laboratory** (H1) | **Quality Lab** (match nav) | `ExperienceLabDashboard.tsx` |
| **Publisher board** (back links) | **Publisher** or **Publisher Board** (consistent casing) | Publisher review pages |
| **Experience Lab** (`/experience-lab/`) | **Director Lab** or nest under Director | Orphan route |
| `/ops/live` title **Bridge Health** | Clarify in Command Center as **Bridge Health** not **Live** | `app/ops/page.tsx` Run A Show links |
| **Control Center** vs **Command Center** | Add disambiguation in Diagnostics cards | Already partially distinct |

### P2 — Polish / legacy cleanup

| Current | Recommend | Where |
|---------|-----------|-------|
| CSS namespace `package-center__*` | Rename to `research-center__*` when touching styles | Intelligence components |
| Function `StudioDashboardPage` | Rename to `MissionControlPage` | `app/ops/studio/page.tsx` |
| Comments referencing BP2 as Mission Control | Update to Library & Queue | `lib/ops/browser-plus-2/` |
| **Experience Director Pilot** | Archive or mark deprecated in Command Center | `/ops/experience-director-pilot` |
| Disabled tabs Experience / Publish / History | Enable with clear routes when ready | `SongWorkspaceTabs.tsx` |

### P3 — Shell convergence (structural, not rename)

| Current | Recommend |
|---------|-----------|
| `StudioShell` on `/ops/studio/*` only | Wrap Studio pages in `RetroverseShell` + `StudioProductChrome` for one nav experience |

---

## Same Word, Different Meanings — Quick Reference

| Word | Studio context | Other context |
|------|----------------|---------------|
| **Studio** | Production product | "Studio Operations" in BP2 metadata |
| **Research** | Collector workspace | Intelligence Research Center |
| **Package** | Pipeline song package | Intelligence research package |
| **Queue** | Production queue (BP2, departments) | Intelligence maintenance queue |
| **Live** | Live channel (patrons) | Bridge Health ops page |
| **Museum** | Published gallery wall | Exhibit rendering mode |
| **Lab** | Creative / Quality / Experience — three different things | — |
| **Public** | Discovery zone | Publisher preview panel |

---

## Navigation Chrome Inventory

| Chrome | Used on | Contains |
|--------|---------|----------|
| **RetroverseGlobalNav** | Public pages | Zone switcher: Public, Live, Research Studio, Command Center, Diagnostics |
| **StudioShell** | All `/ops/studio/*` | Mission Control brand, Library & Queue, Training, departments, Command Center back |
| **RetroverseShell + StudioProductChrome** | `/ops/browser-plus-2` only | Product identity, MC, Library & Queue, departments |
| **StudioGuideChrome** | Department pages | Operator guide panels |
| **DepartmentLivingChrome** | Department pages | Live department mood + stats |
| **SongWorkspaceTabs** | Collector/Editor song views | Research · Story · (future tabs) |
| **Publisher subnav** | Publisher surfaces | Board · Quality Lab · Museum Wall |

**Conflict:** Studio pages and BP2 use different chrome. Operators switching between MC and Library & Queue see different navigation layouts.

---

## Page Title Matrix (document `<title>`)

| Route | Title |
|-------|-------|
| `/ops` | Retroverse Command Center |
| `/ops/studio` | Mission Control — Retroverse Studio |
| `/ops/studio/collector` | Research Library — Collector |
| `/ops/studio/editor` | Story Desk — Editor |
| `/ops/studio/director` | Director — Studio |
| `/ops/studio/publisher` | Publisher — Retroverse Studio |
| `/ops/studio/publisher/lab` | Quality Lab — Publisher |
| `/ops/studio/publisher/museum` | Museum Wall — Publisher |
| `/ops/studio/training` | Training — Retroverse Studio |
| `/ops/studio/experience-lab/[rvtr]` | Experience Lab — Retroverse Studio |
| `/ops/browser-plus-2` | Browser+ 2.0 — Studio Operations Center |
| `/ops/browser-plus` | VirtualDJ Browser+ — Retroverse Ops |
| `/ops/intelligence` | Research Center — Retroverse Ops |
| `/ops/creative-lab` | Creative Lab — Retroverse Ops |
| `/ops/live-control` | Live Control Center — Retroverse |
| `/ops/live` | Bridge Health — Retroverse Ops |
| `/diagnostics` | Diagnostics — Retroverse |
| `/experience/[rvtr]` | `{title} — {artist} · Retroverse Experience` (dynamic) |

---

## Success Criteria Check

For a new operator reading this audit:

| Question | Answer (target vocabulary) |
|----------|----------------------------|
| Where am I? | Zone → Product → Department → Workspace |
| What does each place do? | See Recommended Taxonomy |
| Who does the work? | Collector, Editor, Director, Publisher |
| Where does creative work happen? | Department workspaces + song tabs |
| What does Retroverse produce? | Song Package → Experience (patron URL) |

**Gap:** Naming still requires this document today. P0 renames would close most of the gap without architectural change.

---

## Related Reports

- `reports/studio-navigation-audit.md` — Sprint 3.20 navigation fixes
- `reports/sprint-3.18-mission-control-state-audit.md` — Live status wiring
- `docs/studio/STUDIO_BRAIN.md` — Canonical department missions

---

## Execution State

**Sprint 3.21.1:** COMPLETE (prior turn) — `MissionControlStudioToday` and all MC metric components use `mission-control-format.ts` safe helpers; `npx tsc --noEmit` passes.

**Sprint 3.22:** COMPLETE — Audit delivered; no renames applied.
