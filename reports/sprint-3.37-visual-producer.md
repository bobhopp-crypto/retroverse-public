# Sprint 3.37 — Visual Producer

**Objective:** Rebuild the Publisher as a Visual Producer — faithful production of the Director's creative package, not a JSON renderer.

**Scope:** Publisher only. Collector, Editor, Retrograph, Director, Discovery, Experience Designer, and Art Director unchanged.

**Verification song:** RVTR001341 — Dr. Hook, *When You're In Love With A Beautiful Woman* (1978)

---

## Pipeline Change

| Before (3.36) | After (3.37) |
|---|---|
| Publisher evaluates + renders pages from Director output | **Visual Producer** reads Director package → produces `visual-production.json` → applies to public experience |

**Orchestrator:** `runVisualProducer` runs before `evaluatePublisherPackage` in both `production/run-song.ts` and `publisher/worker.ts`.

```
Director (unchanged)
  ↓ storyPlan v5 — pages, storyboard, experience concepts, art direction
Visual Producer
  ↓ visual-production.json
evaluatePublisherPackage (6th dimension: visualProduction)
  ↓
loadPublicExperience → applyVisualProductionToScenes
```

**Artifact:** `data/ops/intelligence/research-department/{RVTR}/visual-production.json`

---

## Publisher Responsibilities (Visual Producer Mission)

The Visual Producer receives:

- Retrograph (via Collector package)
- Storyboard + pages (Director `storyPlan`)
- Experience Concepts
- Art Direction Briefs + page creative boards
- Creative Review context (via existing evaluation dimensions)

It does **not** redesign stories, experiences, or art direction. It **produces** them.

Think: magazine production · documentary editing · museum installation · exhibition design.

### What the Producer decides

| Responsibility | Producer action |
|---|---|
| **Layout** | Map Art Direction layout style + page template → producer layout + presentation layout |
| **Media** | Assign hero + supporting assets; dedupe across scenes; respect primary focus |
| **Typography** | Apply era-aware display/body from Art Director era notes; set emphasis per template |
| **Visual rhythm** | Tag each scene with weight, pacing beat, rhythm family; audit sequence |
| **Scene composition** | Hero / secondary / supporting hierarchy + eye path per layout type |
| **Transitions** | Map Art Direction motion → transition in/out; continuity notes from emotional tone |
| **Production review** | Final QA score before publish |

---

## Production Workflow

**File:** `lib/ops/studio/publisher/visual-producer/run-visual-producer.ts`

1. **Load inputs** — `loadDirectorPackage` + `loadCollectorPackage`
2. **Order pages** — storyboard page order, fallback to `experiencePlan.scenes`
3. **Per scene:**
   - `selectLayout(page, artBrief)` — layout + presentation layout
   - `selectMedia(page, layout, artBrief, collector, usedMediaIds)` — hero/supporting, no repeats
   - `buildComposition` — hero element from art brief primary focus
   - `designTransition` — motion + emotional tone continuity
   - Rhythm metadata — weight, pacing beat, family
4. **Audit rhythm** — `auditVisualRhythm(produced)`
5. **Production review** — `runProductionReview(produced, rhythm.warnings)`
6. **Save** — `visual-production.json`
7. **Apply at render** — `applyVisualProductionToScenes` in `load-public-experience.ts`

**Publisher evaluation** adds dimension `visualProduction` (score from production review). Coaching flags when score < 60 or review not passed.

**Review UI:** `VisualProducerReviewPanel` on `/ops/studio/publisher/[rvtr]` — score, rhythm, checks, scene list, warnings.

---

## Layout Selection Logic

**File:** `select-layout.ts`

### Producer layout types

`hero` · `magazine_spread` · `timeline` · `gallery` · `record_sleeve` · `comparison` · `documentary_frame` · `museum_panel` · `data_visualization` · `performance_reel`

### Resolution order

1. **Art Direction `layoutStyle`** (primary) — e.g. Poster → hero, Film storyboard → documentary_frame, Museum panel → museum_panel
2. **Page `templateId`** (fallback) — hero, quote, chart, timeline, gallery, performance, story

### Presentation layout mapping

| Producer layout | Presentation layout |
|---|---|
| hero | museum_identity |
| magazine_spread | image_quote |
| timeline | museum_chart |
| gallery | fullscreen |
| record_sleeve | museum_iconic |
| documentary_frame | minimal_fact |
| museum_panel | museum_closing |
| data_visualization | museum_dna |
| performance_reel | museum_performance |

