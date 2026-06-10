# Creative Lab — Phase 9 Art Direction Overhaul

**Date:** 2026-06-08  
**Goal:** Transform Creative Lab from style-tag metadata editor → art-direction-first pass machine with real OpenAI-generated artwork.

---

## Executive Summary

Phase 9 replaces the four-step configuration desk (output → event → preset → artifact) with a **three-step art director workflow**:

1. **Confirm event** — Sunday Nights · The Main Pub · June 14, 2026 · 1971 · 1982 · 2000  
2. **Choose one visual world** — six structured presets  
3. **GENERATE PASSES** — four real illustrated PNG concepts via OpenAI `gpt-image-2`

Round 2 generates **eight real variation images** (not SVG mockups) after concept selection.

Power-user controls moved to **Advanced Workshop** only.

---

## Before vs After

| Dimension | Before (Phase 8) | After (Phase 9) |
|-----------|------------------|-----------------|
| Main desk steps | 4 (Output, Event, Preset, Artifact) | 3 (Event, Visual World, Generate) |
| Concept output | SVG art-direction boards | **Real PNG pass images** |
| Visual worlds | 4 directions mapped to A–D keys | **6 art-directed worlds**, user picks ONE |
| Prompt style | Style tags + metadata JSON | **Illustrator brief** (`pass-concept-prompt.ts`) |
| Round 2 | 8 SVG refinement boards + separate GENERATE ARTWORK | **8 real images** in one step |
| Artifact type | Main desk Step 4 | Advanced Workshop only |
| Style weights | Main desk expandable | Advanced Workshop → Styles |
| Prompt viewer | Concept deck | Advanced Workshop → Pass Lab |
| Collectibility scores | On art direction cards | Removed from main flow |

---

## New Visual Worlds (Structured Presets)

Stored in `lib/ops/creative-lab/visual-worlds.ts`:

| World | Typography | Border | Color |
|-------|------------|--------|-------|
| Psychedelic Festival | Swash serif, groovy hand lettering | Ornate paisley frame | Hot orange, gold, crimson on cream |
| Saturday Morning Cartoon | Bold cartoon caps, chunky outline | Thick ink frame, halftone corners | Flat teal, orange, yellow primaries |
| Vintage Television | Broadcast serif, network caps | TV bezel, gold laminate | Navy studio, gold accents |
| Collector Memorabilia | Editorial serif, engraved numbering | Trading-card frame, foil corners | Warm tan, gold foil, archival cream |
| Rock Poster | Stacked block poster type | Screen-print edge, torn margin | High-contrast ink, limited palette |
| Retro Disney Adventure | Storybook serif, whimsical lettering | Scroll border, sparkle corners | Sky blue, warm gold, storybook cream |

Each preset includes: title, hero preview, description, visual references, typography style, border style, color treatment, palette.

---

## Concept Prompt Builder

New file: `lib/ops/creative-lab/pass-concept-prompt.ts`

Prompts read like instructions to an illustrator:

- Exact canvas: 1024×1536 portrait VIP laminate credential  
- Visual world lock (typography, border, color family)  
- Concept A–D composition specs from `concept-compositions.ts`  
- Event details integrated into artwork (not form layout)  
- Readability, print, and collectible requirements  

**Not** style tags. **Not** metadata labels. **Not** JSON.

---

## Workflow

```
Step 1: Confirm Event / Venue / Date / Years
    ↓
Step 2: Pick ONE visual world (e.g. Psychedelic Festival)
    ↓
GENERATE PASSES → OpenAI × 4 (Concept A–D, same world, different compositions)
    ↓
USE THIS CONCEPT → pick winner
    ↓
GENERATE 8 VARIATIONS → OpenAI × 8 (same composition, varied borders/colors/type/ornament)
    ↓
USE THIS PASS → approve in Advanced Workshop Asset Library
```

### Concept compositions (within same world)

| Key | Label | Differentiator |
|-----|-------|----------------|
| A | Sunburst Centerpiece | Center hero, ornate border, corner numbering |
| B | Vertical Marquee | Title stack left, side flourishes |
| C | Banner Header | Wide illustrated header band |
| D | Badge Crest | Symmetric crest, hero edition number |

---

## API Operations

| Op | Description |
|----|-------------|
| `generatePasses` + `visualWorldId` | 4 concept PNGs |
| `generateRefinementImages` | 8 variation PNGs |
| `setSelectedConcept` | Pick winning concept |
| `setSelectedVariation` | Pick final pass |

---

## Files Changed

| File | Change |
|------|--------|
| `lib/ops/creative-lab/visual-worlds.ts` | **NEW** — 6 structured world presets |
| `lib/ops/creative-lab/concept-compositions.ts` | **NEW** — A–D composition specs |
| `lib/ops/creative-lab/pass-concept-prompt.ts` | **NEW** — illustrator prompt renderer |
| `lib/ops/creative-lab/projects.ts` | `generatePassConceptsForProject`, `generateRefinementImages` |
| `components/ops/creative-lab/CreativeWorkstation.tsx` | 3-step art director desk |
| `components/ops/creative-lab/VisualWorldCard.tsx` | **NEW** — world picker |
| `components/ops/creative-lab/ConceptDeck.tsx` | Real PNG pass cards |
| `components/ops/creative-lab/AdvancedWorkshop.tsx` | Artifact type, workflow state, prompts |
| `app/ops/creative-lab/creative-lab.css` | World grid + pass deck styles |
| `tools/creative-lab/phase9-capture.ts` | **NEW** — verification script |

---

## Screenshots

Run verification (requires dev server + `OPENAI_API_KEY`):

```bash
RETROVERSE_OPS=1 OPENAI_API_KEY=sk-... npx tsx tools/creative-lab/phase9-capture.ts
```

Expected outputs in `reports/creative-lab/`:

| File | Content |
|------|---------|
| `phase9-before-workstation.png` | New 3-step desk (before generate) |
| `phase9-world-selected.png` | Psychedelic Festival selected |
| `phase9-concepts-generated.png` | Four real pass concept images |
| `phase9-variations-generated.png` | Eight refinement images |
| `phase9-asset-library.png` | Asset library with PNG thumbnails |

Compare against Phase 8:

| Before | After |
|--------|-------|
| `phase8-artwork-generated.png` | `phase9-concepts-generated.png` |
| SVG art-direction cards in concept deck | Real illustrated pass PNGs |

---

## Success Test Case

```
Event:     Sunday Nights
Venue:     The Main Pub
Date:      June 14, 2026
Years:     1971 · 1982 · 2000
World:     Psychedelic Festival
Action:    GENERATE PASSES
Expected:  Four professional festival credential concepts as PNG images
```

---

## Verification Checklist

- [ ] Main desk shows 3 steps only (no artifact type, no style weights)
- [ ] Six visual world cards with hero, description, typography/border/color meta
- [ ] GENERATE PASSES produces 4 PNG images (not SVG)
- [ ] Concept A–D differ in composition within same world
- [ ] GENERATE 8 VARIATIONS produces 8 PNG images
- [ ] Advanced Workshop has artifact type, prompts, workflow state, asset pipeline
- [ ] Prompts in Pass Lab read like illustrator briefs (no style tag soup)

---

## Next Steps

- Parallel OpenAI calls for faster concept generation (currently sequential × 4 + × 8)
- Progress indicator during long generation (4–12 API calls)
- Optional concept regeneration for single slot (A/B/C/D retry)
- Export final pass directly from main desk after variation pick
