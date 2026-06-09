# Media Lab Editor Restoration Verification

**Date:** 2026-06-08  
**Status:** Verified (system Chrome)

## Root cause

| Issue | Cause | Fix |
|-------|-------|-----|
| IN/OUT move together | Trim panel bounds (`panelStart`/`panelEnd`) recalculated from **live** `inSec`/`outSec`, rescaling the timeline during drag | Fixed `trimWindow` set once on performance load |
| Unreliable trim logic | `65f3611` body drag + `d011059` anchor patches on broken coordinates | Restored `cbd4039` `ClipSelectionPanel`; body drag disabled (inert `range-body`) |
| Play button (reported) | Transport logic was correct; Playwright bundled Chromium lacks H.264. System Chrome plays fine | Removed redundant native `controls`; aligned with `74a0879` transport |

## Baseline

See `working-editor-baseline.md`:

- Trim: `cbd4039` — `ClipSelectionPanel.tsx`
- Play transport: `74a0879` — `MediaLabMidnightSpecialClipReview.tsx` pattern
- Shell: `65f3611` — `MediaLabPerformanceEditor.tsx` (with stable trim window fix)

## Verification results

| Check | Result |
|-------|--------|
| Play starts | ✓ PASS (system Chrome) |
| Pause works | ✓ PASS |
| IN drag independent | ✓ PASS — OUT fixed (`00:67:07→00:67:07`) |
| OUT drag independent | ✓ PASS — IN fixed (`00:64:55→00:64:55`) |
| Save boundaries | ✓ PASS |
| Boundaries persist after reload | ✓ PASS |
| No `fs/promises` client errors | ✓ PASS |

### Trim probe (automated)

```
in_drag:  00:64:38 → 00:64:55  (out fixed at 00:67:07)
out_drag: 00:67:07 → 00:66:49  (in fixed at 00:64:55)
```

## Screenshots

| File | Description |
|------|-------------|
| `editor-restore-play.png` | Editor with playback started |
| `editor-restore-trim.png` | Trim panel after IN/OUT handle drags |
| `editor-restore-after-reload.png` | Saved boundaries after page reload |

## Capture command

```bash
npx tsx tools/media-collections/ms-editor-restoration-capture.ts
```

Uses system Chrome (`channel: "chrome"`) because bundled Chromium cannot decode H.264 episode files.

## Files changed

| File | Change |
|------|--------|
| `components/ops/media-lab/ClipSelectionPanel.tsx` | Restored `cbd4039` (independent clampIn/clampOut, no body drag) |
| `components/ops/media-lab/MediaLabPerformanceEditor.tsx` | Stable `trimWindow`; transport aligned with MS clip review |
| `tools/media-collections/ms-editor-restoration-capture.ts` | Verification capture script |

## Remaining known issues

1. **Body drag disabled** — inert `range-body` until trim is re-verified in production; can re-enable from `65f3611` once stable window is confirmed in daily use.
2. **Playwright headless Chromium** — H.264 episodes fail with `DEMUXER_ERROR_NO_SUPPORTED_STREAMS`; use system Chrome/Safari for automated capture.
3. **Editorial focus path unchanged** — year-job `FocusReviewDeck` still uses same `ClipSelectionPanel`; no regression expected.
