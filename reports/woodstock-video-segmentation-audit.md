# Woodstock Video-Segmentation Audit

**Audit date:** 2026-07-29
**Scope:** Locate and assess the existing Retroverse/BobOS workflow for reviewing and cutting long source video.
**Safety:** This audit did not modify media, run an export, stage files, commit, or push. The only requested artifact created is this report.

## 1. Executive summary

The existing application is **Media Lab**, not RV06-01 as a generic “Collectible Library” assumption. In the current registry, **RV06-01 is officially titled Media Lab** and routes to `/ops/media-lab`; the repository’s present code and reports show that it is the video/media workspace. The separate Collectible Library correction is respected here: no video-segmentation behavior was attributed to RV06-01 merely from the correction text, and the audit found no different, better-named application that supersedes Media Lab.

Media Lab has two related workflows:

1. **General editorial review** for imported long videos: source video, transcript/segments, chapter timeline, filmstrip, in/out editing, classification, review state, saved job, and export manifests.
2. **Midnight Special performance review**: episode/performance browser, video preview, precise in/out adjustment, notes, accepted/rejected/exported lifecycle, manifest persistence, and mass export.

The first workflow is the closest fit for the 1970 Woodstock documentary because it is not hard-coded to Midnight Special. The second proves the strongest end-to-end reviewed-clip export path but is currently specialized around Midnight Special episode manifests and music-performance records. Woodstock is therefore supportable by restoring/using the general editorial workstation and extending its metadata/export vocabulary, not by building a new video editor.

## 2. Exact existing application found

**Official application name:** Media Lab
**RV identifier:** RV06-01
**RV category:** RV06 — Media
**Primary route:** `/ops/media-lab`
**Legacy/browser route:** `/ops/media-lab/performances` redirects into the unified Media Lab workspace.
**Purpose:** Internal asset workspace for importing/analyzing video, browsing reviewed performances, editing clips, classifying chapters, saving review state, and preparing export artifacts.

The canonical registry entry is in `lib/bobos/rv-registry.ts`. Its title, route, description, workspace, and `panelType: "media-library"` all identify Media Lab. `lib/bobos/cockpit/panel-library.ts` registers the corresponding Cockpit card as **Media Library**, with the summary “Local media assets and content library.” The card is therefore a Cockpit registration for the Media Lab surface, even though its display card title is Media Library.

**RV06-01 is excluded from the Woodstock interpretation as a Collectible Library.** The current repository registry does not contain a separate RV06-01 Collectible Library entry; the actual checked-in RV06-01 entry is Media Lab. The credentials/passes wording in the brief does not match the current RV registry entry or the Media Lab implementation inspected here.

## 3. Route and Cockpit registration

| Item | Verified value |
|---|---|
| Canonical route | `/ops/media-lab` |
| Legacy performance route | `/ops/media-lab/performances` |
| Structured collection handoff | `/ops/media-lab?collection=...&episode=...&mode=structured_collection` |
| Legacy clip-review handoff | `/ops/media-lab?collection=...&episode=...&mode=clip_review&performance=...` (redirected into unified workspace) |
| RV registry | `RV06-01`, title `Media Lab`, panel type `media-library` |
| Cockpit group | `catalog` |
| Cockpit card | `Media Library` |
| Ops gate | `RETROVERSE_OPS=1` is required for `/ops/media-lab` |

The page implementation is `apps/studio/app/ops/media-lab/page.tsx`. It renders `MediaLabWorkspace`, displays the internal Media Lab header, and returns an Ops-disabled message if the environment gate is absent. The legacy `clip_review` query is normalized to the unified workspace rather than rendering the old standalone editor.

## 4. Current architecture

### General editorial workflow

`MediaLabWorkspace.tsx` is the unified shell. Its editorial path is orchestrated by `MediaLabEditorialReview.tsx`, with the following workstation pieces:

| File | Role |
|---|---|
| `components/ops/media-lab/MediaLabWorkspace.tsx` | Unified library/sidebar and editor shell |
| `components/ops/media-lab/MediaLabEditorialReview.tsx` | General chapter review, save, queue, classification, merge/split, and export orchestration |
| `components/ops/media-lab/FocusReviewDeck.tsx` | Three-zone review layout: video, timeline, metadata |
| `components/ops/media-lab/ClipSelectionPanel.tsx` | In/out timeline controls and trim interaction |
| `components/ops/media-lab/ChapterFilmstrip.tsx` | Scene-context frames from the source video |
| `components/ops/media-lab/ClipQueueFilmstrip.tsx` | Chapter navigation / magnetic timeline |
| `components/ops/media-lab/CuratorClassificationPanel.tsx` | Classification UI |
| `components/ops/media-lab/ReviewQueuePanel.tsx` | Review queue drawer |
| `components/ops/media-lab/HarvestLibraryPanel.tsx` | Harvest/export library drawer |
| `lib/ops/media-lab/editorial/load-editorial.ts` | Loads job, source video, chapters, transcript segments, suggestions, and editorial metadata |
| `lib/ops/media-lab/editorial/editorial-meta.ts` | Reads/writes `editorial-meta.json` |
| `lib/ops/media-lab/editorial/export-editorial.ts` | Writes export chapter CSV and segment-label artifacts |

