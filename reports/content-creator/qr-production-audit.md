# QR Production Audit — 2.25" × 3.5" Credential

**Date:** 2026-06-08  
**Tool:** `npx tsx tools/content-creator/qr-production-audit.ts`

---

## Print canvas

| Dimension | Value |
|-----------|-------|
| Card print size | 2.25" × 3.5" |
| Canvas pixels | 1024 × 1536 |
| px/in | ~455.1 |

---

## Reserved QR zone (post-fix)

| Metric | Before (1.65") | After (1.72") |
|--------|----------------|---------------|
| Zone print size | 1.65" square | **1.72" square** |
| Zone pixels | 751 | **783** |
| Width % of card | 73% | **76%** |
| Area % of card | 35% | **38%** |

**Visual balance:** QR occupies ~38% of card area — functional for scan, upper artwork remains hero (~62% above serial/URL stack).

---

## Matrix fill (retroverse.live URL)

```
matrixFillPercent: 87.9%
target: 85–90%
quietModulesUsed: 2
physicalMatrix: 1.51" × 1.51"
```

| Check | Result |
|-------|--------|
| Matrix fill in 85–90% band | ✅ PASS |
| Physical matrix ≥ 1.5" min | ✅ PASS (1.51") |
| Preferred lanyard scan (1.6"+) | ⚠️ MARGINAL — matrix 1.51" |

---

## Scan distance guidance

| Distance | Expectation |
|----------|-------------|
| 8–12" (lanyard) | Should decode if export PASS + white zone clear |
| < 6" | Easier; tests phone-too-close case |
| > 14" | May fail if matrix < 1.6" |

**Production gate:** `verifyQrInComposite()` — decode PASS required; size warning if below preferred 1.6".

---

## Pipeline (export path)

```
AI back.png (clean white reserve, no QR text)
    ↓
compositeQrOntoBackPng() — SVG QR validated → PNG composite
    ↓
serialOverlaySvg() — validated single-line SVG
    ↓
final-back.png
    ↓
verifyQrInComposite() — jsQR decode + matrix audit
```

---

## Issues fixed this pass

1. Matrix below 1.5" at 1.65" zone → **zone increased to 1.72"**
2. Malformed serial SVG → **single-line validated SVG**
3. QR SVG unvalidated → **`assertWellFormedSvg` before render**
4. Measurement text in AI prompts → **removed inch/pixel strings**

---

## Automated validation

| Stage | Validation |
|-------|------------|
| QR SVG build | `assertWellFormedSvg(svg, "qr-matrix")` |
| Serial overlay | `assertWellFormedSvg(svg, "serial-overlay")` |
| Data layer | `assertWellFormedSvg(svg, "pass-data-layer-back")` |
| Post-export | `verifyQrInComposite()` decode + matrix metrics |

Re-run audit:
```bash
npx tsx tools/content-creator/qr-production-audit.ts https://retroverse.live
```

---

## Screenshots

Capture after export:
- `reports/content-creator/screenshots/qr-audit-export-back.png` — final-back with composited QR
- `reports/content-creator/screenshots/qr-audit-print-scan-test.png` — print sheet at 100% scale
- Phone scan at 10" — note pass/fail in filename

*Not auto-captured in this session.*

---

## Recommendation

Monitor long QR URLs (>40 chars) — may require quiet=1 to hold 85% fill while keeping matrix ≥1.5". If failures recur, add URL shortener or raise zone to 1.75" max (~39% card area).
