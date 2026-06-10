# Creative Lab Phase 8 — Image Provider Evaluation

**Date:** 2026-06-10  
**Scope:** Spike evaluation only — no implementation  
**Goal:** Pick the easiest provider to wire into Creative Lab asset generation

---

## Context

Creative Lab today:

- Has **structured prompts** via `renderPromptText()` (`lib/ops/creative-lab/prompt-renderer.ts`)
- Has **art directions**, **8-refinement workflow**, and a **154-asset illustration library**
- Stores projects under `RETROVERSE_DATA/creative_lab/`
- Has **no image provider wired** — no SDK deps, no API keys in `.env.example` or Vercel env
- Ops API pattern exists: `/api/ops/creative-lab/projects/[id]` with cookie gate

Typical generation volume per session:

| Step | Images |
|------|--------|
| Round 1 — 4 art directions | 4 |
| Round 2 — 8 refinements | 8 |
| **Total per full pass** | **12** |

Target artifact: VIP pass / credential — **portrait**, illustrated, small readable event text (~5% of frame), laminate-worthy.

---

## Repo reality check

| Check | Result |
|-------|--------|
| Gemini in codebase | **No** |
| OpenAI in codebase | **No** |
| Flux / BFL in codebase | **No** |
| ComfyUI installed locally | **No** (`comfy` not found, port 8188 not responding) |
| Existing prompt pipeline | **Yes** — ready to pipe to any provider |

**Note:** Gemini was listed as preferred *if already in workflow*. It is **not** in the Retroverse repo today. Evaluation weights **setup complexity + Creative Lab fit** over preference alone.

---

## Provider comparison

### 1. Google Gemini Image Generation

**Models evaluated:** `gemini-2.5-flash-image`, `gemini-3.1-flash-image`, `gemini-3-pro-image`, Imagen 4 (`imagen-4.0-*`)

| Criterion | Assessment |
|-----------|------------|
| **Cost per image** | **Gemini 2.5 Flash Image:** ~$0.039/image (1024×1024 standard); batch ~$0.0195/image. **Gemini 3.1 Flash Image:** ~$0.067 (1K), ~$0.101 (2K), ~$0.151 (4K). **Gemini 3 Pro Image:** ~$0.134 (1K/2K), ~$0.24 (4K). **Imagen 4 Fast:** $0.02/image (cheapest Google option). |
| **Setup complexity** | **Medium.** Google AI Studio API key + billing. Two API surfaces: `generateContent` (stable) and Interactions API (newer, conversational editing). Node SDK: `@google/genai`. No existing repo wiring. |
| **Authentication** | API key (`GEMINI_API_KEY` / Google AI Studio). Paid tier required for image models (no free-tier image output). Billing account linked in AI Studio. |
| **Image size support** | 512px–4K depending on model. Aspect ratios on 3.x models include 1:4, 4:1, 1:8, 8:1 plus standard portrait/landscape. Pass-friendly portrait supported. |
| **Variation support** | No single `n=8` knob like OpenAI. Variations = multiple requests, or **Batch API** (async, cheaper). Conversational multi-turn (Interactions API) fits Round 2 “stay in art family” well. |
| **Edit / inpaint** | **Yes** — native image editing via multimodal input (image + text). Gemini 3.x supports multi-turn edits, reference images, and style preservation. Imagen is generate-only. |
| **Return format** | Inline **base64** in response parts, or file URI. Fits direct write to `generated/{assetId}.png`. |
| **Rate limits** | Tier-based RPM / IPM (Images per minute). View active limits in AI Studio. Preview/image models more restrictive. Batch API has separate enqueued-token caps. Typical Tier 1: usable for 12-image sessions; burst of 8 refinements may need simple queue. |

**Creative Lab fit:** Strong for Round 2 refinements (conversational “same psychedelic family, more ornate border”). Can pass composed SVG board as reference image. Imagen 4 Fast good for cheap Round 1 drafts.

**Friction:** Two API paths to learn; image models paid-only; no existing keys in project.

