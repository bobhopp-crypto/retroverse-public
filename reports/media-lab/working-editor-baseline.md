# Media Lab Working Editor Baseline

**Date:** 2026-06-08  
**Source:** Git history + `editor-lineage-audit.md`

---

## Summary

| Capability | Last known good commit | Primary files |
|------------|------------------------|---------------|
| IN/OUT trim (independent) | `cbd4039` | `ClipSelectionPanel.tsx` |
| Editorial trim (canonical) | `fe74830` | `ClipSelectionPanel.tsx`, `FocusReviewDeck.tsx` |
| MS play transport | `74a0879` | `MediaLabMidnightSpecialClipReview.tsx` |
| MS full workstation shell | `65f3611` | `MediaLabPerformanceEditor.tsx` |

**Regression introduced:** `65f3611` added body drag + sliding trim window (`panelStart`/`panelEnd` derived from live `inSec`/`outSec`). `d011059` patched drag anchors but did not fix the sliding coordinate system.

---

## 1. Trim — IN/OUT independent

### Last known good: `cbd4039`

```
Add timeline merge/split editing with undo in Media Lab review.
```

| File | Role |
|------|------|
| `components/ops/media-lab/ClipSelectionPanel.tsx` | `clampIn` / `clampOut`; drag updates **one** field only |
| `components/ops/media-lab/FocusReviewDeck.tsx` | Mounts trim panel |
| `components/ops/media-lab/MediaLabEditorialReview.tsx` | Passes **fixed** `clip.startSec` / `clip.endSec` |

### Canonical earlier: `fe74830`

Simpler `ClipSelectionPanel` — IN/OUT only, inert `range-body`, no trim callbacks. Still correct independent-handle behavior.

### What broke after baseline

| Commit | Change |
|--------|--------|
| `65f3611` | Body drag enabled; MS editor uses `panelStart = inSec - PAD` (sliding window) |
| `d011059` | `DragAnchor` rewrite; still uses sliding window |

### Root cause (trim)

Editorial path passes **fixed chapter bounds** to `ClipSelectionPanel`. MS performance editor passes **live selection-derived bounds**, so the timeline rescales during drag and both handles appear to move together.

---

## 2. Playback — Play / Pause

### Last known good: `74a0879`

```
Route Midnight Special clip editing through Media Lab clip_review mode.
```

| File | Role |
|------|------|
| `components/ops/media-lab/MediaLabMidnightSpecialClipReview.tsx` | `video.play()` / `video.pause()` transport bar |
| `lib/ops/media-collections/midnight-special/clip-review.ts` | `video_url` → `/api/ops/media-collections/midnight-special/video` |

### Shell carrying transport: `65f3611`

| File | Role |
|------|------|
| `components/ops/media-lab/MediaLabPerformanceEditor.tsx` | Copied transport from `MediaLabMidnightSpecialClipReview` |

Transport logic at `65f3611` is functionally identical to `74a0879`. Playback regression is likely environmental (video load / layout) or collateral from trim `seek` calls, not a transport rewrite.

---

## 3. Body drag

| Commit | State |
|--------|-------|
| `fe74830` / `cbd4039` | Inert `range-body` — **no body drag** |
| `65f3611` | Body drag enabled |
| Restoration plan | Disable body drag; restore `cbd4039` trim first |

---

## 4. Component map at baseline

### Editorial workstation (year jobs — still live)

```
MediaLabEditorialReview.tsx
  └── FocusReviewDeck.tsx
        └── ClipSelectionPanel.tsx   ← cbd4039 logic, fixed clip bounds
```

### MS performance editor (baseline for unified workspace)

```
MediaLabMidnightSpecialClipReview.tsx   ← 74a0879 play + trim shell
  └── ClipSelectionPanel.tsx            ← fe74830/cbd4039 (no body drag)
```

### Current broken path

```
MediaLabWorkspace.tsx
  └── MediaLabPerformanceEditor.tsx     ← 65f3611 shell, sliding trim window
        └── ClipSelectionPanel.tsx      ← d011059 anchor patch + body drag
```

---

## 5. Restoration targets

| Priority | Restore from | Fix |
|----------|--------------|-----|
| 1–2 | `74a0879` transport in `MediaLabPerformanceEditor` | Align video element; verify `video.play()` |
| 3–4 | `cbd4039` `ClipSelectionPanel` | `clampIn`/`clampOut`, no body drag |
| 5 | `MediaLabEditorialReview` pattern | Fixed `trimWindow` from loaded context, not live selection |
| 6 | Body drag | Disabled until trim verified |

---

## 6. Files to change

| File | Action |
|------|--------|
| `components/ops/media-lab/ClipSelectionPanel.tsx` | Restore `cbd4039` |
| `components/ops/media-lab/MediaLabPerformanceEditor.tsx` | Stable trim window; align video with `74a0879` |

No new components. No UI redesign.