### Midnight Special workflow

`MediaLabPerformanceEditor.tsx` is the current performance editor used by the unified workspace. Its context is loaded by `apps/studio/app/api/ops/media-lab/performance/editor/route.ts` and the supporting `lib/ops/media-lab/performance-editor/*` modules. It includes video transport, filmstrip/thumbnails, in/out controls, artist/title/notes fields, review actions, sibling performance navigation, and export-queue access.

The old `MediaLabMidnightSpecialClipReview.tsx` remains as a legacy component, but `apps/studio/app/ops/media-lab/page.tsx` redirects old `clip_review` URLs into the unified workspace. The restoration audit records that the simplified component had bypassed the full workstation and that `MediaLabPerformanceEditor` was intended to restore it.

## 5. Feature assessment

| Requirement | Current evidence | Assessment |
|---|---|---|
| Load long source video | General import in `POST /api/ops/media-lab/transcribe`; editorial video route; job metadata stores `sourceVideo` | Working in the implemented workflow; source selection is file upload for general jobs, manifest-backed file for Midnight Special |
| Set in/out points | `ClipSelectionPanel`; editorial review and performance editor both pass trim bounds | Working, with historical trim regressions documented; current code contains the patched anchor behavior |
| Preview segment | HTML video routes plus filmstrip/thumbnails; trim-preview report verifies seek preview | Implemented; live runtime not rechecked because no local server was listening on port 3000 |
| Label a segment | Chapter title, segment labels, category, artist/title fields | Working, but general and Midnight Special metadata models differ |
| Classify a segment | `CuratorClassificationPanel`, editorial `category`, Midnight Special performance status/classification paths | Partial for Woodstock: existing buckets are curator/editorial and Midnight Special-oriented, not the requested complete Woodstock class set |
| Export clips | General workflow writes `chapters-export.csv` and segment-label files for LosslessCut; Midnight Special uses ffmpeg export code and effective bounds | Working in two different export models; general Media Lab is not a direct arbitrary-clip ffmpeg exporter |
| Preserve source timecodes | `chapters.csv`, `chapters-export.csv`, segment labels, timecode conversion, and Midnight Special start/end timecodes | Working for source bounds; no dedicated Woodstock record schema found |
| Resume later | Saved jobs under `RETROVERSE_DATA/YEARS/{year}/production/metadata/{job-slug}`; `GET jobs` and `POST jobs/load`; editorial metadata persists on disk | Working |
| Batch export reviewed segments | General export queue/artifacts; Midnight Special mass export and export manifest | Working for existing workflows; general arbitrary Woodstock ffmpeg batch export is incomplete |
| Safety behavior | Export filters require Keep/exportable state; path helpers constrain local media operations; source is read through API routes | Good documented guardrails; export was not exercised during this audit |

## 6. Persistence model

### General Media Lab jobs

The path helper documents the canonical convention:

`RETROVERSE_DATA/YEARS/{year}/production/metadata/{job-slug}/`

The job directory can contain `job.json`, the source/transcript outputs, `segments.json`, `chapters.csv`, `editorial-meta.json`, `segment-labels.json`, `segment-labels.txt`, and `chapters-export.csv`. `editorial-meta.json` currently supports:

- source review status;
- per-chapter review status;
- favorite flag;
- category;
- in/out seconds;
- length seconds.

The loaded editorial row also carries a stable editorial chapter ID, title, start/end seconds, duration, clock/timecode, review flags, and transcript-derived suggestions.

### Midnight Special manifests

The canonical performance record in `lib/ops/media-collections/midnight-special/types.ts` supports:

- `performance_id`, `episode_id`, episode title, air date;
- artist and song;
- detected start/end seconds and timecodes;
- confidence and status (`candidate`, `accepted`, `review`, `rejected`, `exported`);
- export path;
- adjusted start/end and modified timestamp;
- manual-edit flag and review notes.

This is a strong source-timecode and reviewed-export model, but its identity and metadata are performance/episode-specific.

