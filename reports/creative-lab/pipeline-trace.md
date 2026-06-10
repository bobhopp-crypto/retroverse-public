# Creative Lab — Image Pipeline Trace

**Date:** 2026-06-10  
**Symptom:** Concept cards show black frame + "Generating…" after GENERATE PASSES  
**Scope:** Diagnosis only — no UI/prompt/world changes

---

## Pipeline Trace

| Step | Status | Evidence |
|------|--------|----------|
| **1. OpenAI** | **FAIL** (this machine) | `OPENAI_API_KEY` not loaded from `.env.local` in trace script. Provider resolves to `disabled`. **Zero `.png` files exist** under `RETROVERSE_DATA/creative_lab/projects/`. |
| **2. PNG file write** | **FAIL** | No `generated/*.png` on disk. Only `generated/*.placeholder.json` files exist. |
| **3. Asset registration** | **FAIL** | Latest project `sunday-nights-june-14-2026-7`: `assets` have `filePath: "generated/asset-….placeholder.json"`. Prompts have `assetId: undefined`. |
| **4. API payload** | **FAIL** | Project JSON contains legacy `generateConcept` output (`variationSetId: "varset-…"`, prompts start with `=== Event Context ===`). No Phase 9 `set-…` variation sets. No `assetId` on prompts. |
| **5. Browser URL** | **N/A** | `<img>` never rendered — `ConceptDeck` requires `filePath?.endsWith(".png")`. |
| **6. Image render** | **FAIL** | UI shows fallback `"Generating…"` because `assetForPrompt()` returns `undefined`. |

---

## Root Cause

**The break is at step 1–3, not the image URL.**

Projects on disk were created by **legacy `generateConcept`** (placeholder pipeline), not **`generatePasses`** (OpenAI PNG pipeline).

### Evidence: latest project `sunday-nights-june-14-2026-7`

**Path:** `/Users/bobhopp/RETROVERSE_DATA/creative_lab/projects/sunday-nights-june-14-2026-7/`

```
generated/
  asset-1781058041980-asgia.placeholder.json
  asset-1781058041980-eu2ff.placeholder.json
  asset-1781058041980-g4vdy.placeholder.json
  asset-1781058041980-gpu0b.placeholder.json
```

**No `.png` files in any project folder.**

### How to tell legacy vs Phase 9 data

| Field | Legacy `generateConcept` | Phase 9 `generatePasses` |
|-------|--------------------------|---------------------------|
| `variationSetId` | `varset-{timestamp}-…` | `set-{base36}` |
| `renderedPrompt` | `=== Event Context ===` style tags | `Illustrate a finished…` illustrator brief |
| `assetId` on prompt | `undefined` | set to PNG asset id |
| `filePath` | `generated/*.placeholder.json` | `generated/*.png` |
| `selectedArtDirectionId` | `null` | visual world id |

Latest project matches **legacy** on all fields. Created `2026-06-10T02:20:41Z` — **before** Phase 9 commit (`2026-06-10T02:51:48Z`).

### Why UI shows "Generating…"

`ConceptDeck` logic:

```typescript
// Shows <img> only when asset.filePath ends with .png
// Otherwise shows "Generating…"
```

Legacy placeholders are linked via `promptId` but use `.placeholder.json` paths → **never qualifies as image** → permanent "Generating…".

---

## OpenAI Provider (when key present)

Logging added at `lib/ops/creative-lab/artwork/openai-provider.ts`:

```
[cl-artwork:openai] response { ok, status, dataCount, hasB64, error }
```

Run trace:

```bash
# Ensure OPENAI_API_KEY is in .env.local (Next.js dev only loads .env.local)
npx tsx tools/creative-lab/trace-image-pipeline.ts
```

---

## File Write Path (when OpenAI succeeds)

```
RETROVERSE_DATA/creative_lab/projects/{folderSlug}/generated/{assetId}.png
```

Relative `filePath` stored on asset: `generated/{assetId}.png`

Log: `[cl-artwork:write] PNG saved { projectId, assetId, abs, bytes, rel }`

---

## Asset Serve URL

```
GET /api/ops/creative-lab/projects/{folderSlug}/assets/{assetId}
```

Resolves project via `findProjectPath` (now matches `id` or `folderSlug`).

Returns 404 `asset_not_found` if `filePath` is not `.png` (placeholders rejected).

Log: `[cl-api:asset] serve | not_found | file_missing`

---

## Frontend Image Load

```
/api/ops/creative-lab/projects/{folderSlug}/assets/{assetId}
```

Logs: `[cl-ui:img] loaded` or `[cl-ui:img] error` in browser console.

---

## Action Items

1. **Restart dev server** after Phase 9 deploy (or confirm HMR picked up API routes).
2. **Put `OPENAI_API_KEY` in `.env.local`** — dev server loads only `.env.local` (see terminal: `Environments: .env.local`).
3. **Create a fresh project** or re-run **GENERATE PASSES** — old projects have placeholder assets that will never display as images.
4. **Watch server logs** during generate for `[cl-api:generatePasses]` and `[cl-artwork:openai]`.
5. **Watch browser console** for `[cl-ui:img]` load/error.

### Success checkpoint

After GENERATE PASSES on a fresh project you should see:

- `generated/*.png` (4 files) under project folder
- `prompt.assetId` set on each concept in `project.json`
- `renderedPrompt` starts with `Illustrate a finished`
- Concept cards show images (not "Generating…")

---

## Trace Script

`tools/creative-lab/trace-image-pipeline.ts` — runs OpenAI → write → register → HTTP fetch end-to-end.
