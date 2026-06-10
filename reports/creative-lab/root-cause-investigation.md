# Creative Lab — Root Cause Investigation

**Date:** 2026-06-10  
**Investigator:** automated trace (local dev on port 3002)

---

## Root Cause

**`OPENAI_API_KEY` is not configured in the dev server environment (`.env.local` contains only `RETROVERSE_OPS`), so `generatePasses` returns HTTP 502 before OpenAI runs or any PNG is written, while legacy `generateConcept` projects retain `.placeholder.json` assets that `ConceptDeck` cannot render—showing a permanent "Generating…" state.**

---

## Evidence

### 1. Environment — OPENAI not loaded

`.env.local` contents (64 bytes):

```
SEARCH_UPSTREAM_BASE_URL=http://localhost:3001
RETROVERSE_OPS=1
```

No `OPENAI_API_KEY` in `.env.local`, `.env.production.local`, or `.env.vercel.production`.

Next.js dev server confirms: `Environments: .env.local` (terminal 973924).

Trace script output:

```
[FAIL] 1. Provider config: provider=disabled OPENAI_API_KEY=MISSING
```

### 2. Frontend request fires — API returns 502

```bash
curl -X PUT http://localhost:3002/api/ops/creative-lab/projects/sunday-nights-june-14-2026-7 \
  -H "Content-Type: application/json" \
  -d '{"op":"generatePasses","visualWorldId":"psychedelic-festival"}'
```

Response (0.87s):

```json
{"error":"Artwork provider is disabled. Set OPENAI_API_KEY and CREATIVE_LAB_ARTWORK_PROVIDER=openai."}
```

HTTP 502.

### 3. Server logs — generatePasses starts, OpenAI never called

```
[cl-api:generatePasses] start {
  projectId: 'sunday-nights-june-14-2026-7',
  visualWorldId: 'psychedelic-festival'
}
PUT /api/ops/creative-lab/projects/sunday-nights-june-14-2026-7 502 in 767ms
```

No `[cl-artwork:openai]`, `[cl-artwork:write]`, or `[cl-artwork:register]` logs — provider disabled before OpenAI fetch.

Code path:

```15:20:lib/ops/creative-lab/artwork/index.ts
  const provider = resolveArtworkProvider();
  if (provider === "disabled") {
    throw new Error(
      "Artwork provider is disabled. Set OPENAI_API_KEY and CREATIVE_LAB_ARTWORK_PROVIDER=openai.",
    );
```

```8:11:lib/ops/creative-lab/artwork/provider-config.ts
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  ...
  return "disabled";
```

### 4. PNG files — none from OpenAI; placeholders only

```bash
find RETROVERSE_DATA/creative_lab/projects -name '*.png'
# (empty — zero PNG files before this investigation)

find RETROVERSE_DATA/creative_lab/projects -name '*.placeholder.json'
# multiple projects including sunday-nights-june-14-2026-7
```

Latest user project `sunday-nights-june-14-2026-7/generated/`:

```
asset-1781058041980-gpu0b.placeholder.json
asset-1781058041980-eu2ff.placeholder.json
asset-1781058041980-g4vdy.placeholder.json
asset-1781058041980-asgia.placeholder.json
```

Created by legacy `generateConcept` (33ms API response), not `generatePasses`:

- `variationSetId`: `varset-…` (legacy) vs Phase 9 `set-…`
- `renderedPrompt` starts with `=== Event Context ===` (style-tag renderer)
- `prompt.assetId`: undefined
- `filePath`: `.placeholder.json`

### 5. Asset registration — placeholders not PNGs

From `sunday-nights-june-14-2026-7/project.json`:

```json
"filePath": "generated/asset-1781058041980-gpu0b.placeholder.json"
```

Created by:

```161:162:lib/ops/creative-lab/assets.ts
  const rel = `generated/${asset.id}.placeholder.json`;
```

### 6. Image URL gate — only `.png` served

```26:28:app/api/ops/creative-lab/projects/[id]/assets/[assetId]/route.ts
  if (!asset?.filePath?.endsWith(".png")) {
    return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
```

### 7. Browser render gate — only `.png` displayed

```67:67:components/ops/creative-lab/ConceptDeck.tsx
                    {asset?.filePath?.endsWith(".png") && asset.id ? (
```

Placeholder assets fail both gates → fallback text shown (was "Generating…" regardless of state).

---

## Display Pipeline — VERIFIED (when PNG exists)

Injected test PNG via `tools/creative-lab/verify-display-pipeline.ts`:

| Step | Result |
|------|--------|
| PNG write | PASS — `/Users/bobhopp/RETROVERSE_DATA/creative_lab/projects/sunday-nights-june-14-2026-8/generated/asset-display-test-mq7hpvzp.png` (70 bytes) |
| Asset registration | PASS — `filePath: generated/asset-display-test-mq7hpvzp.png`, `prompt.assetId` set |
| HTTP serve | PASS — 200 `image/png` 70 bytes |
| Browser render | PASS — `IMG_COUNT 1`, screenshot `reports/creative-lab/root-cause-display-verified.png` |

**Conclusion:** Steps 5–6 (URL resolve + browser display) work. The break is exclusively at steps 1–4 (OpenAI → PNG write).

---

## Fix

### Required (ops — not code)

Add to `.env.local`:

```bash
OPENAI_API_KEY=sk-…your-key…
CREATIVE_LAB_ARTWORK_PROVIDER=openai
```

Restart dev server: `RETROVERSE_OPS=1 npm run dev`

### Code (committed)

1. **`ConceptDeck.tsx`** — Stop showing "Generating…" when not busy and no PNG exists; show explicit missing-image reason (placeholder vs failed generation).

2. **Do not use legacy projects** — Re-run GENERATE PASSES on a fresh project after key is configured.

---

## Verification Checklist

After adding `OPENAI_API_KEY` to `.env.local`:

```bash
# 1. Provider configured
npx tsx tools/creative-lab/trace-image-pipeline.ts
# Expect: [PASS] 1. Provider config

# 2. Full generate
curl -X PUT http://localhost:3002/api/ops/creative-lab/projects/{id} \
  -H "Content-Type: application/json" \
  -d '{"op":"generatePasses","visualWorldId":"psychedelic-festival"}'
# Expect: HTTP 200, pngAssets: 4 in server log

# 3. PNG on disk
ls RETROVERSE_DATA/creative_lab/projects/{folder}/generated/*.png

# 4. Browser
open http://localhost:3002/ops/creative-lab?project={id}
# Expect: 4 concept cards with images
```

**Current verification status:**

| Check | Status |
|-------|--------|
| PNG files on disk (OpenAI) | **BLOCKED** — no API key |
| Asset records → PNG | **BLOCKED** — no API key |
| Browser displays OpenAI images | **BLOCKED** — no API key |
| Display chain (write→serve→render) | **PASS** — test PNG verified |

---

## Why user waited 10+ minutes

Two compounding behaviors:

1. **`generatePasses` fails in <1s** with 502 when key missing — but error may be missed if user focus is on cards.
2. **Legacy placeholder cards** show perpetual "Generating…" (now fixed to explicit message) — user interprets as still loading.

OpenAI generation was never in progress during this investigation.
