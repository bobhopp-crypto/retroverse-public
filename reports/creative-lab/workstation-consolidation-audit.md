# Creative Lab — Workstation Consolidation Audit

**Phase 12 · Audit only — no implementation**

**Date:** 2026-06-10  
**Problem statement:** *"I cannot tell what is happening."*  
**Diagnosis:** Navigation and workstation design — not image generation.

---

## Executive Summary

Creative Lab has **two coexisting mental models** layered on one schema:

1. **Creative Desk (Phase 9 + 11)** — event → visual world → 4 fronts → lock → 4 backs → export. This is the **live** path.
2. **Advanced Workshop (Phase 5–8)** — presets, style boards, legacy SVG concepts, refinement rounds, asset library. Much of this is **obsolete or disconnected** from the desk path.

The user cannot tell what is happening because:

- **Actions and results are separated by scroll** on a single long vertical page.
- **The same concepts appear in multiple places** (fronts on desk, prompts in Pass Lab, assets in Asset Library) with no unified selection state visible at a glance.
- **Advanced Workshop opens to Projects**, not where the work lives (assets, pass state).
- **Three parallel “style” systems** (visual worlds, presets, style boards) only one of which drives real PNG generation.
- **Legacy fields** (`workflowRound`, `refinementGenerated`, `selectedVariationIndex`) display misleading state in Advanced Pass Lab.
- **No persistent status bar** showing: active project, selected front, locked front, selected back, approved, final.

**Recommendation:** Consolidate to a **single-screen browser + inspector** layout. Do not add features, worlds, asset types, or workflow steps.

---

## 1. Current Architecture Map

### 1.1 Route & Shell

| Layer | Path / File | Role |
|-------|-------------|------|
| Page | `/ops/creative-lab` | Single page; ops gate (`RETROVERSE_OPS=1`) |
| Shell | `app/ops/creative-lab/page.tsx` | Topbar, banner, `<CreativeLabWorkspace />` |
| Styles | `app/ops/creative-lab/creative-lab.css` | ~2150 lines; includes dead Phase 5–8 classes |
| Root state | `CreativeLabWorkspace.tsx` | All fetch/state/routing; switches desk vs advanced |

### 1.2 Navigation Model

URL params (`lib/ops/creative-lab/workspace/urls.ts`):

| Param | Values | Default |
|-------|--------|---------|
| `panel` | `workstation` \| `projects` \| `styles` \| `presets` \| `pass-lab` \| `assets` | `workstation` (omitted) |
| `project` | project id / folder slug | none |

```
/ops/creative-lab                          → Creative Desk (workstation)
/ops/creative-lab?panel=projects&project=X → Advanced → Projects
/ops/creative-lab?panel=assets&project=X   → Advanced → Asset Library
```

**`isAdvancedPanel()`** = any panel except `workstation`.

### 1.3 Screen Hierarchy

```
/ops/creative-lab
└── CreativeLabWorkspace
    │
    ├── [panel = workstation]  CREATIVE DESK
    │   ├── Masthead ("Front approval · back generation")
    │   ├── Step 1 — Event panel (Event, Venue, Date, Years)
    │   ├── Step 2 — Visual world grid (6 cards)
    │   ├── Step 3 — GENERATE FRONT CONCEPTS (CTA)
    │   ├── ConceptDeck (if project has prompts)
    │   │   ├── Phase A: Front concepts A–D grid
    │   │   ├── LOCK FRONT CTA
    │   │   ├── Phase B: Locked front preview
    │   │   ├── GENERATE 4 MATCHING BACKS CTA
    │   │   ├── Phase C: Back concepts A–D grid
    │   │   └── EXPORT PASS PACKAGE CTA
    │   └── Footer: Advanced Workshop →
    │
    └── [panel = advanced]  ADVANCED WORKSHOP
        ├── Sidebar (220–280px)
        │   ├── ← Creative Desk
        │   ├── Nav: Projects | Styles | Presets | Pass Lab | Assets
        │   └── Modules list (read-only; 4 "soon")
        ├── ProjectToolbar (sticky)
        │   └── Save | Reveal | Exports | Export Package | Export Finals
        ├── Active panel content (one of 5)
        └── InfluenceLibraryPanel (collapsible, always at bottom)
```