## 7. Existing reports located and current-code correspondence

| Report | Finding | Current-code correspondence |
|---|---|---|
| `reports/media-lab/editor-restoration-audit.md` | Identifies the original full workstation and the simplified-editor regression | Corresponds to current component names; still relevant. It says the full workstation should use `MediaLabPerformanceEditor`; current workspace code does use that editor path. |
| `reports/media-lab/working-editor-baseline.md` | Records last-known-good trim/playback behavior and the sliding-window regression | Still relevant as a warning. It identifies `ClipSelectionPanel.tsx` and `MediaLabPerformanceEditor.tsx` as the key risk area. |
| `reports/media-lab/trim-preview-verification.md` | Verifies live trim preview, audio skim, pointer release, and save/reload | Corresponds to current trim-preview code/report lineage; not a fresh 2026-07 runtime verification. |
| `reports/media-lab/trim-editor-bugfix-verification.md` | Verifies client-safe imports, queue drawer, browser, and trim-anchor behavior | Corresponds to current file structure and APIs; historical verification, not a fresh live run. |
| `reports/media-lab/episode-browser-verification.md` | Verifies episode/performance browsing | Corresponds to current browser APIs and components. |
| `reports/media-collections/media-lab-performance-browser.md` | 2,471 Midnight Special performances; filters and Media Lab links | Current route/API shape remains present; Woodstock is explicitly listed as future/disabled in that report. |
| `reports/media-collections/midnight-special-episode-analysis-027bA7mICxM.md` | Chapter-aligned episode analysis with source timecodes and candidate performances | Specific to Midnight Special and not a Woodstock workflow. |
| `reports/media-collections/midnight-special-media-lab-integration.md` | Save adjusted bounds to manifest and use effective bounds on export | Corresponds to current Midnight Special manifest types and APIs. |
| `reports/media-collections/midnight-special-pilot-export.md` | 25-clip export pilot passed | Historical successful pilot; destination and metadata are Midnight Special-specific. |
| `reports/media-collections/midnight-special-mass-export.md` | 1,976 newly exported, 4 failed, resumable mass-export workflow | Demonstrates batch export and exposes prior `NaN` bound failures; not arbitrary-documentary ready by itself. |

## 8. Working features and known problems

### Working or substantially implemented

- Unified Media Lab route and library/editor shell.
- General source-video import and saved job discovery/load.
- Source video preview, generated thumbnails/filmstrips, transcript segments, and chapter timeline.
- Independent in/out trim behavior and live seek preview, according to the code and June verification reports.
- General chapter title editing, merge/split operations, review status, category, favorites, queue, and export preparation.
- Midnight Special performance browser, episode navigation, precision trim, notes, manifest persistence, effective bounds, and accepted-clip batch export.
- Source timecode conversion and persisted start/end values.

### Broken, incomplete, or risky for Woodstock

- No current Woodstock collection is enabled in the performance browser report; Woodstock is marked future/disabled.
- The Midnight Special editor assumes an episode/performance manifest and fields such as artist/song/status. It is not a neutral documentary-segment editor.
- The general editorial metadata model has `category`, but it does not define the requested Woodstock-controlled vocabulary or dedicated fields for artist/people, song, day/time, output filepath, and export status.
- General editorial export writes chapter/label manifests for downstream LosslessCut-style export; it does not itself provide the same direct ffmpeg batch export path demonstrated by Midnight Special.
- Historical reports document trim-window/body-drag regressions and playback/environment sensitivity. Body drag was specifically called out as disabled in the trim-preview report; the later bugfix report describes body drag behavior, so this should be rechecked before relying on drag-to-move semantics.
- The mass export report records four prior failures caused by `NaN` bounds, including pilot material. Export code needs bound validation before Woodstock use.
- Exported-file metadata in the Midnight Special workflow does not preserve all provenance fields in the file tags; source manifests remain the provenance layer.
- Live verification could not be completed: no application server was listening at `http://localhost:3000` during this audit. No Ops PIN flow was invoked, and no media was opened or changed.

## 9. Woodstock fit

### Desired segment classes

`performance`, `documentary_scene`, `interview`, `announcement`, `crowd`, `backstage`, `traffic`, `weather`, `production`, `transition`, `aftermath`, `unknown`

### Metadata coverage

