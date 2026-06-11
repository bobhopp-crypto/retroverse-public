# Content Creator — Stability Audit

**Date:** 2026-06-08  
**Scope:** Reliability fixes only (no new features, no UI redesign)

---

## 1. QR overlay / measurement text leak

### Problem
Generated back artwork sometimes included text like **"QR Safe Area · 1.65 × 1.65"** — matching the editor overlay label, or inch/pixel strings from prompts.

### Root cause
AI prompts contained compositing metadata the model painted as typography:
- `integratedQrZonePrompt()` included inch + pixel coordinates
- `creative-direction` back layout included `1.6–1.7" square`
- `pass-artwork-prompt` listed `751×751px` QR coordinates
- `PassQrSafeAreaOverlay` showed dimension label (editor-only, but reinforced the pattern)

### Fix
| Change | File |
|--------|------|
| Measurement-free QR/URL/serial prompts | `pass-layout.ts` |
| `NO_MEASUREMENT_ON_ARTWORK_PROMPT` | `pass-prompt-safety.ts` |
| Injected into RVBR + collectible prompts | `rvbr-prompt-engine.ts`, `collectible-pass-prompt.ts` |
| Overlay label off by default | `PassQrSafeAreaOverlay.tsx`, `VNextWorkspace.tsx` |
| Renamed panel guidance (no "QR safe area" label) | `pass-credential-layout.ts` |

**Checkpoint:** New generations should not include zone names or inch/pixel strings. Editor overlay remains CSS-only (dashed box, no label).

---

## 2. Print Scan Test failures

### Reported errors
- `glib XML parse error`
- `Opening and ending tag mismatch: svg line … expected </svg>, got </text>`
- `502 Bad Gateway`

### Trace

| Step | Path | Notes |
|------|------|-------|
| QR generation | `qr-zone-render.ts` → `buildQrSvg` | Rect-only SVG; validated before render |
| Serial overlay | `vnext-export.ts` → `serialOverlaySvg` | **Was split across lines** — risk of parser confusion |
| Data overlay | `pass-data-overlay.ts` → `buildPassDataLayerSvg` | Text elements; now validated |
| Print sheet | `print-scan-test/route.ts` → `buildPrintScanTestHtml` | **Was embedding multi-MB base64** |

### Root causes
1. **502:** Inline base64 PNGs exceeded practical response size; route returned 502 on read/manifest errors.
2. **SVG mismatch:** Serial overlay used multi-line string join for `<text>`; consolidated to single well-formed element.
3. **Print sheet showed preview back** without composited QR when export not run.

### Fix
- `assertWellFormedSvg()` in `svg-validate.ts` — blocks QR, serial, and data-layer SVG before `sharp`
- Print sheet uses **file URLs** (`/api/.../vnext/files/...`) not base64
- Prefers `export/final-back.png` when exported
- Warns if export missing

**Checkpoint:** Export → Print Scan Test opens HTML with linked images; no 502 from payload size.

---

## 3. Queue survival matrix

| Event | Queued job on disk | Runner continues | UI reconnects |
|-------|-------------------|------------------|---------------|
| Page refresh | ✅ | ✅ if runner alive | ✅ poll `/api/.../jobs` |
| Tab close | ✅ | ✅ if runner alive | ✅ on reopen |
| Browser restart | ✅ | ❌ until runner respawned | ✅ on reopen |
| `npm` / dev server restart | ✅ | ❌ stuck `running` until lock stale (15m) or manual `run-jobs.ts` | ✅ |
| Machine reboot | ✅ | ❌ same as above | ✅ |

### Queue status labels (UI)
- **Waiting** (`queued`)
- **Running** (`running`)
- **Completed**
- **Failed** + **Retry** button → `POST /api/ops/content-creator/jobs/{id}/retry`

Storage: `RETROVERSE_DATA/content_creator/jobs/{id}.json`

Manual worker: `npx tsx tools/content-creator/run-jobs.ts`

---

## 4. Era branding cleanup

### Problem
1982–1985 DNA mandated MTV/VH1 broadcast branding; models invented RTV/RVTV-style network marks.

### Fix
- Rewrote `1982-1985` mandate in `rvbr-era-visual-dna.ts` — neon laminate ephemera, **no invented networks**
- Added `NO_FAKE_NETWORK_BRANDS_PROMPT` to prompt safety + RVBR engine + anti-repetition globals
- Era expression: palette, typography, framing — not fake channel logos

---

## 5. Screenshots

Capture after deploy at `/ops/content-creator/create`:

| Check | Expected |
|-------|----------|
| Back preview | No "QR Safe Area" text on PNG; optional dashed overlay only |
| Export | Completes without SVG parse error |
| Print Scan Test | HTML opens; back shows QR if exported |
| Queue failed job | Retry re-queues |

Suggested paths:
- `reports/content-creator/screenshots/stability-back-preview-clean.png`
- `reports/content-creator/screenshots/stability-print-scan-test.png`
- `reports/content-creator/screenshots/stability-queue-retry.png`

*Not auto-captured in this session.*

---

## Remaining risks

1. **Stuck `running` jobs** after hard kill — no auto-heal yet
2. **AI may still leak text** — prompts reduced; no pixel-level OCR gate on export
3. **Long QR URLs** may push matrix below 1.5" — monitor with audit script
4. **Detached runner** may not spawn in all environments