Sources: [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini 3.1 Flash Image](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image), [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

---

### 2. OpenAI Image Generation

**Model evaluated:** `gpt-image-2` (current flagship; `gpt-image-1` deprecating Oct 2026)

| Criterion | Assessment |
|-----------|------------|
| **Cost per image** | Resolution + quality tier. Reference (1024×1024): **~$0.006** (low), **~$0.053** (medium), **~$0.211** (high) for 1K. 2K/4K scale up. **12-image session @ medium 1K ≈ $0.64.** `gpt-image-1-mini` cheaper for drafts ($0.005–$0.052). |
| **Setup complexity** | **Low.** `openai` npm package. Single sync POST → result. Best-documented path for Next.js API routes. |
| **Authentication** | `OPENAI_API_KEY` bearer token. Paid tier required (free tier not supported for image models). |
| **Image size support** | Flexible `size` on `gpt-image-2`: any resolution within constraints (multiples of 32, max edge ≤3840, min 16px). Preset pass size e.g. **1024×1536** works. 2K/4K supported. |
| **Variation support** | **`n` parameter** — generate multiple images in one request (documented for logo/concept variations). Ideal for Round 2 batch of 8. |
| **Edit / inpaint** | **Yes** — `POST /v1/images/edits` with input image(s) + mask or high-fidelity edit. Strong for “change border treatment, keep everything else.” |
| **Return format** | **`b64_json`** or URL. Direct write to project `generated/` folder. |
| **Rate limits** | **IPM (images per minute)** by usage tier: Tier 1 = **5 IPM**, Tier 2 = 20, Tier 3 = 50, Tier 5 = 250. 12 images/session fits Tier 1 with ~3 min spacing or parallel cap at 5. |

**Creative Lab fit:** Fastest spike. `renderedPrompt` → `images.generate` → save PNG. `n=8` maps cleanly to refinement grid. Strong text-in-image for event name on pass.

**Friction:** No existing OpenAI key in repo. Medium-quality 12-image sessions cost more than Imagen 4 Fast / Flux klein.

Sources: [GPT Image 2 model docs](https://developers.openai.com/api/docs/models/gpt-image-2), [Image gen prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide), [Deprecations](https://developers.openai.com/api/docs/deprecations)

---

### 3. Flux API (Black Forest Labs)

**Models evaluated:** FLUX.2 Pro/Klein/Max/Flex, FLUX.1 Kontext, FLUX.1 Fill

| Criterion | Assessment |
|-----------|------------|
| **Cost per image** | Credit system: **1 credit = $0.01**. **FLUX.2 Klein 4B:** from **~$0.014/image** (~1MP). **FLUX.2 Pro:** from **$0.03/MP** gen, **$0.045/MP** edit. **FLUX.1 Kontext Pro:** **$0.04/image**. **FLUX.1 Fill Pro:** **$0.05/image** (inpaint). Pass ~1.5MP portrait ≈ **$0.045–$0.07** on Pro. |
| **Setup complexity** | **Medium–High.** Async **submit → poll `polling_url` → download signed URL** (expires in **10 minutes**). Requires queue/retry logic, concurrency semaphore. No repo wiring. |
| **Authentication** | `x-key: BFL_API_KEY` header. Prepaid credits on bfl.ai account. |
| **Image size support** | Up to **4MP**. Explicit `width` / `height`. Good for portrait pass dimensions. |
| **Variation support** | `seed` parameter + batch requests (cost × N). No native `n=8` in one call. Parallel up to **24 concurrent** requests. |
| **Edit / inpaint** | **Yes.** FLUX.2: `input_image` on same endpoint. FLUX.1 Kontext: context-aware edit. FLUX.1 Fill: mask-based inpaint/outpaint. |
| **Return format** | **Signed HTTPS URL** (short-lived). Must download and persist to `RETROVERSE_DATA` immediately. |
| **Rate limits** | **24 concurrent** in-flight requests (6 for Kontext Max). HTTP 429 with retry. No simple IPM table — concurrency-based. |

**Creative Lab fit:** Best **illustration/poster** aesthetic of the four. Strong for collectible art-first passes. Higher engineering cost than OpenAI/Gemini for the same “save 12 PNGs to project folder” outcome.

**Friction:** Async polling, URL expiry, new vendor account, no existing workflow.

Sources: [BFL pricing](https://docs.bfl.ml/quick_start/pricing), [Integration guide](https://docs.bfl.ml/api_integration/integration_guidelines), [FLUX.1 Fill](https://docs.bfl.ml/flux_tools/flux_1_fill)

---

### 4. Local ComfyUI

| Criterion | Assessment |
|-----------|------------|
| **Cost per image** | **$0 marginal** (local GPU electricity only). |
| **Setup complexity** | **High.** Not installed on this machine. Requires ComfyUI install, model weights (FLUX/SD checkpoints, multi-GB), workflow JSON, GPU drivers, always-on local server, and a bridge from Next.js → `localhost:8188`. |
| **Authentication** | None locally. |
| **Image size support** | Full control via workflow nodes. |
| **Variation support** | Seed + batch nodes — excellent, but workflow-defined. |
| **Edit / inpaint** | Yes — via inpaint workflows, if built. |
| **Return format** | File path on disk or base64 via API — custom integration. |
| **Rate limits** | GPU-bound only. |

**Creative Lab fit:** Ruled out for Phase 8 spike — **not already installed**. Revisit only if Bob wants zero per-image cost and accepts local ops burden.

---

## Side-by-side summary

| | Gemini (2.5 Flash Image) | OpenAI (gpt-image-2) | Flux (2 Pro / Kontext) | ComfyUI |
|--|--------------------------|----------------------|------------------------|---------|
| **Cost / 12-image session** | ~$0.47 (2.5 Flash) / ~$0.24 (Imagen 4 Fast) | ~$0.64 (medium 1K) / ~$0.07 (low 1K) | ~$0.50–$0.85 | $0 |
| **Setup complexity** | Medium | **Low** | Medium–High | High |
| **Already in repo** | No | No | No | No |
| **Sync API** | Yes (standard) | **Yes** | No (poll) | Custom |
| **Batch variations (n=8)** | Multi-request / Batch API | **`n` param** | Parallel jobs | Workflow |
| **Edit for refinements** | Yes (multimodal) | Yes (edits endpoint) | Yes | Yes (if built) |
| **Text on pass** | Good (3 Pro best) | **Strong** | Good (Flex) | Depends on model |
| **Illustration style** | Good | Good | **Best** | Best (if tuned) |

---

## Creative Lab integration sketch (for winner)

Whichever provider is chosen, the wire path is the same shape:

```
ConceptDeck winner
  → project.generatedPrompts[].renderedPrompt
  → POST /api/ops/creative-lab/projects/{id}  { op: "generateAssets" }
  → provider call
  → write RETROVERSE_DATA/creative_lab/projects/{id}/generated/{assetId}.png
  → update project.assets[]
```

No workflow changes needed — Phase 7 workflow is sufficient.

---

## Recommendation

### **OpenAI `gpt-image-2`** — wire this first

**Why one provider:** Creative Lab Phase 8 asks for the **easiest** integration spike, not the best illustration model in isolation. OpenAI wins on:

1. **Lowest setup complexity** — sync REST, `openai` SDK, `b64_json` straight to disk, no polling
2. **Best match for current workflow** — `n=8` for Round 2 refinements in one or two calls; `images.edit` for “same direction, different border”
3. **Strong text-in-image** — important for pass event strip readability
4. **Flexible portrait sizing** — `1024×1536` or custom pass aspect without fighting aspect-ratio enums
5. **Clear rate limits** — IPM tiers are documented; 12 images/session is manageable at Tier 1 with a simple queue

**Suggested defaults for spike:**

| Setting | Value |
|---------|-------|
| Model | `gpt-image-2` |
| Quality | `medium` (upgrade to `high` for final export only) |
| Size | `1024×1536` (portrait pass) |
| Round 1 | 4 calls or `n=4` |
| Round 2 | 1× call with `n=8` or 2× `n=4` |
| Env var | `OPENAI_API_KEY` (server-only, ops route) |

**Estimated cost:** ~$0.07–$0.64 per full 12-image session depending on quality tier.

---

### Runner-up: Google Gemini `gemini-2.5-flash-image`

Choose Gemini instead if:

- Bob already has **Google AI Studio billing** active
- Round 2 should be **conversational multi-turn** (“refine this direction”) rather than `n` identical prompts
- Reference images from the **illustration library** should steer generation (multimodal input)

Use **Imagen 4 Fast** ($0.02/image) for Round 1 drafts + **2.5 Flash Image** for Round 2 finals to optimize cost.

---

### Defer: Flux API

Best visual vocabulary for poster-like collectibles, but **async polling + URL expiry** makes it harder to wire than OpenAI/Gemini. Revisit when illustration quality gap justifies the extra plumbing.

---

### Defer: ComfyUI

Not installed. Not eligible per Phase 8 scope.

---

## Next step (when implementing)

1. Add `OPENAI_API_KEY` to local env + Vercel (ops only)
2. Add `generateAssets` op to `/api/ops/creative-lab/projects/[id]`
3. Pipe `renderedPrompt` + art-direction metadata into image request
4. Write PNGs to `generated/` and surface in Advanced → Assets
5. Capture before/after screenshots with real generated passes

**Do not deploy** until laminate-quality review passes Bob’s “would I hand this out?” test.
