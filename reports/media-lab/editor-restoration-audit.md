# Media Lab Editor Restoration Audit

**Date:** 2026-06-09

## Reference: Last Full Workstation

The original Media Lab editing workstation lives in:

| Component | Role |
|-----------|------|
| `MediaLabEditorialReview.tsx` | Orchestrator — chapters, save, queue, harvest, classification |
| `FocusReviewDeck.tsx` | Three-zone layout — video, timeline, metadata sidebar |
| `ClipSelectionPanel.tsx` | IN/OUT timeline with thumbnail rail |
| `ChapterFilmstrip.tsx` | Scene-context preview frames (every 10s) |
| `ClipQueueFilmstrip.tsx` | Magnetic bottom timeline / chapter nav |
| `CuratorClassificationPanel.tsx` | Type classification grid |
| `ReviewQueuePanel.tsx` | Kept-clips queue drawer |
| `HarvestLibraryPanel.tsx` | Harvest library drawer |

Commits establishing this layout: `fe74830`, `8151dac`, `6848d94` (magnetic timeline).

## What Regressed (commit `74a0879` → `92ee0f4`)

`MediaLabMidnightSpecialClipReview.tsx` was introduced as a **simplified clip editor** for Midnight Special performances. When unified into `MediaLabWorkspace`, it replaced the full workstation in the main panel.

### Removed / bypassed for performance editing

| Capability | Original | Regression (`MediaLabMidnightSpecialClipReview`) |
|------------|----------|--------------------------------------------------|
| Filmstrip thumbnails | `ChapterFilmstrip` + ffmpeg frames | None — abstract bar only |
| Timeline thumb rail | `ClipSelectionPanel` + `ensureChapterThumbnails` | `thumbs={null}` |
| Metadata sidebar | `FocusReviewDeck` right column | Header bounds text only |
| Classification | `CuratorClassificationPanel` / bucket | Not shown |
| Accept / Reject | Review queue + review API | Not available |
| Queue drawer | `ReviewQueuePanel` | Not available |
| Harvest drawer | `HarvestLibraryPanel` | Not available |
| Notes | Editorial fields | Not available |
| Episode performance nav | `ClipQueueFilmstrip` magnetic | Not available |
| Body drag (move clip) | `ClipSelectionPanel` range body | Disabled (`pointer-events: none`) |

### Preserved (correct — not reverted)

| Capability | Status |
|------------|--------|
| `MediaLabWorkspace` library sidebar | Kept |
| Performance / episode browse | Kept |
| Search + filters | Kept |
| URL structure | Kept |
| Legacy redirects | Kept |
| `OpsMediaLab` import workflow | Kept (library=imported) |

## Restoration Strategy

Replace `MediaLabMidnightSpecialClipReview` in `MediaLabWorkspace` with `MediaLabPerformanceEditor`:

- Reuses `FocusReviewDeck` CSS layout classes (`ops-ml-deck--review`)
- Restores `PerformanceFilmstrip` (MS-specific ffmpeg API)
- Restores `ClipSelectionPanel` with thumbnails + body drag
- Restores metadata sidebar, accept/reject, save, queue, harvest, notes
- Adds episode performance sibling strip at bottom

`MediaLabMidnightSpecialClipReview.tsx` retained but no longer used in workspace (legacy standalone path redirects to workspace).

## New APIs

- `GET /api/ops/media-lab/performance/editor` — full editor context
- `GET /api/ops/media-lab/performance/filmstrip` — scene frames
- `GET /api/ops/media-lab/performance/thumbnails` — timeline thumb rail
