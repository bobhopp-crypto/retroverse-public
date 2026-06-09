# Media Lab Trim Preview Verification

**Date:** 2026-06-08  
**Status:** Verified

## Root cause — duplicate key

`OpsDirectory` keyed quick links by `link.href` only. When no live RVTR is set, `app/ops/page.tsx` injects `liveTrackHref: "/sunday-nights"` into public links — duplicating the static `OPS_PUBLIC_QUICK_LINKS` Sunday Nights entry (`href: "/sunday-nights"`).

**Fix:** Composite key `${link.label}-${link.href}` in `QuickLinkList`.

## Changes

| Area | Change |
|------|--------|
| Duplicate key | `OpsDirectory.tsx` — stable composite React keys |
| Live trim preview | `MediaLabPerformanceEditor` — `onTrimDragStart/Preview/End` wired to video seek |
| Audio skimming | Checkbox default OFF; ON = 120ms play burst per scrub frame |
| Trim release | `ClipSelectionPanel` — final seek + playhead pin on pointer-up |

## Verification results

| Check | Result |
|-------|--------|
| No duplicate key on `/ops` | ✓ PASS |
| No duplicate key on Media Lab | ✓ PASS |
| IN drag live frame preview | ✓ PASS (`3897→3917`, paused scrub) |
| IN release playhead pinned | ✓ PASS |
| OUT drag live frame preview | ✓ PASS (`3988→3968`) |
| OUT release playhead pinned | ✓ PASS |
| Audio skimming default OFF | ✓ PASS |
| Audio skimming toggle ON | ✓ PASS |
| Audio skimming scrub burst | ✓ PASS |
| Skim stops after scrub (no continuous play) | ✓ PASS |
| Save + reload boundaries | ✓ PASS |

## Screenshots

| File | Description |
|------|-------------|
| `trim-preview-ops.png` | Ops directory — clean console |
| `trim-preview-in-drag.png` | Editor after IN handle drag |
| `trim-preview-out-drag.png` | Editor after OUT handle drag |
| `trim-preview-audio-skim.png` | Audio Skimming checkbox in transport |

## Capture command

```bash
npx tsx tools/media-collections/ms-trim-preview-capture.ts
```

Uses system Chrome (`channel: "chrome"`).

## Remaining issues

1. **Body drag** — still disabled (inert `range-body`)
2. **Audio skim duration** — fixed 120ms burst; not configurable
3. **Playwright bundled Chromium** — H.264 episodes still require system Chrome for automated video tests
