# Creative Lab Phase 8 — Artwork Generation Spike

**Date:** 2026-06-10  
**Scope:** 8A provider evaluation · 8B provider abstraction · 8C first OpenAI generation

---

## 8A — Provider evaluation

Committed: `reports/creative-lab/provider-evaluation.md`  
**Recommendation:** OpenAI `gpt-image-2` (easiest wire-up)

---

## 8B — Provider abstraction

| File | Role |
|------|------|
| `lib/ops/creative-lab/artwork/index.ts` | `generateArtwork(context, options)` entry |
| `lib/ops/creative-lab/artwork/types.ts` | Shared types |
| `lib/ops/creative-lab/artwork/provider-config.ts` | `CREATIVE_LAB_ARTWORK_PROVIDER` env selection |
| `lib/ops/creative-lab/artwork/openai-provider.ts` | OpenAI `gpt-image-2` implementation |
| `lib/ops/creative-lab/artwork/gemini-provider.ts` | Stub (throws) |
| `lib/ops/creative-lab/artwork/build-prompt.ts` | Prompt assembly from project + variation |

Provider selection (env):

- `openai` — active when `OPENAI_API_KEY` set
- `gemini` — stub
- `disabled` — `CREATIVE_LAB_ARTWORK_PROVIDER=disabled`

---

## 8C — First generation spike

### Workflow

1. Generate Concepts  
2. Choose Direction → **USE THIS DIRECTION**  
3. Generate 8 Refinements (SVG boards — unchanged)  
4. Choose Variation → **USE THIS VERSION**  
5. **GENERATE ARTWORK** → 4 PNGs via OpenAI

### API

`PUT /api/ops/creative-lab/projects/{id}`  
`{ "op": "generateArtwork" }`

Requires: `selectedConceptPromptId` + `selectedVariationIndex`

### Storage

`RETROVERSE_DATA/creative_lab/projects/{folder}/generated/{assetId}.png`

### Assets

- 4 new `CreativeLabAsset` records per generation
- Visible in Advanced → Assets with PNG thumbnails
- Approve / Reject / Set Final use existing asset pipeline
- Image serve: `GET /api/ops/creative-lab/projects/{id}/assets/{assetId}`

---

## Verification

### Prerequisites

```bash
export RETROVERSE_OPS=1
export OPENAI_API_KEY=sk-...
export CREATIVE_LAB_ARTWORK_PROVIDER=openai
npm run dev   # or PORT=3001 npm run dev -- --no-clean
```

### Automated capture

```bash
CL_CAPTURE_BASE=http://localhost:3001 npx tsx tools/creative-lab/phase8-spike-capture.ts
```

### Test case

| Field | Value |
|-------|-------|
| Event | Sunday Nights |
| Venue | Main Pub |
| Date | June 14, 2026 |
| Years | 1971 · 1982 · 2000 |
| Artifact | VIP Pass |
| Preset | Sunday Nights Classic |

### Expected results

- [ ] 4 PNG files in `generated/`
- [ ] 4 asset records with `filePath: generated/*.png`
- [ ] Thumbnails visible in Asset Library
- [ ] Approve works
- [ ] Set Final → `final-front` slot populated

### Findings

Run capture script to populate `phase8-spike-findings.txt`.

---

## Not implemented (per scope)

- Image edits / inpaint
- Refinement image generation (Round 2 stays SVG)
- Export overlays
- Print production