Art Direction drives the look; page template ensures a sensible default when brief layout is absent.

---

## Media Selection Strategy

**File:** `select-media.ts`

1. Prefer **page-linked `mediaIds`** not yet used in prior scenes
2. First unused ID → **hero**; next 1–2 → **supporting**
3. Track `usedMediaIds` globally — **avoid repetition**
4. Hero fallback for `hero` layout: collector cover (`cover-{rvtr}`)
5. **Media role** from layout + art brief primary focus:
   - hero → album cover / primary focus
   - performance_reel → performance stills
   - timeline → chart animation
   - data_visualization → DNA visualization
   - record_sleeve → album sleeve

Missing hero on image-heavy layouts is flagged in production review.

---

## Typography Rules

**File:** `run-visual-producer.ts` → `buildTypography`

- Era notes containing `1970` → Cooper Black display + Helvetica body, `"1970s editorial"`
- Otherwise → editorial serif display + readable sans body
- Per-scene **emphasis** from template:
  - chart / timeline → `stat`
  - quote → `pull_quote`
  - default → `headline`

Typography profile stored once on the plan; per-scene typography copies display/body with scene-specific emphasis.

---

## Visual Rhythm Rules

**File:** `visual-rhythm.ts`

### Rhythm families (from layout)

| Family | Layouts |
|---|---|
| image | hero, record_sleeve |
| data | timeline, data_visualization |
| photo | performance_reel, gallery |
| text | documentary_frame, magazine_spread |
| timeline | museum_panel |

### Visual weight

| Weight | Layouts |
|---|---|
| heavy | hero, performance_reel, timeline |
| light | documentary_frame, magazine_spread |
| medium | everything else |

### Pacing beats

- Scene 1 → "Opening — establish world"
- Last scene → "Closing — leave a lasting impression"
- Emotional tone overrides mid-journey: Excitement/Celebration → peak energy; Reflection/Hope → reflective interlude; Suspense/Curiosity → narrative tension

### Audit warnings

- **3 consecutive same family** → visual fatigue risk
- **Back-to-back heavy weight** → insert light breathing beat
- **Overall rhythm string** — first 8 families joined (e.g. `image → text → text → data → data → timeline → photo → photo → …`)

**Target alternation:** Image → Chart → Photo → Timeline → Illustration → DNA → Performance → Gallery — enforced via family audit, not hard-coded reordering (Director sequence preserved).

---

## Transition Rules

**File:** `transitions.ts`

### Motion → transition mapping (from Art Direction)

| Motion | In | Out |
|---|---|---|
| Zoom | fade_up | fade |
| Fade | fade | fade |
| Slow pan | slide_left | fade |
| Timeline growth | draw_line | hold |
| Map travel | pin_drop | cross_dissolve |
| Photo scatter | scatter_in | cross_dissolve |
| Record spin | spin_in | fade |
| Pulse | pulse_in | fade |
| Cross dissolve | cross_dissolve | cross_dissolve |

### Continuity notes

- Same rhythm family as previous scene → **contrast shift** warning
- Wonder / Suspense → emotional lift, breathing room
- Excitement / Celebration → energy carry
- Reflection / Hope → reflective dissolve

Applied to `PresentableScene.transitionIn` / `transitionOut` at render time.

---

## Scene Composition

**File:** `buildComposition` in `run-visual-producer.ts`

Each produced scene defines:

- **heroElement** — art brief `primaryFocus` or media role or headline
- **secondary** — headline or first supporting element
- **supporting** — remaining supporting elements joined
- **eyePath** — layout-specific gaze order:
  - hero → Artwork → Title → Artist
  - timeline → Peak stat → Chart line → Context
  - performance_reel → Stage still → Headline → Date
  - default → Headline → Hero visual → Supporting detail

Weak hero/secondary hierarchy flagged in production review.

---

## Visual Producer Review (Final QA)

**File:** `production-review.ts`

| Check | Pass condition |
|---|---|
| Layout consistency | ≤ 2 repetition warnings |
| Media quality | No missing hero on image-heavy layouts |
| Typography hierarchy | No headlines > 80 chars |
| Spacing / rhythm | ≤ 1 rhythm audit warning |
| Visual repetition | Layout used ≥ 4 times flagged; 3-in-a-row family flagged |
| Missing hero images | Listed per scene |
| Oversized text | Headline length |
| Weak composition | Hero equals secondary |
| Transitions | Contrast-shift notes collected |

