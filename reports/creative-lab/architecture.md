# Retroverse Creative Lab — Architecture

**Date:** 2026-06-08  
**Status:** Foundation only — no image generation, no PDF export

---

## Core principle

Creative Lab works like Media Lab: a **workstation**, not a form.

Users define event context and weighted visual styles. The system stores **structured data** and builds **concept objects** — not hardcoded pass layouts or prompt strings.

One style system → many output modules.

---

## System diagram

```mermaid
flowchart TB
  subgraph UI["/ops/creative-lab"]
    WS[CreativeLabWorkspace]
    P[Projects panel]
    S[Styles panel]
    PR[Presets panel]
    PL[Pass Lab panel]
    WS --> P & S & PR & PL
  end

  subgraph API["API layer"]
    IDX["GET /api/ops/creative-lab"]
    PROJ["/api/ops/creative-lab/projects"]
    PRE["/api/ops/creative-lab/presets"]
  end

  subgraph Lib["lib/ops/creative-lab"]
    CAT[style-catalog.ts]
    PREL[presets.ts]
    PRJ[projects.ts]
    PB[prompt-builder.ts]
  end

  subgraph Data["RETROVERSE_DATA/creative_lab"]
    STYLES[styles/*.json]
    PROJS[projects/{id}/project.json]
    INDEX[index.json]
  end

  subgraph Modules["Output modules"]
    PASS[Pass Lab — active]
    POST[Poster Lab — placeholder]
    BUMP[Bumper Lab — placeholder]
    CARD[Card Lab — placeholder]
    MAG[Magazine Lab — placeholder]
  end

  UI --> API --> Lib --> Data
  PB --> PASS
  PASS -.-> POST & BUMP & CARD & MAG
```

---

## Layer map

| Layer | Path | Role |
|-------|------|------|
| Page | `app/ops/creative-lab/page.tsx` | Ops gate, shell, banner |
| Workstation | `components/ops/creative-lab/CreativeLabWorkspace.tsx` | Sidebar nav + panels |
| Style editor | `components/ops/creative-lab/StyleWeightEditor.tsx` | Weight sliders per category |
| Types | `lib/ops/creative-lab/types.ts` | Project, preset, module schemas |
| Style catalog | `lib/ops/creative-lab/style-catalog.ts` | Canonical style definitions |
| Presets | `lib/ops/creative-lab/presets.ts` | Load/save `styles/*.json` |
| Projects | `lib/ops/creative-lab/projects.ts` | CRUD + concept generation |
| Prompt builder | `lib/ops/creative-lab/prompt-builder.ts` | Structured concepts from weights |
| Paths | `lib/ops/creative-lab/paths.ts` | `RETROVERSE_DATA/creative_lab` |

---

## Style system

### Categories

| Category | Examples | Storage |
|----------|----------|---------|
| Credential | Festival Pass, Press Pass, Ticket Stub… | `style-catalog.ts` |
| Illustration | Cartoon, Mid-Century, Psychedelic… | `style-catalog.ts` |
| Color | Cream Vintage, Bright Pop, Neon… | `style-catalog.ts` |
| Density | Simple, Medium, Detailed | `style-catalog.ts` |

### Weighting

```json
{
  "credential": [{ "id": "festival-pass", "weight": 70 }, { "id": "concert-credential", "weight": 30 }],
  "illustration": [{ "id": "cartoon", "weight": 80 }, { "id": "mid-century", "weight": 20 }],
  "color": [{ "id": "cream-vintage", "weight": 100 }],
  "density": [{ "id": "medium", "weight": 100 }]
}
```

Weights are **structured data** — prompt text is derived at concept-build time, not stored as the source of truth.

---

## Data layout

```
RETROVERSE_DATA/creative_lab/
  index.json                 # project index
  styles/
    retroverse-classic.json
    live-aid.json
    woodstock.json
    sunday-nights.json
  projects/
    {projectId}/
      project.json
```

### Project schema (v1)

```json
{
  "version": 1,
  "id": "cl-…",
  "name": "Sunday Nights",
  "event": "Sunday Nights",
  "venue": "Main Pub",
  "date": "June 14, 2026",
  "featuredYears": [1967, 1978, 1992],
  "theme": "Pub night · three eras",
  "styleSelection": { "credential": [], "illustration": [], "color": [], "density": [] },
  "generatedPrompts": [],
  "generatedAssets": [],
  "selectedAssetIds": [],
  "activeModule": "pass-lab",
  "createdAt": "…",
  "updatedAt": "…"
}
```

---

## Modules

| Module | ID | Status |
|--------|-----|--------|
| Pass Lab | `pass-lab` | **Active** — builds structured concepts |
| Poster Lab | `poster-lab` | Placeholder |
| Bumper Lab | `bumper-lab` | Placeholder |
| Card Lab | `card-lab` | Placeholder |
| Magazine Lab | `magazine-lab` | Placeholder |

---

## API surface

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/ops/creative-lab` | Index: modules, catalog, presets, projects |
| GET/POST | `/api/ops/creative-lab/projects` | List / create |
| GET/PUT/DELETE | `/api/ops/creative-lab/projects/[id]` | Load / update / delete |
| PUT | `…?op=generateConcept` | Build structured prompt + placeholder asset |
| GET/POST | `/api/ops/creative-lab/presets` | List / save preset |

---

## Intentionally not built

- Image generation
- PDF export
- Pass layout templates
- Hardcoded pass concepts

---

## Extension path (before image generation)

1. **Prompt renderer** — convert `structuredConcept` → provider prompt string
2. **Asset pipeline** — replace `placeholder` assets with generated file paths
3. **Module routers** — poster/card/bumper each consume same `styleSelection`
4. **Selection UI** — pick winning assets per project
5. **Export layer** — PDF/print only after assets exist