| Desired field | Existing support | Gap |
|---|---|---|
| Segment ID | General editorial chapter ID; Midnight Special performance ID | Present; Woodstock can use editorial IDs |
| Source filename | Job `sourceVideo`; Midnight Special manifest `video_path` | Present |
| Source start/end timecode | Chapter start/end and timecode helpers; Midnight Special explicit fields | Present |
| Duration | General `durationSec`/length; performance end-start | Present |
| Segment class | General `category`; Midnight Special classification/grouping | Vocabulary not yet Woodstock-specific |
| Title | General chapter title; performance song/title | Present |
| Artist or people | Transcript/tag suggestions and performance artist; no general persisted people field | Missing as a dedicated general field |
| Song where applicable | Midnight Special `song`; general title can encode it but does not separate it | Missing as a dedicated general field |
| Day/time where known | Midnight Special air date/year; no general documentary day/time field | Missing |
| Notes | Review notes in performance model; general metadata has no notes field | Missing in general workflow |
| Review status | General source/chapter status; performance status | Present, but two incompatible vocabularies |
| Export status | Performance `export_path`/`exported`; general Keep/exportable state and export files | Present only partially in general workflow; no per-segment output status/path |
| Output filepath | Performance `export_path`; general export artifacts are job-level | Missing per segment in general workflow |

**Assessment:** Media Lab can support Woodstock as a reviewed segmentation workstation now, provided the general editorial path is used for the long source. It cannot yet claim full Woodstock-ready metadata/export parity without a small, targeted extension to the general editorial record and a validated batch export step.

## 10. Smallest recommended next sprint

Use the existing Media Lab general editorial workstation and make it Woodstock-aware in the smallest possible way:

1. Add a Woodstock/documentary classification vocabulary to the existing curator/editorial metadata path, including `performance` and `documentary_scene` plus the requested scene classes.
2. Add persisted general-segment fields for people/artist, song, day/time, notes, export status, and output filepath; retain source filename and source timecodes as canonical fields.
3. Add strict numeric bound validation before any export and a resumable per-segment export manifest, reusing the existing `RETROVERSE_DATA` job directory and export queue patterns.
4. Verify the restored editor live with a non-destructive sample source: load, preview, adjust in/out, save, reload, and inspect the saved manifest. Do not export the Woodstock source until the bounds and resume checks pass.

No new general video editor is warranted by this audit.

## 11. Exact files likely to change in that sprint

Likely scope, subject to implementation review:

- `components/ops/media-lab/CuratorClassificationPanel.tsx`
- `components/ops/media-lab/MediaLabEditorialReview.tsx`
- `components/ops/media-lab/ClipMetadataPanel.tsx`
- `lib/ops/media-lab/editorial/editorial-meta.ts`
- `lib/ops/media-lab/editorial/editorial-types.ts`
- `lib/ops/media-lab/editorial/load-editorial.ts`
- `lib/ops/media-lab/editorial/export-editorial.ts`
- `lib/ops/media-lab/editorial/review-status.ts`
- `lib/ops/media-lab/chapters-csv.ts`
- `apps/studio/app/api/ops/media-lab/editorial/route.ts`
- `apps/studio/app/api/ops/media-lab/editorial/export/route.ts`
- `lib/ops/media-lab/paths.ts` only if a Woodstock-specific job convention is needed; prefer the existing convention

The RV registry, route, and Cockpit registration should not be changed for this sprint.

## 12. Acceptance criteria

- RV06-01 remains correctly identified as the checked-in Media Lab entry; no Collectible Library behavior is attributed to it.
- `/ops/media-lab` opens with Ops enabled and the current unified workspace.
- A long local Woodstock source can be loaded without changing the source file.
- The editor previews the source and supports independent in/out adjustment.
- A segment can be assigned each requested class, with `unknown` available.
- Every saved segment has a stable ID, source filename, start/end timecode, duration, class, title, notes, review status, export status, and output path field (nullable before export), plus artist/people, song, and day/time where applicable.
- Save, close/reopen, and resume reproduce the same segment bounds and metadata.
- Invalid or missing bounds are rejected before export; no `NaN` ffmpeg invocation is possible.
- A reviewed subset can be batch-exported, skipped safely when already complete, and resumed after interruption.
- Exported records retain source timecodes and link to their output paths.
- Verification uses a harmless sample and does not overwrite the Woodstock source.

## 13. Definition of done

The audit is complete: the existing video-segmentation tool is identified, its route/RV/Cockpit registration and current architecture are verified from code, prior reports are compared against current files, Woodstock suitability and gaps are documented, no media or unrelated files were modified, and nothing was staged, committed, or pushed.

## Decisive recommendation

**Use the existing Media Lab application at RV06-01 (`/ops/media-lab`) and extend its general editorial workflow for Woodstock.** It is the usable existing cutting workflow; it needs a small Woodstock metadata/classification and validated batch-export extension, not replacement by a new general video editor.