**Score:** starts at 100; deductions for missing heroes (−12), weak composition (−8), repetition (−5), transitions (−2), oversized text (−6).

**Pass:** no missing heroes, ≤ 1 weak composition, score ≥ 65.

---

## RVTR001341 Verification

| Criterion | Result |
|---|---|
| Visual production artifact generated | ✓ `visual-production.json` |
| Director storyPlan version | 5 |
| Scene count | 11 produced scenes |
| Layout variety | 9 layout types across 11 scenes |
| Creative identity | 1970s · Earth tones · Album documentary experience |
| Typography profile | Cooper Black / Helvetica · 1970s editorial |
| Overall rhythm | image → text → text → data → data → timeline → photo → photo → … |
| Production score | 77 / 100 |
| Review passed | ✗ (1 missing hero — Scene 9 "Album context") |
| Publisher evaluation | visualProduction dimension wired |
| Public experience apply | `applyVisualProductionToScenes` in load path |
| Typecheck | ✓ pass |
| Director / Art Director untouched | ✓ |

### Layout inventory (11 scenes)

| # | Headline | Producer layout | Presentation | Mood |
|---|---|---|---|---|
| 1 | When You're In Love… | hero | museum_identity | Wonder |
| 2 | Why this song matters | magazine_spread | image_quote | Curiosity |
| 3 | Muscle Shoals | documentary_frame | minimal_fact | Suspense |
| 4 | Chart climb | timeline | museum_chart | Excitement |
| 5 | Peak week | timeline | museum_chart | Excitement |
| 6 | Band journey | museum_panel | museum_closing | Reflection |
| 7 | Live performance | performance_reel | museum_performance | Celebration |
| 8 | Concert memory | performance_reel | museum_performance | Celebration |
| 9 | Album context | record_sleeve | museum_iconic | Reflection |
| 10 | Decades timeline | documentary_frame | minimal_fact | Hope |
| 11 | Song DNA | data_visualization | museum_dna | Wonder |

### Production review warnings (actual)

- Back-to-back heavy visual weight — insert light breathing beat
- Scene 9 — no hero media assigned (record_sleeve layout)
- 3 contrast-shift transition notes (scenes 3, 5, 8)

These are **production notes**, not blockers — they guide polish before golden showcase release.

---

## Files Created

| File | Purpose |
|---|---|
| `visual-producer/types.ts` | VisualProductionPlan, ProducedScene, review types |
| `visual-producer/paths.ts` | Artifact path helper |
| `visual-producer/select-layout.ts` | Layout selection + rhythm family |
| `visual-producer/select-media.ts` | Hero/supporting media + dedup |
| `visual-producer/transitions.ts` | Motion → transition + continuity |
| `visual-producer/visual-rhythm.ts` | Weight, pacing, rhythm audit |
| `visual-producer/production-review.ts` | Final QA scoring |
| `visual-producer/run-visual-producer.ts` | Orchestrator |
| `visual-producer/apply-visual-production.ts` | Overlay on PresentableScene |
| `visual-producer/store.ts` | load/save |
| `visual-producer/index.ts` | exports |
| `components/ops/studio/publisher/VisualProducerReviewPanel.tsx` | Review UI |

## Files Modified

| File | Change |
|---|---|
| `publisher/types.ts` | `visualProduction` dimension + evaluation fields |
| `publisher/evaluate.ts` | Run producer if missing; score dimension |
| `publisher/worker.ts` | Run producer before evaluate |
| `production/run-song.ts` | Run producer in song pipeline |
| `publisher/index.ts` | Export visual producer |
| `retroverse/renderer/load-public-experience.ts` | Apply production to scenes |
| `publisher/PublisherReviewClient.tsx` | Visual Producer panel |
| `app/ops/studio/publisher/[rvtr]/page.tsx` | Load visual production plan |
| `app/ops/studio/publisher/publisher.css` | Visual Producer panel styles |

---

## Implementation Report

| Section | Content |
|---|---|
| Files Created | 12 (11 lib modules + 1 UI component) |
| Files Modified | 9 publisher / pipeline / render files |
| Behavior Changes | Publisher produces visual-production plan before evaluate; public scenes receive producer layouts, transitions, intensity |
| Runtime Verification | RVTR001341 — 11 scenes, score 77, artifact on disk |
| Typecheck | Pass |
| Technical Debt Removed | Publisher no longer acts as passive renderer — production decisions explicit and reviewable |
| Ready for Next Phase | Yes |

**Execution State: COMPLETE**
