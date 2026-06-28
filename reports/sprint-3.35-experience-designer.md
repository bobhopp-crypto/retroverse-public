# Sprint 3.35 — Experience Designer

**Objective:** Teach the Director to imagine how each story should be *experienced* — creative direction before pages or image generation.

**Scope:** Director storytelling pipeline + workspace UI only. Collector, Editor, Retrograph, Discovery system, Creative Review, and Publisher unchanged.

**Verification song:** RVTR001341 — Dr. Hook, *When You're In Love With A Beautiful Woman*

---

## Pipeline Change

| Before (3.34) | After (3.35) |
|---|---|
| Discoveries → Stories → Exhibits → Pages | Discoveries → Stories → **Experience Designer** → **Visual Concepts** → Pages |

**Orchestrator:** `lib/ops/studio/director/storytelling/run-pipeline.ts`

```
discoverInteresting → rankDiscoveries → opportunities → discoverStories
designExperienceConcepts(stories)          ← per-story creative direction
designExhibits
designVisualConcepts(concepts, exhibits)   ← per-page wireframe direction
buildPagesFromExhibits(..., visualConcepts)
enforceSequenceVariety
enforceExperienceVariety                   ← cap repeated types, no plain text
buildExperienceVarietyAudit
```

**Story plan version:** `4`

---

## Experience Designer

**File:** `lib/ops/studio/director/storytelling/design-experiences.ts`

One **experience concept** per non-skipped story. Each concept includes:

| Field | Purpose |
|---|---|
| `conceptTitle` | Creative name (e.g. "Cinematic Reconstruction") |
| `experienceType` | Palette type (15 options) |
| `mood` | Emotional tone |
| `primaryMedia` / `supportingMedia` | Visual recommendations (not prompts) |
| `animation` | Motion direction |
| `narration` | Voiceover line — discovery-aware |
| `visualPriority` | 1–5 stars (boosted by linked discoveries) |
| `visualVocabulary` | Primary/supporting visual, background, motion, typography, iconography, density, desired reaction |

### Experience palette (15 types)

Cinematic Opening · Magazine Spread · Documentary · Timeline · Gallery · Infographic · Collector Card · Record Sleeve · Map · Performance Reel · Comparison · Before/After · Quote Focus · Motion Graphic · Data Visualization

### Story blueprints (RVTR001341)

| Story | Concept | Type | Mood | Priority |
|---|---|---|---|---|
| Hero | Cinematic Opening | cinematic_opening | Grand | ★★★★★ |
| Introduction | Documentary Hook | documentary | Intimate | ★★★★★ |
| Recording Story | Cinematic Reconstruction | documentary | Intimate | ★★★★★ |
| Album Story | Collector's Record Sleeve | record_sleeve | Nostalgic | ★★★★★ |
| Chart Journey | Animated Timeline | timeline | Momentum | ★★★★★ |
| Artist Journey | Career Documentary | documentary | Reflective | ★★★ |
| Performance History | Concert Memory Wall | performance_reel | Energetic | ★★★★★ |
| Song DNA | Music Fingerprint | data_visualization | Analytical | ★★★★ |
| Cultural Impact | World Map Spread | map | Expansive | ★★★★ |
| Legacy | Decades Timeline | timeline | Reflective | ★★★★ |

Discovery-linked narration example (Introduction + Recording Story):

> *"This hit almost never happened — conceived in a restroom conversation."*

---

## Visual Concepts

**File:** `lib/ops/studio/director/storytelling/design-visual-concepts.ts`

One wireframe concept per exhibit (page slot):

| Exhibit | Wireframe | Template |
|---|---|---|
| Hero | 🎬 Hero | hero |
| Introduction | 💬 Hook | quote |
| Recording session | 🎙 Studio | quote/gallery |
| Chart peak | 📈 Chart | chart |
| International | 🌍 World Map | quote |
| Official video | 🎬 Official Video | performance |
| Live moments | 🎤 Live | gallery |
| Album | 📀 Album | gallery |
| Song DNA | 🧬 DNA | gallery |
| Legacy timeline | 🏆 Timeline | timeline |

Pages inherit `templateId` from visual concepts — **never plain `story` text**.

---

## Variety Rules