### 1.4 Component Inventory

#### Active (in render tree)

| Component | Location | Purpose |
|-----------|----------|---------|
| `CreativeLabWorkspace` | Root | Routing, API, all handlers |
| `CreativeWorkstation` | Desk | Event + world + generate + hosts ConceptDeck |
| `ConceptDeck` | Desk | Front/back PNG workflow (Phase 11) |
| `VisualWorldCard` | Desk Step 2 | 6 visual world picker |
| `VisualWorldHero` | Inside world card | Gradient hero |
| `YearTokenInput` | Desk Step 1 | Year chips |
| `AdvancedWorkshop` | Advanced | Sidebar + panel router |
| `ProjectToolbar` | Advanced top | Project actions (sticky) |
| `PresetGallery` | Advanced Presets | Apply/duplicate presets |
| `StyleBoard` ×3 + `StyleWeightEditor` | Advanced Styles | Weighted style selection |
| `PromptPreviewPanel` | Styles + Pass Lab | Read-only prompt text |
| `ConceptVariationsPanel` | Pass Lab | A–D prompt tabs (text only) |
| `AssetGenerationPlaceholder` | Pass Lab | **Disabled** "GENERATE ASSETS" |
| `AssetLibrary` | Advanced Assets | Approve/reject/set final |
| `InfluenceLibraryPanel` | Advanced bottom | Read-only influence list |

#### Orphaned (file exists, not imported)

| Component | Era | Notes |
|-----------|-----|-------|
| `ArtDirectionCard` | Phase 6–8 | SVG art-direction cards |
| `ArtDirectionBoard` | Phase 6–8 | Wrapper → ComposedArtBoard |
| `ComposedArtBoard` | Phase 6–8 | SVG composition renderer |
| `ConceptMockPanel` | Phase 5 | Preset-driven mock summaries |
| `PassMockup` | Phase 6 | SVG pass mockups |
| `PresetWorkstationCard` | Phase 5 | Desk preset picker (removed Phase 9) |
| `WorkflowRoundIndicator` | Phase 7 | 3-round stepper — CSS exists, never mounted |

### 1.5 API Surface

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/ops/creative-lab` | GET | Index: modules, styles, presets, projects |
| `/api/ops/creative-lab/projects` | GET, POST | List / create |
| `/api/ops/creative-lab/projects/[id]` | GET, PUT, DELETE | Load / ops / delete |
| `/api/ops/creative-lab/projects/[id]/export` | POST | `exportPassPair`, `exportFinals`, `exportPackage` |
| `/api/ops/creative-lab/projects/[id]/reveal` | POST | Finder reveal |
| `/api/ops/creative-lab/projects/[id]/assets/[assetId]` | GET | Serve PNG |
| `/api/ops/creative-lab/presets` | GET, POST | List / save / duplicate |

### 1.6 Storage Map

Root: `RETROVERSE_DATA/creative_lab/`

```
creative_lab/
├── index.json                    ← project list
├── styles/{presetId}.json        ← 12 built-in + custom presets
├── illustration_library/         ← WIP backend only (no UI, no PNG pipeline)
└── projects/{folderSlug}/
    ├── project.json              ← canonical state
    ├── prompts/                  ← all prompts (.json + .txt)
    ├── concepts/                 ← variation set groupings
    ├── generated/{assetId}.png   ← OpenAI PNGs
    ├── generated/{id}.placeholder.json  ← legacy SVG path
    ├── selected/{assetId}.png    ← mirrored on approve/final
    ├── exports/{Name}.zip        ← project package
    ├── exports/finals/           ← final-front.png, final-back.png
    └── notes/README.txt
