# Sprint 3.36 — Art Director

**Objective:** Define exactly how every experience should LOOK — before any illustration is generated.

**Scope:** Director storytelling pipeline + workspace UI only. Collector, Editor, Retrograph, Discovery system, Experience Designer, Creative Review, and Publisher unchanged.

**Verification song:** RVTR001341 — Dr. Hook, *When You're In Love With A Beautiful Woman* (1978)

---

## Pipeline Change

| Before (3.35) | After (3.36) |
|---|---|
| Experience Designer → Visual Concepts → Pages | Experience Designer → **Art Director** → Pages |

**Orchestrator:** `lib/ops/studio/director/storytelling/run-pipeline.ts`

```
designExperienceConcepts
designVisualConcepts
designArtDirectionBriefs        ← per-story look briefs
designPageArtDirections         ← per-page creative boards
buildPagesFromExhibits
enforceSequenceVariety + enforceExperienceVariety
buildArtDirectionConsistency + buildArtDirectionOverview
```

**Story plan version:** `5`

---

## Art Director Modules

| File | Purpose |
|---|---|
| `visual-language-library.ts` | Reusable vocabulary: cameras, lighting, textures, layouts, motion, emotional tones + icons |
| `era-styling.ts` | Era-aware typography, materials, palettes, motion (1970s profile for 1978) |
| `design-art-direction.ts` | Per-story Art Direction Briefs + page creative boards |
| `art-direction-audit.ts` | Visual consistency report + Art Direction Overview |

---

## Art Direction Brief Structure

Each non-skipped story receives:

- Visual Identity · Primary Environment · Camera · Lighting
- Color Palette · Textures · Motion · Layout Style
- Primary Focus · Supporting Elements
- Emotional Goal · Emotional Tone
- Era year + era notes
- **Opening beat** — cinematic description (not an image prompt)

### RVTR001341 — Recording Story (actual output)

```
Visual Identity: 1978 recording studio
Environment: Muscle Shoals hallway
Camera: Tracking · Lighting: Studio tungsten
Palette: Amber · Brown · Cream · Muted black
Textures: Film grain · Paper · Tape · Vinyl
Motion: Slow pan · Layout: Film storyboard
Focus: Bathroom door
Supporting: Studio clock · Coffee cup · Handwritten lyric sheet
Emotional Goal: "This almost never happened."

Opening beat:
It opens with a dimly lit Muscle Shoals hallway. Warm tungsten lighting.
Camera follows a producer walking away while handwritten lyrics fade in on cream paper.
```

---

## Visual Language Library

### Camera (9)
Static · Push-in · Pull-back · Overhead · Handheld · Tracking · Close-up · Wide · Split screen

### Lighting (8)
Golden hour · Studio tungsten · Concert spotlight · Television · Neon · Daylight · Museum · Night

### Texture (10)
Film grain · Newsprint · Gloss magazine · Vinyl · Paper · Tape · Polaroid · Blueprint · Wood · CRT

### Layout (12)
Magazine · Poster · Museum panel · Album sleeve · Trading card · Film storyboard · TV guide · Billboard · Record sleeve · Scrapbook · Infographic · Concert flyer

### Motion (11)
Slow pan · Parallax · Zoom · Fade · Cross dissolve · Flip · Timeline growth · Map travel · Photo scatter · Record spin · Pulse

### Emotional Tone (11)
Wonder · Excitement · Curiosity · Suspense · Reflection · Celebration · Mystery · Humor · Triumph · Melancholy · Hope

---

## Era Styling Rules

**File:** `era-styling.ts`

For **1978** (`resolveEraProfile(1978)`):

| Dimension | 1970s profile |
|---|---|
| Typography | Cooper Black headlines, Helvetica body, hand-lettered album titles |
| Print | Offset lithography — warm ink on cream stock |
| Photography | Soft film grain, tungsten warmth, slightly faded color |
| Materials | Vinyl, cassette tape, newsprint, gloss album sleeve |
| Graphic trends | Earth tones, rounded typography, album-centric layouts, Billboard chart graphics |
| Default palette | Amber, Brown, Cream, Avocado, Rust |
| Motion | Ken Burns drift, slow cross dissolve, record spin, gentle push-in |
| Authenticity | Late-70s pop — Muscle Shoals warmth, AM radio era, pre-MTV |

Era notes are appended to every brief. Opening beats reference decade-appropriate materials — never generic AI fantasy gloss.

---

## Visual Consistency Audit

**File:** `art-direction-audit.ts`