**File:** `lib/ops/studio/director/storytelling/enforce-experience-variety.ts`

| Rule | Limit | Fallback |
|---|---|---|
| Timeline | max 2 | quote |
| Gallery | max 2 | performance |
| Documentary / quote | max 2 each | gallery / chart |
| Infographic | max 2 | timeline |
| Plain text | 0 | upgraded to quote |
| Consecutive same family | break runs | alternate template |

**Audit file:** `experience-variety-audit.ts` — variety score, visual/motion type counts, media balance, scroll-stop verdicts.

---

## Workspace UI

**When `storyPlan.version >= 4`:**

1. **Experience Concepts** — creative direction cards (after Story Construction)
2. **Experience Variety** — score, type counts, warnings, scroll-stop moments
3. **Preview Wall** — wireframe cards with emoji, mood, priority stars (replaces identical brown cards)

---

## RVTR001341 Verification

| Criterion | Result |
|---|---|
| Every story has experience concept | ✓ 10 concepts (all non-skipped stories) |
| Every page distinct visual treatment | ✓ 11 pages: hero, quote, gallery, chart, performance, timeline — **0 `story` templates** |
| No plain text default | ✓ `pickTemplate` fallback changed to `quote`; enforcement upgrades any stragglers |
| Variety score | **76/100** (up from undifferentiated brown-card era) |
| Preview Wall visually diverse | ✓ wireframe icons per page type |
| Typecheck | ✓ `npx tsc --noEmit` pass |

### Experience variety report (actual)

```
Variety score: 76/100

Visual types used:
  Cinematic Opening 1 · Quote Focus 1 · Documentary 1 · Infographic 1
  Map 2 · Performance Reel 2 · Record Sleeve 1 · Timeline 1 · Data Visualization 1

Media balance: photo 3 · video 1 · chart 2 · text 2 · illustration 3

Text-heavy warnings: 0
Repeated layouts: 0

Strong scroll-stop moments:
  • Hero — owned cover art
  • Introduction — Documentary Hook
  • Recording Story — Cinematic Reconstruction
  • Chart Journey — Animated Timeline
  • Performance History — Concert Memory Wall
```

### Remaining creative opportunities

| Gap | Detail |
|---|---|
| Recording Story illustration | Concept calls for illustrated studio scene — no generated art yet (Publisher) |
| Artist Journey | Experience concept exists but 0 pages built |
| Documentary cap | 3rd+ documentary exhibit downgraded to gallery — intentional variety tradeoff |
| Legacy second page | `lasting_significance` exhibit designed but not in final 11-page sequence |

---

## Files Created

| File | Purpose |
|---|---|
| `design-experiences.ts` | Experience Designer — per-story creative direction |
| `design-visual-concepts.ts` | Per-exhibit wireframe concepts |
| `enforce-experience-variety.ts` | Variety caps + contrast enforcement |
| `experience-variety-audit.ts` | Experience Variety audit section |

## Files Modified

| File | Change |
|---|---|
| `types.ts` | v4 types: experience concepts, visual concepts, variety audit |
| `run-pipeline.ts` | Experience Designer stage in orchestration |
| `build-pages.ts` | Pages driven by visual concepts; no plain-text fallback |
| `build-operator-view.ts` | Weaknesses include variety score + text-heavy warnings |
| `pages-to-experience-plan.ts` | `storytelling-3.35` |
| `workspace/types.ts` | Wireframe fields on PreviewCard |
| `load-director-workspace.ts` | Enrich previews from visual concepts |
| `DirectorWorkspaceView.tsx` | Experience Concepts, Experience Variety, wireframe Preview Wall |
| `director-workspace.css` | Experience + wireframe styles |

---

## Implementation Report

| Section | Content |
|---|---|
| Files Created | 4 experience designer modules |
| Files Modified | 9 pipeline + UI files |
| Behavior Changes | Director produces creative direction before pages; Preview Wall shows wireframes; no plain-text page defaults |
| Runtime Verification | RVTR001341 regen — Director ✓ 63ms, variety 76/100 |
| Typecheck | Pass |
| Technical Debt Removed | Template picking decoupled from fact-shape heuristics — experience concepts drive treatment |
| Ready for Next Phase | Yes |

**Execution State: COMPLETE**