```

### 1.7 Project State Fields (UX-relevant)

| Field | UX meaning |
|-------|------------|
| `selectedConceptPromptId` / `selectedConceptKey` | Chosen front (not yet locked) |
| `frontLocked` | Front approved; backs allowed |
| `lockedFrontAssetId` / `lockedFrontPromptId` | Canonical locked front |
| `frontVariationSetId` / `backVariationSetId` | Current A–D batch |
| `selectedBackPromptId` / `selectedBackKey` | Chosen back |
| `selectedArtDirectionId` | Visual world (6 options) |
| `finalAssetSlots` | `final-front`, `final-back`, `final-poster`, `final-bumper` |
| `workflowRound` | **Ambiguous** — see §3 |
| `refinementGenerated` / `refinementVariations` / `selectedVariationIndex` | **Legacy** refinement path |
| `styleSelection` / `activePresetId` / `conceptStrategies` | **Legacy** prompt weighting |
| `artifactType` | VIP pass, festival pass, etc. — affects prompt context only |

### 1.8 Global Library Status (Phase 10 — not implemented)

| Library | Path | UI | Status |
|---------|------|-----|--------|
| Built-in presets | `styles/*.json` | Advanced → Presets | **Active** |
| Style catalog | `style-catalog.ts` | Advanced → Styles | **Active** (not used by desk PNG path) |
| Influence library | `influences.ts` | Advanced bottom panel | **Display only** |
| Visual worlds | `visual-worlds.ts` | Desk Step 2 | **Active** (drives `generatePasses`) |
| Illustration library | `illustration_library/` | None | **WIP** — seeded by tool; orphaned SVG components |
| Global asset library (`library/{generated,approved,final}/`) | — | None | **Not started** (Phase 10 spec only) |

---

## 2. Current Workflow Map

### 2.1 Live Path — Creative Desk (Phase 11)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER ACTION          → SCREEN           → STATE CHANGE        → STORAGE     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Edit event fields    → Desk Step 1      → local state only    → (on gen)    │
│ Pick visual world    → Desk Step 2      → selectedVisualWorld → (on gen)    │
│ GENERATE FRONTS      → Desk Step 3      → 4 front prompts     → generated/*.png │
│                      → ConceptDeck      → frontVariationSetId → prompts/, concepts/ │
│                      →                  → clears lock/back  → project.json │
│ USE THIS FRONT       → ConceptDeck      → selectedConcept*    → project.json │
│ LOCK FRONT           → ConceptDeck CTA  → frontLocked=true    → selected/{front}.png │
│                      →                  → workflowRound=2   → final-front slot │
│ GENERATE BACKS       → ConceptDeck CTA  → 4 back prompts    → generated/*-back-*.png │
│                      →                  → backVariationSet  → project.json │
│ USE THIS BACK        → ConceptDeck      → selectedBack*       → project.json │
│ EXPORT PACKAGE       → ConceptDeck CTA  → approve+final both  → exports/*.zip │
│                      →                  →                     → exports/finals/ │
│ Advanced Workshop →  → Nav to Projects  → panel=projects      → (no state)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**API ops (live path):** `generatePasses` → `setSelectedConcept` → `lockFront` → `generateBackPasses` → `setSelectedBack` → `exportPassPair`

### 2.2 Legacy Path — Advanced Pass Lab (still reachable)

```
generateConcept (legacy SVG placeholders)
  → setSelectedConcept
  → generateRefinementImages (8 PNG refinements)   ← NO UI TRIGGER
  → setSelectedVariation                          ← NO UI TRIGGER
  → approve/setFinal in Asset Library
```

**API ops exist; desk does not use them.** `generateRefinementImages` notice strings remain in workspace but no button calls them.

### 2.3 `workflowRound` Collision

Same field, two semantics:

| Round | Pass-pair (live) | Legacy (Advanced) |
|-------|------------------|-------------------|
| 1 | Front concepts exist | Concept pick |
| 2 | Front locked, backs pending | Refinement generation |
| 3 | Back selection / export | Variation pick |

Advanced Pass Lab displays `workflowRound` and `selectedVariationIndex` — **misleading** for desk projects.

### 2.4 Per-Action Workflow Audit

| Action | Where click? | What changes? | Where displayed? | Scroll? | Clear? |
|--------|--------------|---------------|------------------|---------|--------|
| Edit event | Desk Step 1 | Local state | Same fields | No | Yes |
| Pick world | Desk Step 2 | Local `selectedVisualWorldId` | Card highlight | **~800px down** | Yes |
| Generate fronts | Desk Step 3 | 4 PNGs, prompts | ConceptDeck below | **Must scroll** | Notice only |
| Select front | ConceptDeck | `selectedConcept*` | Card border | Below fold | Partial |
| Lock front | ConceptDeck CTA | `frontLocked`, approve | Locked preview replaces grid | **Must scroll** | Notice |
| Generate backs | ConceptDeck CTA | 4 back PNGs | Back grid appears | **Must scroll** | Notice |
| Select back | ConceptDeck | `selectedBack*` | Card border | Below fold | Partial |
| Export | ConceptDeck CTA | Finals + zip | Notice text only | Bottom of page | Weak |
| Approve asset | Advanced Assets | `status=approved` | Asset list | Different screen | No link to desk |
| Set final | Advanced Assets | `finalAssetSlots` | Asset list + toolbar | Different screen | Disconnected |
| Export package | Advanced toolbar | Zip | Notice | Different screen | Duplicate of desk export |
| Apply preset | Advanced Presets | `styleSelection` | None visible on desk | Different screen | **No effect on PNG path** |
| Legacy SVG concepts | Advanced Pass Lab | Placeholder JSON | ConceptVariationsPanel | Different screen | Confusing vs real PNGs |

---

## 3. Scroll Audit

### 3.1 Layout Model

| Surface | Layout | Scroll container |
|---------|--------|------------------|
| Creative Desk | `flex column`, `gap: 22px` | **Full page** — no inner scroll |
| Advanced Workshop | CSS grid sidebar + main | **Full page** — toolbar sticky only |
| ConceptDeck grid | 2-col (4-col refine modifier) | Part of page scroll |
| Visual world grid | `auto-fill minmax(280px)` | 6 cards ≈ 2 rows desktop |

**No sticky generate bar on desk.** Only Advanced has `position: sticky` on ProjectToolbar.

### 3.2 Estimated Section Heights (desktop ~900px viewport)

| Section | Est. height | Cumulative from top |
|---------|-------------|---------------------|
| Ops topbar + banner | ~80px | 80px |
| Desk masthead | ~90px | 170px |
| Step 1 — Event panel | ~200px | 370px |
| Step 2 — Visual worlds (6 cards, 2 rows) | ~520px | **890px** ← world picker at fold |
| Step 3 — Generate CTA | ~160px | **1050px** ← generate below fold |
| ConceptDeck header + 4 front cards (2×2) | ~1200px | **2250px** ← results far below action |
| Lock CTA | ~120px | 2370px |
| Locked front preview | ~400px | 2770px |
| Generate backs CTA | ~120px | 2890px |
| 4 back cards (2×2) | ~1200px | **4090px** |
| Export CTA | ~120px | 4210px |

**Total desk page at full workflow: ~4.5–5 viewport heights.**

### 3.3 Scroll Failure Points

| Failure | Description |
|---------|-------------|
| **Generate → see results** | User clicks GENERATE at ~1050px; 4 pass cards appear at ~2250px. **~1.3 viewports of scroll** with no auto-scroll or anchor. |
| **Lock → generate backs** | Lock CTA at ~2370px; backs appear at ~2890px+. User may not see backs without scrolling. |
| **World picker → generate** | Worlds at fold; generate button below worlds. User picks world, must scroll to find generate. |
| **Status notice** | `notice` banner at page top; user at bottom of ConceptDeck may miss "Front locked" / "Four backs generated". |
| **Desk ↔ Advanced** | Switching screens loses scroll position and workflow context entirely. |
| **Asset Library** | Real PNGs live on desk; approval happens in Advanced Assets — **different screen, no thumbnail browser**. |

### 3.4 Context Loss Points

1. **No persistent project bar on desk** — project name only implied after auto-create.
2. **No visible lock/selection state** when scrolled away from ConceptDeck cards.
3. **Advanced opens to Projects** — not Assets or current workflow phase.
4. **12 assets after full run** (4 front + 4 back + approved/final copies) — Asset Library is a text list, not visual browser.
5. **Three export buttons** (desk export, toolbar package, toolbar finals) — unclear which to use.

---

## 4. Redundancy Audit

### 4.1 Duplicated Workflows

| Duplication | Paths | Impact |
|-------------|-------|--------|
| **Front concept generation** | Desk `generatePasses` (PNG) vs Pass Lab `generateConcept` (SVG placeholder) | User can create two incompatible asset sets |
| **Concept display** | ConceptDeck (images) vs ConceptVariationsPanel (prompt text) | Same A–D, different surfaces |
| **Export** | Desk `exportPassPair` vs toolbar `exportPackage` vs `exportFinals` | Three exports, different validation |
| **Approve front** | `lockFront` (auto-approve) vs Asset Library Approve | Two paths to approved status |
| **Event metadata** | Desk fields vs Advanced Projects DL | Same data, two editors |
| **Style direction** | Visual worlds (desk) vs Presets (advanced) vs Style boards (advanced) | Only worlds affect live PNGs |

### 4.2 Dead Workflows

| Item | Evidence |
|------|----------|
| 8-variation refinement | API `generateRefinementImages` — no UI button since Phase 9 |
| `generateArtwork` op | Server no-op; workspace handler unwired |
| `AssetGenerationPlaceholder` | Button always disabled |
| `WorkflowRoundIndicator` | Component orphaned |
| SVG art-direction deck | 5 components orphaned |
| Desk preset picker | Removed Phase 9; `selectedPresetId` state lingers unused on desk |
| `onPresetSelect` | Defined in workspace, never passed to children |
| `mockVariationRound` | Deprecated field |

### 4.3 Hidden Workflows

| Workflow | How to reach | Problem |
|----------|--------------|---------|
| Asset approve/reject/final | Advanced → Assets | Not discoverable from desk |
| Preset apply | Advanced → Presets | No effect on desk PNGs — hidden irrelevance |
| Style board editing | Advanced → Styles | Same — legacy prompt path only |
| Finder reveal | Advanced toolbar | Power-user only |
| DELETE project | API only | No UI |

### 4.4 Confusing Workflows

| Workflow | Why confusing |
|----------|---------------|
| Pass Lab "Workflow state" DL | Shows `selectedVariationIndex` on desk projects where it's always null |
| Pass Lab "Generate legacy SVG concepts" | Adjacent to real PNG assets; creates placeholders |
| `workflowRound` label | Means different things in live vs legacy |
| Advanced Workshop entry | Footer link says "Advanced" but lands on Projects admin |
| Front select vs lock | Two steps; "selected" and "locked" not distinguished in UI chrome |

### 4.5 Obsolete Workflows

| Workflow | Superseded by |
|----------|---------------|
| Preset-first desk (Phase 5) | Visual world picker (Phase 9) |
| Art-direction SVG cards (Phase 6–8) | Real OpenAI PNGs (Phase 8–9) |
| 8-variation refinement (Phase 7–8) | Front lock + back generation (Phase 11) |
| Mock pass SVG (Phase 6) | ConceptDeck PNG cards |
| Illustration library composition | Not connected to generation pipeline |

---

## 5. Critical Questions

| Question | Can user tell today? | Why not |
|----------|---------------------|---------|
| What project is active? | **Partially** | Desk: no project name in chrome until concepts exist. Advanced: toolbar shows name. |
| What front is selected? | **Only if scrolled to card** | No persistent selection indicator |
| What front is locked? | **Only if scrolled to locked preview** | No global lock badge |
| What back is selected? | **Only if scrolled to back card** | Same |
| What is approved? | **No on desk** | Must open Advanced Assets |
| What is final? | **No on desk** | `finalAssetSlots` only in Asset Library header |
| Find generated assets quickly? | **No** | No thumbnail browser; 12 assets buried in text list |

---

## 6. Single-Workstation Proposal

### 6.1 Design Intent

**One screen. Three columns. Persistent top bar.**

Inspired by Bridge / Lightroom / FCP browser / Finder column view.

**NOT:** setup wizard, multi-page form, scrolling dashboard.

### 6.2 Proposed Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR (fixed)                                                              │
│ [Project: Sunday Nights VIP ▾]  [Generate Fronts] [Generate Backs] [Export]  │
│ Status: Front B selected · Locked ✓ · Back C selected · Ready to export      │
├────────────┬─────────────────────────────────────────────┬───────────────────┤
│ LEFT       │ CENTER — Asset Browser                      │ RIGHT — Inspector │
│ (~220px)   │                                             │ (~280px)          │
│            │  [Fronts] [Backs] [All] [Approved] [Final]  │                   │
│ Projects   │                                             │ Project metadata  │
│ ─────────  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐               │ Event, venue, date│
│ • Sunday   │  │ A  │ │ B* │ │ C  │ │ D  │  large thumbs │ Years, world      │
│ • June 14  │  └────┘ └────┘ └────┘ └────┘               │                   │
│            │                                             │ Selection         │
│ Collections│  (click thumb → inspector updates)          │ Front: B (locked) │
│ (future)   │                                             │ Back: C           │
│            │                                             │                   │
│ Library    │                                             │ Prompt (collapsed)│
│ (future)   │                                             │                   │
│            │                                             │ Actions           │
│            │                                             │ [Lock Front]      │
│            │                                             │ [Approve]         │
│            │                                             │ [Set Final]       │
│            │                                             │ [Export]          │
└────────────┴─────────────────────────────────────────────┴───────────────────┘
```

### 6.3 Column Responsibilities

| Column | Contents | Behavior |
|--------|----------|----------|
| **LEFT** | Project list, future collections/library | Column selection drives center filter |
| **CENTER** | Large thumbnail grid | Primary workspace; filter tabs; selection highlight |
| **RIGHT** | Inspector | Context for selected thumb: metadata, prompt, actions |
| **TOP** | Global actions + status strip | Always visible; disabled states when prerequisites missing |

### 6.4 Workflow on Single Screen

1. Select project (left) → center shows existing assets
2. Edit metadata (right inspector) → no navigation
3. **Generate Fronts** (top) → 4 thumbs appear in center Fronts tab → auto-select first or keep selection
4. Click thumb → inspector shows "Use as front" → **Lock Front** (top or inspector)
5. **Generate Backs** (top, enabled after lock) → 4 back thumbs appear
6. Click back thumb → select → **Export** (top)

**No scroll between action and result.** Center grid updates in place.

### 6.5 What Moves Off the Main Screen

| Current | Destination |
|---------|-------------|
| Style boards | Advanced → Styles (collapsed by default) |
| Preset gallery | Advanced → Presets |
| Legacy SVG concepts | Remove |
| Influence library | Advanced reference panel |
| Prompt preview (full) | Inspector collapsed section |
| Finder reveal / zip tools | Advanced → Project tools menu |
| Module placeholders (poster, etc.) | Remove from sidebar until built |

### 6.6 Status Strip (always visible)

```
Project: sunday-nights-june-14-2026-18 │ World: Music Television │ Front: B (locked) │ Back: C │ Finals: — / —
```

This alone solves *"I cannot tell what is happening."*

---

## 7. Recommended Migration Plan

### Phase 12a — Audit complete ✓
This document. No code changes.

### Phase 12b — Shell swap (low risk)
1. Replace `CreativeWorkstation` vertical stack with 3-column grid shell
2. Add fixed top bar with status strip (read-only first — wire to existing state)
3. Move project list from Advanced Projects → left column
4. Keep all existing API ops — rewire buttons to top bar

### Phase 12c — Asset browser (medium)
1. Extract thumbnail grid from ConceptDeck → center column
2. Filter tabs: Fronts / Backs / All / Approved / Final
3. Click thumb → right inspector (metadata + selection actions)
4. Remove ConceptDeck as separate scrolling section

### Phase 12d — Prune dead paths (medium)
1. Remove Pass Lab legacy generate button
2. Remove `AssetGenerationPlaceholder`
3. Remove orphaned components (7 files)
4. Delete dead CSS (~40% of creative-lab.css)
5. Deprecate API ops: `generateConcept`, `generateRefinementImages`, `generateArtwork`

### Phase 12e — Advanced collapse (low)
1. Advanced Workshop becomes overflow menu: Styles, Presets, Power tools
2. Default URL always `workstation` with project param
3. Remove `panel` param from primary navigation

### Phase 12f — Schema cleanup (higher risk, defer)
1. Remove `workflowRound` dual semantics — replace with explicit `passPhase: setup | fronts | locked | backs | ready`
2. Remove refinement fields from new projects
3. Unify approve/lock into single visible state

**Do not implement 12b–12f in this phase.**

---

## 8. Component Disposition

### KEEP (promote to main workstation)

| Component | Role in consolidated UI |
|-----------|------------------------|
| `CreativeLabWorkspace` | Root state + routing (simplified) |
| `ConceptDeck` → refactor | Thumbnail grid logic → center Asset Browser |
| `VisualWorldCard` | World picker → inspector or compact top dropdown |
| `YearTokenInput` | Inspector metadata |
| `AssetLibrary` → refactor | Filtering logic → center tabs + inspector actions |
| `ProjectToolbar` → refactor | Export/reveal → top bar overflow menu |
| `generatePasses` / `lockFront` / `generateBackPasses` / `exportPassPair` | Core API — unchanged |
| `pass-concept-prompt` / `pass-back-prompt` | Prompt engine — unchanged |
| Visual worlds (`visual-worlds.ts`) | Style direction — unchanged |

### REMOVE

| Component / Code | Reason |
|------------------|--------|
| `ArtDirectionCard` | Orphaned SVG path |
| `ArtDirectionBoard` | Orphaned |
| `ComposedArtBoard` | Orphaned |
| `ConceptMockPanel` | Orphaned |
| `PassMockup` | Orphaned |
| `PresetWorkstationCard` | Orphaned |
| `WorkflowRoundIndicator` | Orphaned |
| `AssetGenerationPlaceholder` | Disabled dead button |
| `generateConcept` UI + API | SVG placeholders superseded |
| `generateRefinementImages` API + state | No UI; superseded by Phase 11 |
| `generateArtwork` op | No-op |
| `advanceMockVariations` | Alias dead end |
| Desk CSS: `.cl-desk__preset-grid`, `.cl-desk__output-grid`, `.cl-art-deck__*`, `.cl-pass-mock__*` | Unused |
| `mockVariationRound` field | Deprecated |
| Module sidebar "soon" list | Noise until modules ship |

### MERGE

| A | B | Into |
|---|---|------|
| `CreativeWorkstation` | `ConceptDeck` | Single `WorkstationBrowser` (center + top) |
| `ConceptDeck` front/back grids | `AssetLibrary` list | Unified thumbnail browser with status filters |
| Desk event fields | Advanced Projects metadata DL | Right inspector metadata section |
| `exportPassPair` | `exportProjectPackage` / `exportFinals` | Single Export action with smart validation |
| `lockFront` + `approveAsset` | — | One "Lock & Approve Front" action |
| `selectedConcept*` + `lockedFront*` | — | Single front selection state visible in status strip |
| `ConceptVariationsPanel` | `PromptPreviewPanel` | Inspector → collapsed Prompt section |

### MOVE TO ADVANCED

| Component | Reason |
|-----------|--------|
| `StyleBoard` ×3 + `StyleWeightEditor` | Legacy prompt weighting; not used by PNG path |
| `PresetGallery` | Power-user style seeding |
| `InfluenceLibraryPanel` | Reference documentation |
| `PromptPreviewPanel` (full) | Debugging / prompt inspection |
| `ConceptVariationsPanel` | Prompt text tabs (if kept at all) |
| Artifact type picker | Marginal effect; VIP pass is default |
| Finder reveal buttons | Power-user file system access |
| `exportProjectPackage` (raw zip) | Archive/debug export |
| Style catalog / concept strategies | Legacy prompt renderer inputs |
| `illustration_library` tooling | Not connected to live pipeline |

---

## 9. API Op Disposition

| Op | Disposition |
|----|-------------|
| `generatePasses` | **KEEP** → top bar "Generate Fronts" |
| `setSelectedConcept` | **MERGE** into thumbnail click |
| `lockFront` | **KEEP** → top bar / inspector |
| `generateBackPasses` | **KEEP** → top bar "Generate Backs" |
| `setSelectedBack` | **MERGE** into thumbnail click |
| `exportPassPair` | **KEEP** → top bar "Export" |
| `approveAsset` / `rejectAsset` / `setFinalAsset` | **MERGE** into inspector actions |
| `exportPackage` / `exportFinals` | **MOVE TO ADVANCED** |
| `generateConcept` / `generateConceptVariations` | **REMOVE** |
| `generateRefinementImages` / `generateRefinementVariations` / `advanceMockVariations` | **REMOVE** |
| `setSelectedVariation` | **REMOVE** |
| `generateArtwork` | **REMOVE** |
| `saveProject` | **MOVE TO ADVANCED** (or auto-save) |

---

## 10. Success Criteria (for future implementation)

After consolidation, the user should:

1. Open Creative Lab → **immediately see** active project + asset thumbnails
2. Click Generate Fronts → **watch thumbs appear** in center without scrolling
3. See **status strip update** at every step (selected → locked → backs → export)
4. Never wonder which of three export buttons to use
5. Never land in Advanced unless they chose power tools
6. Complete pass pair in **one screen**, ~zero page scroll

---

## Appendix A — File Reference

| Path | Status |
|------|--------|
| `components/ops/creative-lab/CreativeLabWorkspace.tsx` | Active root |
| `components/ops/creative-lab/CreativeWorkstation.tsx` | Active desk |
| `components/ops/creative-lab/ConceptDeck.tsx` | Active Phase 11 |
| `components/ops/creative-lab/AdvancedWorkshop.tsx` | Active advanced |
| `lib/ops/creative-lab/projects.ts` | All generation ops |
| `lib/ops/creative-lab/types.ts` | Schema |
| `lib/ops/creative-lab/workspace/urls.ts` | Panel routing |
| `app/ops/creative-lab/creative-lab.css` | Styles (bloated) |

## Appendix B — Related Reports

| Report | Status |
|--------|--------|
| `usability-audit-v2.md` | **Stale** — Phase 5 preset desk |
| `phase11-front-back-verification.md` | Current backend verification |
| Phase 10 global library spec | **Not implemented** |

---

*End of audit. Implementation deferred to Phase 12b+.*
