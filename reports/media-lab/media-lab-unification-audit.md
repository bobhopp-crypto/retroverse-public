# Media Lab Unification Audit

**Date:** 2026-06-09

## 1. Entry Points (before unification)

| Entry | Route | Purpose |
|-------|-------|---------|
| Media Lab hub | `/ops/media-lab` | Import + editorial OR clip_review swap |
| Performance Browser | `/ops/media-lab/performances` | Standalone performance search |
| clip_review deep links | `/ops/media-lab?mode=clip_review&...` | MS performance editor (replaced import UI) |
| structured_collection | `?mode=structured_collection` | Banner only |
| Collection detail | `GET .../media-lab?episode=` | Opens href in new tab |
| MS Review Queue | `buildClipReviewHrefFromRecord()` | Open in Media Lab |

## 2. Import Workflow

- **Component:** `OpsMediaLab.tsx`
- **APIs:** `transcribe`, `chapters`, `segment-labels`, `jobs`, `jobs/load`, `open-local`
- **Output:** `RETROVERSE_DATA/YEARS/{year}/production/metadata/{jobSlug}/`
- **Status:** Unchanged — now renders in workspace main panel when Library = Imported Videos

## 3. Analyzed-Video / Editorial Workflow

- **Component:** `MediaLabEditorialReview.tsx` → `FocusReviewDeck`
- **APIs:** `editorial` GET/PUT, export, export-queue, video, thumbnails, OCR
- **Status:** Unchanged — nested inside `OpsMediaLab` after chapters exist

## 4. Harvest Workflow

- **Library:** `~/MEDIA_LAB_LIBRARY/_MANIFESTS/manifest.json`
- **UI:** `HarvestLibraryPanel` (drawer in FocusReviewDeck)
- **APIs:** `harvest-library`, `editorial/export-queue`
- **Status:** Also available in workspace main panel when Library = Harvest Queue

## 5. clip_review Workflow (legacy)

- **Component:** `MediaLabMidnightSpecialClipReview.tsx`
- **APIs:** `midnight-special/clip-review` GET/POST
- **Problem:** Replaced entire Media Lab page — parallel shell
- **Migration:** Embedded in workspace main panel; legacy URLs redirect

## 6. Performance Browser (legacy)

- **Route:** `/ops/media-lab/performances`
- **Component:** `MediaLabPerformanceBrowser.tsx`
- **API:** `performances/browse`
- **Problem:** Separate page, duplicate navigation
- **Migration:** Sidebar browse in `MediaLabWorkspace`; route redirects

## Unification Target

```
/ops/media-lab
└── MediaLabWorkspace
    ├── MediaLabLibrarySidebar (sections + collections)
    ├── MediaLabLibraryBrowse (search/filters/lists)
    └── Main panel
        ├── OpsMediaLab (import + editorial)
        ├── MediaLabMidnightSpecialClipReview (embedded editor)
        ├── MediaLabEpisodeDetail
        ├── MediaLabExportedDetail
        └── HarvestLibraryPanel
```

## APIs Added

- `GET /api/ops/media-lab/library/episodes`
- `GET /api/ops/media-lab/library/exported`
- `POST /api/ops/media-lab/library/reveal-path`