Tracks repeated palettes, layouts, cameras, textures, motions, emotional tones.

RVTR001341 consistency score: **70/100**

| Metric | Result |
|---|---|
| Unique visual identities | 10 / 10 stories |
| Camera variety | 8 distinct (Push-in, Close-up, Tracking, Overhead, Static, Wide, Handheld, Pull-back) |
| Motion variety | 9 distinct |
| Warnings | Pull-back ×2, Timeline growth ×2, one shared palette combo |

All identities are unique; warnings flag near-duplicates for operator review, not blocking issues.

---

## Workspace UI

**When `storyPlan.version >= 5`:**

1. **Art Direction** (after Experience Concepts) — full brief cards with palette chips, opening beat, era notes
2. **Art Direction Overview** — cameras, motion, era authenticity, texture balance, color diversity, emotional pacing
3. **Preview Wall 2.0** — creative boards with palette chips, camera/motion icons, layout type, texture, mood, priority

---

## RVTR001341 Verification

| Criterion | Result |
|---|---|
| Every experience has Art Direction Brief | ✓ 10 briefs |
| Unique visual identity per story | ✓ 10 distinct identities |
| Camera angles vary | ✓ 8 camera types across storyboard |
| Layouts vary | ✓ Poster, Magazine, Film storyboard, Billboard, Record sleeve, etc. |
| Motion varies | ✓ 9 motion styles |
| Era styling appropriate | ✓ 1978 / 1970s notes on all briefs |
| Emotional pacing changes | ✓ Wonder → Curiosity → Suspense → Excitement → Triumph → Celebration → Reflection → Hope |
| Typecheck | ✓ pass |
| Experience Designer untouched | ✓ no edits to design-experiences.ts or design-visual-concepts.ts |

### Art Direction inventory (10 briefs)

| Story | Visual Identity | Camera | Layout | Tone |
|---|---|---|---|---|
| Hero | Album premiere poster | Push-in | Poster | Wonder |
| Introduction | Documentary cold open | Close-up | Magazine | Curiosity |
| Recording Story | 1978 recording studio | Tracking | Film storyboard | Suspense |
| Album Story | Collector's desk | Overhead | Record sleeve | Reflection |
| Chart Journey | Billboard office | Static | Billboard | Excitement |
| Artist Journey | Band documentary archive | Wide | Scrapbook | Reflection |
| Performance History | Concert memory wall | Handheld | Concert flyer | Celebration |
| Song DNA | Scientific music lab | Pull-back | Infographic | Wonder |
| Cultural Impact | International magazine spread | Overhead | Magazine | Triumph |
| Legacy | Museum timeline | Pull-back | Museum panel | Hope |

### Remaining creative opportunities

| Gap | Detail |
|---|---|
| Recording Story illustration | Brief specifies illustrated hallway — awaits Publisher art generation |
| Artist Journey | Brief exists; 0 pages in sequence |
| Shared palette combo | Cream+Muted black+Sepia appears twice — minor consistency flag |
| Pull-back / Timeline growth | Used twice each — acceptable but noted in audit |

---

## Files Created

| File | Purpose |
|---|---|
| `visual-language-library.ts` | Visual vocabulary constants |
| `era-styling.ts` | Decade-aware styling profiles |
| `design-art-direction.ts` | Art Director briefs + page creative boards |
| `art-direction-audit.ts` | Consistency audit + overview |

## Files Modified

| File | Change |
|---|---|
| `types.ts` | v5: art direction types |
| `run-pipeline.ts` | Art Director stage |
| `build-operator-view.ts` | Art direction consistency warnings |
| `pages-to-experience-plan.ts` | `storytelling-3.36` |
| `workspace/types.ts` | Creative board fields on PreviewCard |
| `load-director-workspace.ts` | Enrich previews from pageArtDirections |
| `DirectorWorkspaceView.tsx` | Art Direction, Overview, Preview Wall 2.0 |
| `director-workspace.css` | Art direction + creative board styles |

---

## Implementation Report

| Section | Content |
|---|---|
| Files Created | 4 art director modules |
| Files Modified | 8 pipeline + UI files |
| Behavior Changes | Director defines visual language before pages; Preview Wall shows creative boards |
| Runtime Verification | RVTR001341 regen — Director ✓, 10 briefs, consistency 70/100 |
| Typecheck | Pass |
| Technical Debt Removed | Look direction separated from experience concept and page template |
| Ready for Next Phase | Yes |

**Execution State: COMPLETE**
