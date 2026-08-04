# Woodstock Media Lab Segmentation Implementation

**Date:** 2026-07-29
**Scope:** Promote the existing Media Lab to a canonical BobOS route and add the neutral foundation for Woodstock-capable editorial segments.
**Safety:** No Woodstock source was loaded, changed, or exported. Nothing was staged, committed, or pushed.

## 1. Live route verification

The repository had no pre-existing `/bobos/media-lab` route or conflicting application. The audited `/ops/media-lab` route was the existing unified Media Lab workspace.

The canonical Studio command was attempted with `RETROVERSE_OPS=1`. Binding to port 3000 failed with a sandbox `EPERM`; an escalated local attempt on port 3001 compiled the application and reached Next.js “Ready,” but the process was not reachable for a subsequent HTTP request. Therefore no PIN-authenticated browser page was altered and no media workflow was exercised live in this sprint.

## 2. RV/Cockpit naming findings

- Application: **Media Lab**
- RV: **RV06-01**
- Canonical route: **`/bobos/media-lab`**
- Compatibility route: **`/ops/media-lab`**, redirecting to the canonical route with query parameters preserved
- Legacy performance route: **`/ops/media-lab/performances`**, redirecting to the canonical route
- Cockpit card: **Media Library**, now launches `/bobos/media-lab`
- The registry still identifies RV06-01 as Media Lab; no renumbering or renaming was performed.
- The BobOS route is protected by the existing Ops-enabled/PIN flow in middleware. Media Lab APIs remain the existing `/api/ops/media-lab/*` surface, so state, APIs, components, and persistence are not duplicated.

## 3. Files changed

- `apps/studio/app/bobos/media-lab/page.tsx` — new canonical BobOS page entrypoint.
- `apps/studio/app/ops/media-lab/page.tsx` — compatibility redirect only.
- `apps/studio/app/ops/media-lab/performances/page.tsx` — legacy redirect now targets BobOS.
- `apps/studio/middleware.ts` — applies the existing Ops/PIN trust boundary to `/bobos/media-lab`.
- `packages/shared/components/ops/MediaLabRoute.tsx` — one shared route renderer for both entrypoints.
- `packages/shared/lib/bobos/rv-registry.ts` — RV06-01 route changed to `/bobos/media-lab`.
- `packages/shared/lib/bobos/cockpit/panel-library.ts` — Media Library primary action changed to `/bobos/media-lab`.
- `packages/shared/lib/ops/command-center.ts` and `packages/shared/lib/atlas/workshop-rooms.ts` — internal Media Lab links now use the canonical route.
- `packages/shared/lib/ops/media-lab/editorial/segment-manifest.ts` — versioned neutral segment schema, bound validation, output containment, fingerprint helper, atomic write/read helpers.
- `packages/shared/lib/ops/media-lab/editorial/segment-manifest.test.ts` — deterministic validation tests.

## 4. Architecture

The editor remains the existing `MediaLabWorkspace` and its general editorial workstation. Both routes call the same `renderMediaLabRoute`; `/ops/media-lab` no longer owns an independent implementation. Existing APIs and job directories remain unchanged.

The new manifest foundation is neutral: `editorial-segments.json` is suitable for Woodstock and future documentaries. It is separate from the Midnight Special episode manifest and does not require Midnight Special records.

## 5. Segment schema

The schema defines stable IDs, source filename/fingerprint, numeric bounds, timecodes, duration, primary class, secondary class, title, artist/people, song, festival day/time, description, notes, review lifecycle, export lifecycle, output path, and timestamps.

Primary classes are `performance`, `documentary_scene`, and `unknown`. Secondary vocabularies include the requested documentary and performance classes. Review statuses are `draft`, `review`, `approved`, and `rejected`; export statuses are `not_queued`, `queued`, `exporting`, `exported`, and `failed`.

## 6. UI workflow

The existing workstation remains the UI: video preview, filmstrip/timeline, in/out controls, chapter review, save/resume, and existing review/export controls. The new schema foundation is not yet wired into the editor’s visible Woodstock metadata controls. No second Woodstock editor was created.

## 7. Persistence

The existing job convention remains authoritative:

`RETROVERSE_DATA/YEARS/{year}/production/metadata/{job-slug}/`

The new helper uses `editorial-segments.json` and writes via temporary sibling plus atomic rename. Existing `editorial-meta.json` and chapter CSV compatibility is preserved. Full manifest synchronization with the current PUT/POST editorial routes remains outstanding.

## 8. Bound validation

`validateSegmentBounds` rejects non-finite values, negative starts, non-positive durations, end-before-start, invalid source duration, and end values beyond the source duration with a small technical tolerance. `validateOutputPath` rejects output escape and source overwrite. These validators are deterministic and prevent invalid values from being accepted by the new segment layer; direct ffmpeg batch integration is not yet wired to them.

## 9. Export behavior

The existing general Media Lab export path remains available and produces chapter/label artifacts. The new direct reviewed-segment ffmpeg batch exporter requested by the brief was not implemented in this pass. No source or output media was touched.

## 10. Resume behavior

Existing Media Lab saved-job listing/loading remains unchanged and is reachable through the canonical BobOS route. Atomic manifest helpers are present, but per-segment export resume/status persistence still needs to be connected to the general editorial API.

## 11. Sample source validation

Not run. No harmless sample media was selected or exported because the route could not be completed through live HTTP/PIN verification in the available environment.

## 12. Woodstock source readiness

Not run. No Woodstock source path, technical metadata, job shell, or fingerprint was created. This deliberately avoids touching or modifying source media.

## 13. Source immutability proof

No source path was opened by the implementation work, no ffmpeg/ffprobe media command was run, and no export directory was written. The worktree contains unrelated pre-existing changes; the implementation did not overwrite them.

## 14. Tests

Passed:

`npx --yes tsx --test packages/shared/lib/ops/media-lab/editorial/segment-manifest.test.ts`

Result: 4 passed, 0 failed.

The full Studio TypeScript check was attempted. It is currently blocked by unrelated pre-existing credential-library errors:

- `credentialsLibraryPath` missing from `@/lib/bobos/credentials/paths`
- `credentialsMigrationReportRoot` missing from `./paths`

No Media Lab-specific TypeScript error was reported before those failures.

## 15. TypeScript result

Targeted segment tests pass. Full `npx tsc --noEmit -p apps/studio/tsconfig.json` does not pass because of the unrelated credential-library errors above.

## 16. Build result

No production build was run. The local Next.js dev process compiled the application during startup on the escalated port-3001 attempt, but live HTTP verification did not remain available.

## 17. Known gaps

The route/trust-boundary migration is implemented. The broader Woodstock segmentation sprint is not complete yet. Remaining work is to wire the new schema into the existing editorial save/load API and UI, add the requested metadata controls, connect strict validation to direct ffmpeg/ffprobe export, implement approved/queued/resumable per-segment export, and run the harmless sample validation before opening Woodstock.

## 18. Exact proposed staging list

Do not stage automatically. If the implementation is continued, review these files as the intended sprint scope:

- `apps/studio/app/bobos/media-lab/page.tsx`
- `apps/studio/app/ops/media-lab/page.tsx`
- `apps/studio/app/ops/media-lab/performances/page.tsx`
- `apps/studio/middleware.ts`
- `packages/shared/components/ops/MediaLabRoute.tsx`
- `packages/shared/lib/bobos/rv-registry.ts`
- `packages/shared/lib/bobos/cockpit/panel-library.ts`
- `packages/shared/lib/ops/command-center.ts`
- `packages/shared/lib/atlas/workshop-rooms.ts`
- `packages/shared/lib/ops/media-lab/editorial/segment-manifest.ts`
- `packages/shared/lib/ops/media-lab/editorial/segment-manifest.test.ts`
- `reports/woodstock-media-lab-segmentation-implementation.md`

## 19. Definition of done

The canonical route migration portion is complete: BobOS launches `/bobos/media-lab`, the Ops route is compatibility-only, the existing workspace is shared, the PIN boundary is retained, and registry/internal links agree. The complete Woodstock segmentation implementation is not yet done because the sample media/export verification and UI/API/export wiring were intentionally not completed after live route verification failed.

---

## Continuation checkpoint — 2026-07-29

The continuation sprint inspected the prior implementation before changing it. The canonical route migration was preserved. No `/bobos/media-lab` conflict was found, and no second editor or route-specific API family was introduced.

### Continuation files added

- `apps/studio/app/api/ops/media-lab/editorial/segments/route.ts` — authorization-gated load/save/delete endpoint for `editorial-segments.json`, including source-fingerprint mismatch protection, bounds validation, output containment, stable-ID replacement, chronological sorting, and atomic writes.

### API and persistence behavior

`GET` returns the manifest and reports whether the current source fingerprint differs. `PUT` creates or updates a stable-ID segment, or deletes by explicit `deleteId`; it rejects missing jobs/sources, invalid bounds, source overwrite, and output-root escape. Source changes return HTTP 409 unless explicitly acknowledged. Writes use a temporary sibling followed by rename.

### Remaining gaps

The browser metadata form, full segment lifecycle controls, direct resumable ffmpeg/ffprobe exporter, export panel, harmless sample media run, Finder reveal verification, screenshot capture, Woodstock source readiness inspection, and live browser verification remain outstanding. The general editor still uses its existing chapter review controls; the new neutral manifest endpoint is not yet connected to those visible controls.

### Continuation verification

- Neutral segment validation: **4 passed, 0 failed**.
- Full Studio TypeScript remains blocked by unrelated pre-existing credential-library path exports (`credentialsLibraryPath`, `credentialsMigrationReportRoot`).
- No source media was loaded or modified.
- No ffmpeg/ffprobe export was run.
- Nothing was staged, committed, or pushed.

### Updated status

The canonical route migration and validation/API foundation are complete, but the requested end-to-end Woodstock browser workflow is **not complete** until the remaining UI wiring, export implementation, harmless sample validation, and live verification are performed.

## Final continuation verification — 2026-07-29

The existing unified Media Lab workspace now contains the Woodstock segment editor panel. It is loaded from the canonical `/bobos/media-lab` route and uses the shared editorial segment API; no second editor or duplicate persistence layer was introduced.

Browser verification on the local BobOS route completed the following:

- Selected `/tmp/woodstock-media-lab-sample.mp4` through the normal import control.
- Confirmed the existing transcribe action reports the missing local `apps/studio/tools/media-lab/transcribe.py` dependency rather than silently claiming success.
- Loaded the existing `media-lab-stability-test` job through the saved-job control.
- Opened Advanced mode and confirmed Set In, Set Out, Preview Selection, New Segment, metadata fields, Save Segment, Save & Next, Duplicate, Reject/Restore, Delete, and filtering are present.
- Saved `Woodstock Sample Performance` as a performance segment.
- Reloaded the browser, reloaded the saved job from disk, and confirmed the segment remained in the editorial segment list.

Validation results:

- Segment manifest tests: **4 passed, 0 failed**.
- `npx tsc --noEmit -p apps/studio/tsconfig.json`: **passed**.
- No source Woodstock media was opened or changed, and no export was run.
- Nothing was staged, committed, or pushed.

The usable browser save/reload workflow is now verified. Exporter implementation and export verification remain outside this continuation checkpoint; the missing local transcription script is also a pre-existing environment dependency surfaced by the harmless sample run.

## Transcription restoration continuation — 2026-07-29

### Historical findings

The transcription script did exist and is tracked at `tools/media-lab/transcribe.py`. Git history attributes the runner contract to the original Media Lab implementation (`9e33d9579d`), and the repository README documents the same local workflow. The script was not deleted; the observed failure was a path-resolution bug in the runtime wrapper.

`run-transcribe.ts` used `process.cwd()` as the repository root. When the Studio server was launched from `apps/studio`, it looked for `apps/studio/tools/media-lab/transcribe.py` instead of the tracked root-level `tools/media-lab/transcribe.py`.

### Restored contract

The runner now walks upward from the working directory until it finds the tracked script. It continues to invoke Python with an argument array and the existing contract:

`transcribe.py --video SOURCE --output-dir JOB_DIR --year YEAR --job-slug SLUG --source-filename NAME --model MODEL`

The authoritative artifacts remain:

- `segments.json`: timed transcription segments and the source for chapter generation.
- `transcript.txt`: plain transcript consumed by the existing job reader.
- `captions.srt` / `captions.vtt`: timed caption views.
- `chapters.csv`: LosslessCut-compatible suggested chapter boundaries generated by the existing shared TypeScript chapter builder.
- `job.json`: job metadata, model, duration, counts, source fingerprint, and runtime.
- `editorial-segments.json`: separate human-reviewed segment authority; rerunning transcription does not replace approved editorial records.

The local engine is `faster-whisper`, CPU `int8`, using the configured model (default `base`). No cloud fallback or automatic model download was added. Audio is extracted locally with ffmpeg as mono 16 kHz PCM and removed after transcription. JSON artifacts now use atomic replacement for the transcription segment file and job metadata.

### Disposable sample validation

The existing harmless `/tmp/woodstock-media-lab-sample.mp4` was analyzed successfully with the cached `base` model:

- Runtime: `faster-whisper/cpu/int8`
- Source duration: `8.010875` seconds
- Transcript segments: `0` (the sample contains a tone, not speech)
- Suggested chapters: `1` (`Full video` fallback)
- Source fingerprint: `1eba739a64f6004a9706b9b24553a5c6445bf68c18e1e48047f41f3688e81f7b`
- Artifacts: `/tmp/media-lab-transcription-restore-2/{job.json,segments.json,transcript.txt,captions.srt,captions.vtt,chapters.csv}`

The command completed through ffmpeg extraction, local Whisper analysis, and the existing chapter builder. The zero-segment result is expected for this non-speech fixture, so browser suggestion quality was not claimed from it.

### Verification and limitations

- Studio TypeScript: **passed**.
- Targeted Media Lab tests: **8 passed, 0 failed**.
- Woodstock media was not opened, modified, transcribed, or exported.
- No automatic analysis was added when a source is selected.
- Full progress/cancel/versioned-analysis browser controls and a speech-bearing sample fixture remain future work; this continuation restores the broken existing analysis contract and its path bug only.

## Safe resumable export continuation — 2026-07-29

This continuation added the server-safe export policy foundation without touching source media or repairing transcription:

- `export-policy.ts` centralizes approved-only/queued-only eligibility, source-fingerprint checks, finite bounds and duration checks, approved-root containment, source-overwrite rejection, sanitized output naming, and argument-array ffmpeg construction for `stream_copy` and `transcode`.
- The neutral segment type now carries export method, timestamp, ffprobe validation, failure reason, and retry count fields needed by the resumable lifecycle.
- Output naming follows the requested class/subtype directory shape and preserves the segment ID.
- Eight targeted tests pass, including the original four manifest tests and four export-policy tests.
- Studio TypeScript passes.

## Woodstock source analysis — 2026-07-30

### Source and preflight

The requested source was used exactly as provided; no alternate source search or selection was performed:

`/Users/bobhopp/Downloads/YouTube/Woodstock Festival 1969 (Remastered).mp4`

Read-only inspection:

- File exists: **yes**
- Size: **1,192,499,080 bytes**
- Duration: **4,546.283 seconds** (`01:15:46.283`)
- Resolution: **1920 × 1080**
- Frame rate: **25 fps**
- Video codec: **H.264**
- Audio codec: **AAC**, stereo, 48 kHz
- Modified: **2026-07-29 23:22:39 -0500**
- Source fingerprint: **`e7434f2de8132538dd434160a12abdeb5bb708d360d3b6f3f2b8480d17ea369f`**

No existing job under `RETROVERSE_DATA/YEARS/1969/production/metadata/` matched this fingerprint before analysis. The job was created at:

`/Users/bobhopp/RETROVERSE_DATA/YEARS/1969/production/metadata/woodstock-1970-documentary/`

### Local analysis

The restored local workflow completed successfully:

1. ffmpeg mono 16 kHz PCM extraction
2. cached faster-whisper `base` transcription
3. timed transcript and caption generation
4. shared chapter suggestion generation in `content` mode
5. atomic `segments.json` and `job.json` writes
6. existing Media Lab job loader verification

Runtime settings: **faster-whisper / CPU / int8 / cached base model**. No cloud service or model download was used. Wall-clock analysis runtime was **31.09 seconds** (`82.15s` user CPU, `19.57s` system CPU). The extracted `_audio_16k.wav` was retained for verification and is approximately **145 MB**.

Artifacts:

- `/Users/bobhopp/RETROVERSE_DATA/YEARS/1969/production/metadata/woodstock-1970-documentary/job.json`
- `/Users/bobhopp/RETROVERSE_DATA/YEARS/1969/production/metadata/woodstock-1970-documentary/segments.json`
- `/Users/bobhopp/RETROVERSE_DATA/YEARS/1969/production/metadata/woodstock-1970-documentary/transcript.txt`
- `/Users/bobhopp/RETROVERSE_DATA/YEARS/1969/production/metadata/woodstock-1970-documentary/captions.srt`
- `/Users/bobhopp/RETROVERSE_DATA/YEARS/1969/production/metadata/woodstock-1970-documentary/captions.vtt`
- `/Users/bobhopp/RETROVERSE_DATA/YEARS/1969/production/metadata/woodstock-1970-documentary/chapters.csv`
- `/Users/bobhopp/RETROVERSE_DATA/YEARS/1969/production/metadata/woodstock-1970-documentary/_audio_16k.wav`

### Results and quality review

- Transcript segments: **47**
- Generated chapters: **7**
- Existing loader returned **47 source segments** and **7 normalized chapter rows**.
- Representative transcript begins with the festival announcement and logistics copy, then covers traffic/crowd material and later closing announcements. Recognition is broadly coherent, but proper names are unreliable (`Joan Bont`, `Johnny Winter`, and other phrases need editorial correction); some late long segments are under-segmented.
- Chapter titles are plausible but not publication-ready. Durations range from **6.57 seconds** to **3,550.20 seconds**, with median **35.60 seconds**; 3 chapters are under 15 seconds and 2 exceed 10 minutes. The final `Live One Day` chapter is especially broad and should be manually subdivided.
- Suggestions remain unapproved. No editorial segment approval, clip export, or automatic acceptance was performed.

### Browser verification and safety

The existing loader was verified directly against the persisted job and returned the transcript preview and chapter list. An in-app browser session was not available in this task environment, so live verification of `/bobos/media-lab`, source preview playback, chapter-selection seeking, and visible no-export state could not be completed or claimed. No export was started.

The source remained unchanged: no move, rename, transcode, edit, or write operation targeted the source path. No source modification was observed after analysis. Nothing was staged, committed, or pushed.

### Recommended editorial follow-up

Use the generated transcript and chapters as unapproved working material only. Correct proper names, split the broad closing chapter, review the short opening chapters, and perform browser-level preview/seeking verification when the local Media Lab browser session is available. No staging is proposed by this analysis-only checkpoint.

## Filmstrip timelines and playhead synchronization — 2026-07-30

### Scope and correction

The existing Manual Clip Cutter was retained. This change is limited to the linked Overview and Detail timelines; it does not add analysis, chapter, approval, queue, export, or source-processing behavior.

The prior Detail Timeline recalculated its range from every source-time update while **Follow Playhead** was enabled. This made the playhead appear permanently centred. The cutter now has one authoritative `playhead` source time and a separate, explicit fixed Detail range.

### Interaction contract

- Native video time updates, keyboard/preview seeking, Overview navigation, Detail navigation, and marked-clip selection all update the same source playhead.
- Overview navigation maps to the entire source and rebuilds the fixed Detail range after pointer completion.
- Detail navigation maps only inside its current fixed range and never recentres it.
- Recenter and changing the 10-second, 30-second, 1-minute, or 5-minute option explicitly rebuild the Detail range using the documented source-edge clamping rules.
- Selecting a marked clip seeks and frames its Start. Start/End marker changes remain local until the existing Add or Update action persists a clip.

### Filmstrips and cache boundary

The existing job-bound editorial filmstrip endpoint was extended rather than duplicated. It accepts a year/job identity, constrained range, bounded count, profile, and source fingerprint; it loads the source only from that job's metadata and rejects a fingerprint mismatch. It does not accept a filesystem path from the browser.

Derived JPEG frames and manifests live under the job's existing non-authoritative `filmstrip/` cache. Cache keys include the job source fingerprint, profile, and requested range; manifests are atomically replaced. The cache is disposable and never becomes editorial authority. A thumbnail failure leaves both timelines interactive and shows one concise status message.

The Overview requests 30 sparse frames across the 01:15:46 source. The Detail request is bounded to 8–48 dense frames for its visible local range. Requests use cancellation so stale Detail responses are ignored after reframing; no source write, transcription, chapter generation, approval, queueing, or export is triggered.

### Verification

Focused deterministic tests passed: **14 passed, 0 failed**. They cover source/detail geometry, fixed-window behavior, edge clamping, position mapping, bounded contained sample times, and fingerprint/profile/time cache identity. The Studio TypeScript check passed.

Live browser verification and screenshots could not be completed in this run: `http://127.0.0.1:3001/bobos/media-lab` was no longer reachable from the local runtime; the in-app browser retained only a generic stale error shell, not the authorized PIN/workspace. No PIN boundary was bypassed and no screenshot is represented as a successful UI verification. First/cached thumbnail timing likewise awaits a running authorized Studio session.

### Source safety

The Woodstock source was not opened for modification, moved, renamed, transcoded, retranscribed, or exported. No persistent manual clip was created by this implementation work. Nothing was staged, committed, or pushed.

### Intended review scope

- `packages/shared/components/ops/media-lab/MediaLabChapterEditor.tsx`
- `packages/shared/lib/ops/media-lab/manual-clip-cutter.ts`
- `packages/shared/lib/ops/media-lab/manual-clip-cutter.test.ts`
- `packages/shared/lib/ops/media-lab/editorial/filmstrip.ts`
- `apps/studio/app/api/ops/media-lab/editorial/filmstrip/route.ts`
- `apps/studio/app/ops/ops.css`
- `reports/woodstock-media-lab-segmentation-implementation.md`

## Live BobOS browser verification — 2026-07-30

### Job load and runtime checks

Studio was opened at the canonical route:

`http://127.0.0.1:3001/bobos/media-lab`

The existing Ops/PIN-enabled route loaded the unified Media Lab workspace. The year selector initially omitted 1969; the client-safe Media Lab year options were extended to include 1969 so the existing job could be reached through the normal UI. No new job was created and the load banner explicitly reported: **“Loaded saved job from disk — no retranscribe.”**

The saved job appeared as `Woodstock Festival 1969 (Remastered).mp4 · 47 seg · 7 ch` and loaded as **Woodstock 1970 Documentary**. The source preview loaded through the existing editorial video API and reported:

- duration: **4,546.283 seconds**
- current source URL: `/api/ops/media-lab/editorial/video?year=1969&jobSlug=woodstock-1970-documentary`
- media ready state: **4**
- visible video footage confirmed in the browser
- queue: **0 clips**
- export button: disabled
- review status: all displayed editorial records remained `draft`/unapproved

The persisted source fingerprint was confirmed in `job.json` as `e7434f2de8132538dd434160a12abdeb5bb708d360d3b6f3f2b8480d17ea369f`. The browser UI does not currently render the fingerprint or full codec metadata, so those values were verified from the read-only preflight/job artifact rather than claimed as visible UI fields. No source mismatch warning appeared.

### Chapter inventory

The seven generated chapters were inspected in the live editor. Classifications below are editorial assessments only; no chapter was approved.

| # | Title | Start | End | Duration | Classification | Boundary assessment | Multiple scenes/performances | Recommended split points |
|---|---|---:|---:|---:|---|---|---|---|
| 1 | Art Fair | 00:00:19.500 | 00:00:28.620 | 9.12s | documentary_scene | Start useful; end cuts into the next announcement | No | Keep as an opening announcement, possibly merge with #2 |
| 2 | Joan Bont Richie Havens | 00:00:28.620 | 00:00:35.190 | 5.67s | documentary_scene | Start is clean; end is too short and name is mistranscribed | No | Merge with #1 or extend through the full festival announcement |
| 3 | Johnny Winter | 00:00:35.190 | 00:01:10.790 | 35.60s | documentary_scene | Start is usable; end lands on ticket/gate logistics rather than a scene change | No | Split/retitle around artist-list copy versus ticket logistics |
| 4 | Woodstock Music | 00:01:10.790 | 00:02:52.120 | 101.33s | mixed | Start follows the announcement; end is not a reliable boundary | Yes, announcement/logistics/production material | Split around the festival identification, crowd/traffic report, and production-room exchange |
| 5 | Richard Bach | 00:02:52.120 | 00:16:21.860 | 809.74s | mixed | Start catches a production call; end lands in spoken introduction before music | Yes, production calls, crowd/reportage, interview/announcement, song introduction | Must split at obvious production calls, crowd/logistics transitions, interview changes, and music starts |
| 6 | Sticks River Ferry | 00:16:21.860 | 00:16:36.100 | 14.24s | documentary_scene | Start and end are technically aligned but too short for a useful standalone segment | No | Merge into adjacent spoken/music context |
| 7 | Live One Day | 00:16:36.100 | 01:15:46.300 | 3,550.20s | mixed | Start is a real song boundary; end is only the film ending/medical announcement | Many performances, interviews, crowd scenes, logistics, and credits | Split extensively at music starts/stops, interview changes, announcements, crowd/logistics transitions, and end credits |

Visible examples included documentary/reportage footage in the opening and mid-film chapters and a visible live performance in chapter 7. Chapter 5 showed production/audio-room dialogue around “Richard Bach”; chapter 7 showed a performance image while its transcript moved through music and closing announcements.

### Transcript quality assessment

All **47 transcript segments** loaded in the browser. The transcript is useful for broad search and locating spoken announcements, but not publication-ready:

- Festival announcements and traffic/logistics material are often recognizable and searchable.
- Production/intercom phrases such as “monitors,” “sound,” and “Richard Bach” are partially captured and useful as rough anchors.
- Proper names are frequently wrong: examples include `Joan Bont`, `can't heat`, `Johnny Winter` in a malformed sentence, and other artist/name substitutions.
- Lyrics and sung material are sometimes emitted as speech-like text; long musical passages are sparsely represented or absent.
- The final transcript includes a plausible closing request about cleanup and goodbyes, but ends with a clearly unreliable medical phrase: `Doctor, please go to the thinking work, medical tech.`
- No obvious repeated full-text hallucination loop was observed, though short repeated phrases such as “That's it. That's it.” occur in the source-like announcement context.
- No measurable global timecode drift was observed: browser video duration and chapter endpoints align with the persisted 4,546.283-second duration. The main issue is coarse segmentation, not clock drift.
- Useful search zones: opening festival announcement, vehicle turn-back logistics, production-room calls, crowd/cleanup announcements, and closing remarks.
- Weak zones: lyrics, proper names, long performance stretches, and the final medical/closing phrase.

### Interaction and diagnostics

- Selecting chapter cards advanced the live clip position correctly; selecting chapter 1 set the video to **19.5 seconds**, and chapter navigation reached chapters 5–7 at their expected starts.
- Manual `Set In` and `Set Out` controls were present and responded. The displayed trim state updated to the current chapter bounds without saving a draft.
- Transcript text was visible, but clicking transcript lines did **not** change the video playhead from the current chapter position. This is a browser interaction defect: transcript seeking is not verified as working.
- No source mismatch warning appeared.
- No export began; queue remained at 0 and `Export Keep (0)`/`EXPORT TO HARVEST` remained disabled.
- Browser console diagnostics returned no warnings or errors.
- No broken API request was observed during load, chapter navigation, or preview playback.

### Screenshots captured

The browser verification captured these views: loaded Woodstock job, transcript and chapter 1 with visible source preview, chapter 5 (`Richard Bach`) as a mixed/problematic chapter, and chapter 7 (`Live One Day`) with visible performance footage. The fingerprint and codec metadata are not rendered by the current UI; they remain recorded above from the read-only job artifact and preflight.

### Decisive recommendation

**B. The chapters are too coarse and chapter generation needs one narrow adjustment before Bob begins reviewing the film.**

Smallest deterministic adjustment: impose a shorter maximum chapter duration and split at existing transcript-segment boundaries, while preserving detected silence/scene boundaries where available. A practical first pass is a maximum of approximately **5 minutes**, followed by manual review of performance starts/stops. This does not require a new AI system. The transcript-click seeking defect should also be fixed before review begins, because it prevents the transcript from functioning as a reliable navigation surface.

Exact next step: update the deterministic chapter builder to split oversized chapters at existing transcript boundaries (starting with chapter 7), then repair transcript-line click-to-seek and rerun only chapter generation from the existing `segments.json`; do not rerun transcription, approve segments, export clips, or modify the source.

Source immutability, no automatic approval, no export, and no staging/commit/push were preserved throughout this verification.

## Chapter refinement continuation — 2026-07-30

### Transcript-seeking root cause and fix

The transcript strip rendered `<p>` elements without any click handler, so selecting visible transcript text could not affect the source video. The strip now renders transcript lines as keyboard-focusable buttons, calls the existing `seekToSec` player path with the segment start, and applies a selected-line highlight. This changes only player position and local selection state; it does not alter chapter bounds or create editorial segments.

Live verification confirmed a click on the `00:28` line moved the source video to **28.62 seconds** and produced the selected-line state. Chapter seeking, repeated navigation, and manual In/Out controls continued to work. The current fix uses the same behavior for first, middle, and late transcript lines when they are visible in the active transcript window.

### Deterministic refinement algorithm

The new versioned `chapter-refinement` layer uses only the existing transcript segment start boundaries. Chapters at or below **10 minutes** are left untouched. Oversized chapters are split near 10-minute targets, with a minimum child duration of **30 seconds**; a short final tail is merged into the prior child. Original seven chapters remain the authoritative visible chapter list and are not overwritten.

Each refined child retains `refinementVersion: v1`, parent chapter ID and bounds, child ID and bounds, included transcript segment IDs, transcript excerpt, split reason, source fingerprint, analysis run ID, generated timestamp, and explicit `unapproved` status. The layer is recomputed deterministically from the existing `chapters.csv`, `segments.json`, and `job.json` rather than rerunning transcription.

The full-review UI now exposes a collapsible **Refined suggestions** panel beneath the original review tools. It shows parent reference, start/end, duration, transcript excerpt, split reason, and unapproved state. Preview is wired to the existing source player; accept/edit/reject controls are present but disabled until the reviewed-segment persistence/export workflow is explicitly implemented. No automatic approval occurs.

### Woodstock chapter 7 validation

Original chapter 7 (`ch-6`, displayed as `Live One Day`) was **3,910.176 seconds / 65:10.176** in the normalized loader timeline and contained the final 17 transcript segments. The refinement produced **6** child suggestions:

| Child | Start | End | Duration |
|---|---:|---:|---:|
| 1 | 00:16:36.100 | 00:20:47.210 | 04:11.110 |
| 2 | 00:20:47.210 | 00:35:44.660 | 14:57.450 |
| 3 | 00:35:44.660 | 00:44:19.790 | 08:35.130 |
| 4 | 00:44:19.790 | 00:49:57.200 | 05:37.410 |
| 5 | 00:49:57.200 | 01:05:50.280 | 15:53.080 |
| 6 | 01:05:50.280 | 01:15:46.300 | 09:56.020 |

No child was under 30 seconds. Within the refined chapter-7 parent range there were **no gaps and no overlaps**, and source coverage was complete. Two children remain over 10 minutes because the available transcript boundaries are sparse; the algorithm honored existing boundaries and did not invent scene or performer boundaries.

### Full-job refinement statistics

- Original chapters: **7**
- Refined child suggestions: **8**
- Chapters split: **2** (`ch-4` / original chapter 5 and `ch-6` / original chapter 7)
- Shortest child: **228.71 seconds**
- Longest child: **953.08 seconds**
- Median child: **581.03 seconds**
- Children still over 10 minutes: **2**, both in original chapter 7
- Gaps within each refined parent: **0**
- Overlaps within each refined parent: **0**
- Orphan transcript segments inside refined parents: **0**

### Browser verification

The live `/bobos/media-lab` browser check loaded the saved Woodstock job with the status **“Loaded saved job from disk — no retranscribe.”** The original seven-chapter list remained visible, and the refined panel displayed all 8 unapproved children. A transcript-line click sought the video to its exact segment start and visibly selected the line. The source preview remained available, the refinement Preview action uses the existing player seek path, queue remained empty, and no export or approval occurred. Browser diagnostics returned no console warnings/errors, and no broken API request was observed.

Screenshots captured during this continuation included the transcript line selected after seeking, the original chapter list, and the refined suggestions panel with chapter-7 children and provenance details. The source video remained unchanged.

### Tests and type checking

Passed targeted tests: **12/12** across chapter refinement, segment manifest, and export policy suites. Coverage includes no-split behavior, transcript-boundary splits, multiple splits, short-tail merge, continuity, provenance, stable IDs, deterministic reruns, and unapproved status. Studio TypeScript: **passed**.

### Known limitations

- The current transcript strip exposes the active transcript window rather than a separate full-document navigation index; first/middle/last verification requires the corresponding chapter/window to be selected.
- Refined suggestions are a versioned deterministic loader layer, not yet a separately written `chapter-refinements.json` artifact.
- Children over 10 minutes can remain when no eligible existing transcript boundary is available near the target; no scene recognition or new AI system was added.
- Accept/edit/reject controls remain intentionally disabled until reviewed-segment persistence and export policy are connected.

### Exact proposed staging list

- `packages/shared/lib/ops/media-lab/editorial/chapter-refinement.ts`
- `packages/shared/lib/ops/media-lab/editorial/chapter-refinement.test.ts`
- `packages/shared/lib/ops/media-lab/editorial/load-editorial.ts`
- `packages/shared/components/ops/media-lab/ClipTranscriptStrip.tsx`
- `packages/shared/components/ops/media-lab/MediaLabEditorialReview.tsx`
- `apps/studio/app/ops/ops.css`
- `packages/shared/lib/ops/ops-focus-year.ts`
- `reports/woodstock-media-lab-segmentation-implementation.md`

### Definition of done

Transcript-line seeking now works and highlights the selected line. Oversized chapters are refined at existing transcript boundaries while original chapters remain preserved. Woodstock chapter 7 is subdivided into 6 unapproved children with complete parent coverage. Targeted tests and TypeScript pass. Live browser verification passed for the loaded job, seeking, refinement display, source immutability, no approvals, and no exports. Nothing was staged, committed, or pushed.

This checkpoint is intentionally not marked complete: the executable export worker, ffprobe result persistence, queue API/actions, export panel, Finder reveal integration, restart reconciliation, and disposable sample export run still need implementation and live verification. No ffmpeg export was run, no output hashes or ffprobe results exist yet, and nothing was staged, committed, or pushed.

## One-screen chapter editor reset — 2026-07-30

### Current interface audit

The previous imported-job path exposed the full editorial workstation after loading: setup/import controls, raw transcript preview, chapter review, refined suggestions, naming, classification, Keep/Reject, Harvest, queue, marked segments, and export preparation. That was the wrong primary surface for the first editing task.

The imported-job path now uses a dedicated `MediaLabChapterEditor`. The deeper `MediaLabEditorialReview`, Woodstock segment panel, refinement layer, and export foundations remain available in the codebase and their persisted files are preserved, but they no longer dominate the primary imported-source screen.

### Simplified one-screen architecture

The new primary workspace contains:

- compact source header with source name, duration, chapter/marker counts, and explicit Load Video / Transcribe / Suggest Chapters / Save Chapters actions;
- one large source `<video>` player;
- one full-source chapter timeline with ranges, markers, playhead, click seek, and drag scrub;
- bounded zoom controls and slider;
- selected chapter controls for Add Marker, Delete Marker, Undo, and Play Chapter;
- one collapsible selected-chapter transcript with clickable lines.

Naming, classification, editorial approval, refined-suggestion acceptance, marked clips, queueing, and export actions are hidden from this main chapter-editing workflow. No new transcription engine or AI system was introduced.

### Chapter-map authority and preservation

The original generated `chapters.csv`, transcript artifacts, refinement data, editorial segment manifest, source fingerprint, and existing saved job remain unchanged. The new operator authority is a separate atomic `chapter-map.json` artifact:

`RETROVERSE_DATA/YEARS/{year}/production/metadata/{job-slug}/chapter-map.json`

It stores version, source fingerprint, source duration, ordered stable markers, marker provenance (`generated` or `operator`), and timestamps. Chapters are derived from source start, internal markers, and source end. The source map begins at 0 and ends at the recorded source duration. Loading an existing job creates an in-memory recommendation map from the existing generated chapter boundaries; Save Chapters writes the operator map separately. It does not overwrite `chapters.csv`.

### Timeline, Fit Entire Source, zoom, and scrubbing

The chapter timeline is normalized to the complete source duration. Fit Entire Source uses the full bounded source track with no horizontal navigation requirement in the new editor. Zoom levels are bounded from overview through close detail, with Zoom In, Zoom Out, a slider, Fit Entire Source, and Fit Selected Chapter. Command/Control-minus, Command/Control-plus/equal, and Shift-Z are wired when focus is outside text fields.

Clicking empty timeline space seeks. Dragging empty timeline space scrubs. The playhead is a strong vertical line and updates from normal video playback, transcript clicks, chapter selection, and timeline interaction. Marker dragging is constrained by source bounds and minimum chapter duration; marker movement is held in local state until explicit Save Chapters.

### Marker editing and undo

- Add Marker inserts an operator marker at the playhead after finite/boundary/neighbor checks.
- Clicking a chapter range selects it and seeks to its start.
- Dragging a marker changes its time without crossing neighboring markers.
- Delete Marker removes only an internal marker and merges the adjacent derived ranges.
- Source start and end are structural boundaries and cannot be deleted.
- Undo restores the most recent marker-map snapshot for add, move, or delete.
- M adds a marker; Delete/Backspace deletes the selected internal marker; arrows nudge playhead by 1 second or 10 seconds with Shift; Space toggles playback outside text fields.

### Transcript behavior

Only the transcript for the selected derived chapter is shown. Transcript lines seek the single source player and highlight the active line. The raw setup transcript preview and the separate refined-suggestion transcript surfaces are no longer in the primary imported-job screen.

### Save/reload and overwrite protection

`PUT /api/ops/media-lab/chapter-map` validates source duration, fingerprint presence, finite marker values, minimum chapter spacing, and source containment before atomically writing `chapter-map.json`. Reload reads the saved map exactly and does not retranscribe. Suggestion data remains separate; operator edits do not silently overwrite the original generated analysis. Existing editorial manifests and refinement provenance are not migrated or deleted.

### Performance safeguards

The new timeline renders chapter ranges and sparse marker geometry rather than thousands of thumbnails. It uses one video player, one bounded DOM timeline, and local state during pointer movement. No manifest writes occur during scrubbing or marker dragging. The existing deeper thumbnail infrastructure remains dormant on this primary path.

### Browser verification status

Code-level checks passed, but a fresh live browser verification could not be completed because the local server redirected `/bobos/media-lab` to the normal `/internal/ops-pin` authorization flow and no authorized browser tab was available to reuse. No PIN was bypassed and no credentials were guessed. Therefore live confirmation of marker dragging, save/reload, and screenshots remains pending an authorized browser session.

### Tests and TypeScript

Focused deterministic tests passed: **17/17** across chapter-map sorting/derivation/boundary validation, timeline geometry, refinement, segment manifest, and export policy. Studio TypeScript passed. No transcription, export, approval, queueing, or source modification occurred.

### Known limitations

- The source header actions are compact workflow affordances; actual file selection/transcription remains in the existing setup path rather than being duplicated in the new editor.
- Suggest Chapters currently communicates the existing recommendation foundation rather than launching a new analysis run; it does not overwrite an edited map.
- Full live browser verification is blocked by the normal Ops PIN session requirement.
- The new editor intentionally does not expose naming, classification, editorial approval, marked clips, or export selection in this sprint.

### Exact proposed staging list

- `packages/shared/lib/ops/media-lab/chapter-map.ts`
- `packages/shared/lib/ops/media-lab/chapter-map.test.ts`
- `apps/studio/app/api/ops/media-lab/chapter-map/route.ts`
- `packages/shared/components/ops/media-lab/MediaLabChapterEditor.tsx`
- `packages/shared/components/ops/OpsMediaLab.tsx`
- `apps/studio/app/ops/ops.css`
- `reports/woodstock-media-lab-segmentation-implementation.md`

### Acceptance and definition of done

The primary imported-job experience is now a one-screen source/chapter editor with one player, one full-source timeline, bounded zoom, direct scrubbing, marker add/move/delete/undo, selected-chapter transcript, and explicit chapter-map save. Original generated data and deeper later-phase workflows remain preserved. Focused tests and Studio TypeScript pass. Live browser acceptance remains pending normal PIN authorization; nothing was staged, committed, or pushed.

## Media Lab timeline and clip-selection UX continuation — 2026-07-30

### Current UI audit and architecture

The existing source player is `FocusReviewDeck`, the current trim surface is `ClipSelectionPanel`, and the long-source chapter strip is `ClipQueueFilmstrip`/`MagneticTimeline`. The magnetic strip already had lazy-loaded chapter thumbnails, a horizontal scroll viewport, a minimap, a playhead, and a zoom slider, but its main track only selected chapters; it did not map arbitrary pointer positions back to source time. The trim panel already had guarded In/Out handles and dimmed outside-range layers, but it remained chapter-local.

This continuation reused those components. No new editor or export worker was introduced.

### Timeline navigation and zoom changes

- Added source-time mapping from timeline pixels through the existing magnetic timeline geometry helpers.
- Clicking the empty timeline track seeks the source video.
- Pointer dragging across the empty track scrubs through source time; chapter buttons and merge controls remain protected from accidental scrub handling.
- Added Zoom In, Zoom Out, Fit Entire Source, and Fit Selection controls alongside the existing slider.
- Added Command/Control-plus, Command/Control-minus, and Shift-Z keyboard shortcuts, while leaving text inputs unaffected.
- Existing session-scoped zoom persistence remains in place.
- Existing horizontal scrolling and minimap navigation remain the scroll model.
- The playhead continues to derive from the shared `playheadSec` state, so chapter, transcript, source-player, minimap, and direct timeline seeks use one position.

### Filmstrip and In/Out behavior

The existing magnetic thumbnail rail remains bounded and lazy-loaded; it does not create a new thousands-of-frames renderer. The current thumbnail height remains 72px in this narrow continuation, so larger scene-identification thumbnails and the requested 120–160px primary rail remain a follow-up visual refinement.

The existing `ClipSelectionPanel` continues to provide visible IN/OUT handles, readouts, selected-range highlighting, outside-range dimming, minimum one-second containment, and explicit trim-preview behavior. The new full-source track interaction does not continuously persist trim state.

### Mark Clip and Marked Clips

The existing neutral `editorial-segments.json` authority was extended with `includeForExport?: boolean`, defaulting to `false` for new drafts. The Woodstock segment panel now presents **Mark Clip** as the explicit save action, preserves the current source fingerprint, and labels its persisted list **Marked Clips**. It shows marked count and selected-for-export count, and provides explicit Include for Export / Exclude from Export actions. Review status remains draft by default; no approval, queueing, or export is triggered.

The existing manifest API still writes atomically and retains source-fingerprint mismatch protection. No destructive migration or manifest rewrite was performed.

### Tests and TypeScript

Added focused magnetic timeline tests for source/time conversion, bounded minimum-width geometry, and out-of-range clamping. Combined focused tests passed: **15/15** across timeline geometry, chapter refinement, segment manifest, and export policy. Studio TypeScript passed. `git diff --check` passed.

### Browser verification status

The final fresh browser smoke pass could not reach the authorized workspace because the local server correctly redirected `/bobos/media-lab` to `/internal/ops-pin?next=%2Fbobos%2Fmedia-lab`, and no previously authorized browser tab was available to reuse. I did not bypass the PIN flow, enter an unknown credential, or claim live interaction results. Therefore the following remain pending live verification in an authorized browser session: direct timeline click/scrub, zoom controls, Fit Selection, Mark Clip persistence/reload, Include/Exclude persistence, and the full screenshot set.

The source was not opened for editing or modified. No Woodstock clip was saved during this continuation, no approval occurred, no export began, and nothing was staged, committed, or pushed.

## Manual clip cutter with overview and detail timelines — 2026-07-30

### Workflow reset

The primary imported-job workflow is now manual clip cutting rather than transcription-driven chapter editing. The authority hierarchy is:

1. source video;
2. manually marked clips;
3. optional transcript/AI assistance;
4. generated chapters and refinements as hidden analysis artifacts.

The existing chapter editor, chapter map, transcript/refinement data, editorial review, approval, and export code remain preserved but do not control the primary cutter.

### Manual Clip Cutter architecture

`MediaLabChapterEditor` now provides one source player, a full-source Overview Timeline, a linked Detail Timeline, explicit Start/End controls, Preview Clip, Add Clip, and a persistent Marked Clips panel. The overview is continuous and source-relative; the detail view is a bounded window around the playhead. No generated chapter boundaries are shown as editing authority.

Detail windows are fixed and predictable: **10 seconds, 30 seconds, 1 minute, and 5 minutes**, with 1 minute as the default. Follow Playhead is enabled by default; disabling it holds the current detail range and exposes Recenter.

Both timelines accept click and pointer-drag scrubbing. The single video player updates the shared playhead from native playback, timeline seeks, and clip selection. Detail ranges clamp at source start and end. Start and End markers are displayed when visible in the detail window, and outside-range media remains represented without altering the source.

### Clip range and persistence

Set Start and Set End operate only on local state until Add Clip or Update is explicitly pressed. Preview Clip seeks to Start, plays, and pauses at End. Invalid, non-finite, reversed, and out-of-source ranges are blocked.

Add Clip writes through the existing atomic neutral editorial segment manifest with:

- stable manual ID;
- source filename and source fingerprint;
- start/end timecodes and duration;
- temporary title (`Clip 001`, `Clip 002`, …) when unnamed;
- notes;
- `provenance = manual` represented by the manual cutter path and draft review status;
- `includeForExport: true` as the documented default;
- no approval, queueing, or export state transition.

Marked Clips remain visible while navigating. Selecting a row restores Start/End, title, notes, and player position. Update preserves the stable ID. Delete requires explicit confirmation and removes only the selected manifest record. Include for Export is independently persisted.

### Transcription and performance safeguards

Transcription is not required for manual editing and is not triggered by loading, seeking, or adding clips. The overview renders lightweight geometry and saved ranges; the detail timeline renders only markers and the current window. Scrubbing changes local/player state and does not write manifests continuously. No source media was modified and no export worker was invoked.

### Live browser verification

Live verification remains blocked by the normal Ops PIN redirect: a fresh `/bobos/media-lab` navigation reaches `/internal/ops-pin`, and no authorized browser tab was available to reuse. The PIN flow was not bypassed and no credentials were guessed. Therefore the real-browser checklist for overview/detail scrubbing, four detail-window sizes, Add Clip, reload, and Marked Clips selection remains pending an authorized session.

### Tests and TypeScript

Focused tests passed: **20/20**, covering manual detail-window clamping, range validation, stable manual IDs, chapter-map behavior, timeline geometry, refinement, manifest safety, and export-policy safety. Studio TypeScript passed.

### Known limitations

- The source header retains the existing source-loading setup path; the manual cutter itself does not duplicate file selection or transcription.
- The current transcript surface is intentionally compact and optional rather than a primary editing authority.
- The UI is implemented but cannot be claimed live-verified until the normal Ops PIN session is available.
- Thumbnails are not yet rendered in the detail window; the current detail surface is structural and source-time precise.

### Exact proposed staging list

- `packages/shared/lib/ops/media-lab/manual-clip-cutter.ts`
- `packages/shared/lib/ops/media-lab/manual-clip-cutter.test.ts`
- `packages/shared/components/ops/media-lab/MediaLabChapterEditor.tsx`
- `apps/studio/app/ops/ops.css`
- `reports/woodstock-media-lab-segmentation-implementation.md`

### Acceptance and definition of done

The imported-job primary experience now centers manual clips with linked Overview and Detail timelines, four fixed detail windows, synchronized single-player seeking, Start/End, Preview Clip, Add Clip, Marked Clips, stable IDs, atomic persistence, and persisted Include for Export state. Automated chapter/transcript systems do not create or replace manual clip boundaries. Focused tests and TypeScript pass; live browser acceptance remains pending normal PIN authorization. Nothing was staged, committed, or pushed.

### Known limitations

- The primary magnetic filmstrip is still 72px high; the requested larger 120–160px visual treatment was not expanded in this checkpoint.
- Fit Entire Source currently selects the bounded overview zoom level rather than dynamically fitting the complete duration to the viewport width.
- Marked Clips remains within the existing Woodstock segment panel rather than a separate global panel; it is authoritative and persisted but still chapter-contextual.
- Live verification is blocked only by the normal Ops PIN authorization state, not by a reported application API or TypeScript error.

### Exact proposed staging list

- `packages/shared/components/ops/media-lab/ClipQueueFilmstrip.tsx`
- `packages/shared/components/ops/media-lab/FocusReviewDeck.tsx`
- `packages/shared/components/ops/media-lab/WoodstockSegmentPanel.tsx`
- `packages/shared/lib/ops/media-lab/editorial/segment-manifest-client.ts`
- `packages/shared/lib/ops/media-lab/magnetic-timeline-nav.test.ts`
- `reports/woodstock-media-lab-segmentation-implementation.md`

### Acceptance and definition of done

The implementation now provides direct track seeking/scrubbing hooks, bounded zoom controls and keyboard shortcuts, explicit Mark Clip wording, persisted export-selection intent, and a clearer Marked Clips summary while preserving the neutral manifest and safety boundaries. Code-level acceptance and focused tests pass. Full sprint acceptance remains pending until Bob authorizes the normal PIN flow in the real browser and the live interaction/screenshot checklist can be completed.

## Media Lab Cutter workspace reset — 2026-07-30

### Outcome

The `/bobos/media-lab` primary experience is now a single-screen, dark editorial Cutter workspace. The route resumes the last active saved job and immediately presents:

- one source video;
- one fixed-window Detail Filmstrip;
- one compact In/Out edit bar;
- one ripple-closed Working Timeline;
- one persistent right-side Extracted Clips panel.

The old source-library browser, setup card, chapter editor, generated chapter browser, transcript-review workflow, approval surfaces, queue controls, harvest controls, and export controls are no longer rendered in the primary Media Lab path. Their implementation files remain preserved for compatibility and future secondary workflows.

The final live workspace restored the original active job:

- source: `Woodstock Festival 1969 (Remastered).mp4`;
- source duration: `01:15:46.276`;
- transcript state: `Transcribed · 50`;
- persisted manual clips: one original `Clip 001`;
- remaining Working duration: `01:12:24`;
- active mode after reload: `Working`;
- resume status: `Active job restored automatically. No retranscription.`

### Audit and primary-route freeze

The two prior audit/implementation reports were read before the reset. The current components and authorities were traced through the route, workspace, job loader, source video route, editorial manifest, filmstrip cache, transcript data, chapter data, approval/export policy, and existing manual-cutter helpers.

Reusable infrastructure retained:

- the existing Ops route and PIN/session gate;
- job discovery and explicit source loading;
- source-video streaming;
- transcript and source-duration metadata;
- filmstrip generation and cached frame serving;
- source fingerprints;
- atomic JSON writes;
- existing manual editorial records as a migration source only.

Primary rendering is now frozen at `MediaLabCutterWorkspace`. `MediaLabWorkspace` is intentionally a thin compatibility boundary, and `MediaLabRoute` no longer contributes a second header or source/setup UI. Legacy components were not deleted.

### Workspace architecture and single state owner

`MediaLabCutterWorkspace` owns the live editing session:

- active job and saved-job chooser;
- source metadata and transcript;
- one video element and its playhead;
- Source versus Working playback mode;
- Detail window start/end;
- active In mark;
- extracted-clip manifest;
- remaining Working ranges;
- playback guard for ripple joins and clip previews;
- save/error/status feedback.

The header keeps source identity, exact duration, load/transcript/save state, Source/Working mode, Change Source, and Undo visible without introducing a second workflow. A new source can still be chosen explicitly, but transcription remains an explicit operator action and never runs on resume, seek, extraction, return, undo, or reload.

At the live 1728×1117 validation viewport, the workspace occupied exactly one viewport with the global and BobOS navigation removed for this route. The primary grid contained one video, the timeline stack below it, and the Extracted Clips panel at right. No legacy Media Lab library or chapter editor node was present.

### Server-persisted resume behavior

The last active job preference is stored server-side at:

`RETROVERSE_DATA/ops/media-lab/cutter-workspace.json`

On load, the workspace validates that preference against current saved jobs. If the preference is absent or invalid, it selects the most recently active valid job from saved job metadata. Choosing another saved source updates the preference atomically. A browser reload reconstructed the selected source and edit state without retranscription.

The final preference was restored to:

`1969:woodstock-festival-1969-remastered-2026-07-30T14-34-10`

### Cutter edit model

The dedicated versioned edit artifact is:

`clip-extractions.json`

It stores:

- source filename, duration, and fingerprint;
- extracted clips in chronological source order;
- stable clip IDs that do not depend on display sequence;
- exact source In/Out seconds;
- title and title source;
- transcript excerpt and overlap coverage;
- `includeForExport`;
- operator notes;
- provenance;
- a bounded undo history.

The source video is never rewritten. The edit model derives Working footage as the exact complement of normalized extracted source ranges:

`Working = [0, sourceDuration] − union(extracted ranges)`

This supports zero clips, one clip, multiple clips, adjacent clips, a source-start extraction, a source-end extraction, and a fully ripple-closed representation without generating new media.

### Source time and Working time

Source time remains the permanent coordinate system for the video, transcript, clip identities, stored In/Out points, and filmstrip cache.

Working time is a virtual coordinate system whose duration is the sum of all remaining ranges. Dedicated helpers provide:

- Working time → source time;
- source time → Working time;
- pointer position → Working time → source time;
- extracted source position → nearest virtual join;
- next remaining range after a join;
- final Working playback stop.

At a virtual join, Working-to-source mapping selects the next remaining source range. Source positions inside an extracted range clamp to that range's join. No edit rewrites the source coordinate system.

### Detail Filmstrip and edit controls

The Detail Filmstrip is a fixed source-time window with cached thumbnails and direct fine scrubbing. Its default span is one minute, with 10-second, 30-second, one-minute, and five-minute controls plus Recenter.

Verified live interactions:

- clicking the Detail Filmstrip sought the one video;
- pointer dragging scrubbed source time;
- `I` set an exact active In mark;
- `O` attempted one atomic extraction from active In to the current playhead;
- `Escape` cleared the active In mark;
- Left/Right moved by 0.1 seconds;
- Shift-Left/Shift-Right moved by one second;
- Space toggled playback;
- Command-Z undid the last extraction/return transaction.

The active In readout and its marker remained visible after an invalid Out attempt.

### Atomic extraction and overlap safety

An `O` extraction validates the complete operation in memory before any manifest write. It rejects:

- non-finite values;
- negative or out-of-source values;
- reversed ranges;
- ranges below the minimum duration;
- duplicates;
- any overlap with an existing extracted clip;
- any source-fingerprint mismatch.

On success, the transaction creates one stable manual clip, inserts it chronologically, recalculates Working ranges, clears the active In mark, and returns the exact ripple playhead. One atomic JSON write then commits the complete manifest.

Live extraction used:

- In: approximately `00:00:21.085`;
- Out: approximately `00:00:24.018`;
- resulting playhead: the ripple-closed boundary at the Out point;
- Working duration reduction: approximately 2.934 seconds.

An overlapping second range beginning at `00:00:22.002` was blocked with the conflicting clip title and ID. The extracted clip count remained one, the Working duration did not change, and the active In mark remained set.

### Multiple clips, joins, return, and undo

Multiple disposable clips were created on the clean saved test job. The Extracted Clips panel remained in chronological source order and the Working Timeline rendered one virtual join per extracted range.

Return to Timeline removed only the chosen clip and restored its exact source interval to the Working complement in chronological position. Undo restored that same clip with its stable identity and metadata. Subsequent undo operations removed both disposable extractions and reduced the edit history to zero.

Final cleanup state:

- clean test job `woodstock-1970-documentary`: zero clips, zero history entries;
- restored active job: one original migrated `Clip 001`, zero history entries.

No disposable test clip remains in either saved manifest.

### Ripple playback and bounded clip Preview

Working playback uses the virtual remaining ranges rather than pausing at an extraction boundary. The live valid-source test began at approximately `00:03:25.221`, encountered the temporary extracted gap, reported:

`Ripple join → 00:03:27.496`

and continued to approximately `00:03:29.303`. This verifies that playback skipped the removed source interval and continued in Working mode.

A separate short temporary clip was opened with Preview. Preview started at that clip's In point and stopped at its exact Out point, reporting:

`Preview complete — Did you have a sit there`

The observed final playhead was `00:03:31.200`. The temporary clip was then undone.

### Transcript overlap and titles

Transcript association uses true interval overlap:

`transcript.end > clip.in && transcript.start < clip.out`

Segments fully outside the clip are excluded. Coverage is labeled full or partial, and the right panel shows the clipped transcript excerpt with an expandable full overlapping transcript when available.

Title generation is deterministic:

1. a useful phrase from overlapping transcript text;
2. an existing matching saved label;
3. `Clip NNN` fallback.

The first live extraction produced:

`Music in Art Fair, the three-day Aquarian Exposition at…`

The inline title field persisted an operator edit, and the Include for Export checkbox persisted both off and back on. Operator titles are not replaced by later deterministic title derivation.

No Ollama call was made. The local deterministic transcript/title rules were sufficient and avoided adding model latency or nondeterministic state to an exact edit operation.

### Legacy migration and source fingerprints

Migration is one-way into `clip-extractions.json` and reads only explicitly manual legacy segments with a matching source fingerprint and valid contained range. Generated, refined, approved, queued, exported, malformed, mismatched, or non-manual legacy records cannot become Cutter clips.

The legacy editorial manifest itself is not rewritten. The original active job's valid manual record migrated once as:

- ID: `manual-74abed1171-0-4bsg-1`;
- title: `Clip 001`;
- source range: `0` → `201.9039988`;
- provenance: `manual`;
- Include for Export: enabled.

Fingerprint computation now uses `mtimeMs.toFixed(3)`, matching the precision used when job fingerprints were originally stored. GET can report a changed source, but a current fingerprint mismatch cannot trigger migration or any write. Every mutation requires the request fingerprint, current source fingerprint, job fingerprint, and edit-manifest fingerprint to agree.

Final source-integrity check:

- size: `1,192,499,080` bytes;
- mtime: `1785422052509.5356` ms;
- recomputed fingerprint: `74abed1171ebfe5c1129195d398cf1a0becb1a3cbba5f46cf0081711127efff7`;
- stored job fingerprint: identical.

The source file was only streamed/read and was not edited.

### Filmstrip cache and long-source performance

The filmstrip path remains bounded:

- Detail requests sample only the visible source window;
- Working overview requests a small fixed sample count across remaining ranges;
- existing cached JPEGs are reused;
- an incomplete cache can be reconstructed from valid existing frames;
- endpoint sampling avoids requesting a frame exactly beyond decodable media;
- newly generated frames use a verified JPEG-compatible ffmpeg path.

Working thumbnails are sampled in Working time but resolve back to source timestamps, so they reflow after every extraction without copying or regenerating the source video. The final live page rendered 43 cached filmstrip images rather than thousands of thumbnails for the 75-minute source.

The source-video stream now owns request cancellation cleanup, preventing a reload or source switch from closing an already closed stream controller.

### Live browser verification

The earlier PIN blocker was resolved by using the existing authorized in-app browser session. The PIN flow was not bypassed.

Verified in the real browser:

- canonical `/bobos/media-lab` route;
- automatic active-job resume;
- explicit same-screen saved-source chooser;
- one video element;
- no primary legacy library/chapter editor;
- one-viewport layout;
- cached filmstrip thumbnails;
- Detail click seeking and drag scrubbing;
- In mark, Escape, arrow-step, Shift-arrow-step, and Out extraction;
- transcript excerpt/title generation;
- shortened Working duration and visible ripple join;
- blocked overlap with preserved In;
- multiple extracted clips;
- Working click seek;
- ripple playback across a removed range;
- bounded clip Preview;
- inline title persistence;
- Include for Export off/on persistence;
- expanded transcript details where transcript overlap existed;
- Return to Timeline;
- Command-Z undo;
- reload reconstruction with no retranscription;
- restoration of the original active job.

The final browser console query returned zero errors. Historical development-tab warnings from the pre-fix CSS and transient Next.js hot-refresh route recompilation remained in the tab log, but the two CSS compatibility warnings were corrected and the final fresh page/API load completed normally.

### Browser captures

All captures are in `reports/media-lab-cutter-reset/`:

1. `01-clean-cutter-active-restored.png`
2. `02-full-initial-working-timeline.png`
3. `03-active-in-mark.png`
4. `04-first-extraction-shortened-timeline.png`
5. `05-overlap-blocked.png`
6. `06-undo-restored-full-timeline.png`
7. `07-multiple-extracted-virtual-joins.png`
8. `08-inline-title-expanded-transcript.png`
9. `09-returned-clip-restored.png`
10. `10-undo-return-restored-clips.png`
11. `11-reloaded-persisted-clean.png`
12. `12-ripple-playback-skipped-gap.png`
13. `13-bounded-clip-preview-complete.png`
14. `14-saved-source-chooser.png`
15. `15-migrated-clip-panel.png`
16. `16-final-active-workspace.png`

### Automated verification

Focused automated checks passed:

- `45/45` tests;
- zero failures, skips, or cancellations;
- Studio TypeScript: passed;
- `git diff --check`: passed.

Coverage includes:

- full-source/no-clip Working range;
- one, multiple, adjacent, source-start, and source-end extractions;
- duration conservation;
- overlap, duplicate, finite-value, bounds, and minimum-duration validation;
- Working/source mappings and join behavior;
- pointer mapping;
- Working filmstrip sampling;
- stable IDs;
- true transcript overlap;
- deterministic and operator-protected titles;
- Include for Export;
- Return to Timeline;
- undo extraction and undo return;
- source-fingerprint mismatch blocking;
- manual-only legacy migration;
- atomic write/reload reconstruction;
- server-persisted active-job preference;
- prior manual cutter, magnetic timeline, chapter refinement, and export-policy safety.

### Known limitations

- The migrated `Clip 001` predates Cutter transcript capture and therefore has no overlapping transcript excerpt stored in the migrated record. It is intentionally not rewritten or heuristically backfilled on load.
- Compact duration labels display whole seconds, so a valid sub-second clip can visually read `0:00` even though its exact millisecond In/Out values and duration are preserved.
- The right-side panel intentionally has unused vertical space when only one clip exists; it is reserved for a longer chronological extraction list.
- Development hot refresh briefly produced transient route recompilation responses while files were being edited. The final fresh browser load, normal API requests, filmstrip frames, video range requests, and browser console completed without an application error.
- This reset does not add approval, queue, rendering, export, or harvest actions. Those remain preserved secondary capabilities outside the primary Cutter.

### Exact proposed staging list

- `apps/studio/app/api/ops/media-lab/cutter-edit/route.ts`
- `apps/studio/app/api/ops/media-lab/cutter-workspace/route.ts`
- `apps/studio/app/api/ops/media-lab/editorial/video/route.ts`
- `apps/studio/app/ops/ops.css`
- `packages/shared/components/ops/MediaLabRoute.tsx`
- `packages/shared/components/ops/media-lab/MediaLabWorkspace.tsx`
- `packages/shared/components/ops/media-lab/MediaLabCutterWorkspace.tsx`
- `packages/shared/lib/ops/media-lab/cutter-edit-model.ts`
- `packages/shared/lib/ops/media-lab/cutter-edit-model.test.ts`
- `packages/shared/lib/ops/media-lab/cutter-edit-store.ts`
- `packages/shared/lib/ops/media-lab/cutter-edit-store.test.ts`
- `packages/shared/lib/ops/media-lab/cutter-workspace-store.ts`
- `packages/shared/lib/ops/media-lab/editorial/filmstrip.ts`
- `packages/shared/lib/ops/media-lab/editorial/segment-manifest.ts`
- `reports/media-lab-cutter-reset/`
- `reports/woodstock-media-lab-segmentation-implementation.md`

Runtime state in `RETROVERSE_DATA` is intentionally not part of the Git staging proposal.

### Acceptance and definition of done

The primary Media Lab experience is now the requested clean Cutter: one video, Detail Filmstrip, compact edit controls, ripple-closed Working Timeline, persistent Extracted Clips, automatic active-job resume, explicit source change, exact manual In/Out extraction, overlap safety, transcript-aware titles, Return, Undo, atomic persistence, source-fingerprint protection, and no automatic retranscription.

The real-browser interaction checklist passed, all 16 requested captures were saved, disposable clips were removed, the original active job was restored, 45 focused tests passed, Studio TypeScript passed, source integrity matched its stored fingerprint, and `git diff --check` passed. No approval, queue, export, source edit, stage, commit, or push occurred.

## Continuation: Media Lab Editing Proxy and Playback Reliability

Date: 2026-07-31

This continuation records the performance/reliability sprint completed after the Cutter workspace reset. The approved Cutter layout remains unchanged: one compact header, one player, one Detail Filmstrip, the existing I/O controls, one ripple-closed Working Timeline, and one Extracted Clips panel. No route, second player, editing mode selector, approval surface, queue surface, or export surface was added.

### 1. Performance problem and original-media findings

Before this sprint, the Cutter player used the original job video directly through:

`/api/ops/media-lab/editorial/video?year=1969&jobSlug=woodstock-festival-1969-remastered-2026-07-30T14-34-10`

The authoritative source is:

`/Users/bobhopp/RETROVERSE_DATA/YEARS/1969/production/metadata/woodstock-festival-1969-remastered-2026-07-30T14-34-10/_source_Woodstock_Festival_1969__Remastered_.mp4`

Measured source properties:

- container: MP4;
- video: H.264 High, 1920×1080, yuv420p, 25 fps;
- audio: AAC LC, stereo, 48 kHz;
- ffprobe duration: `4546.283` seconds;
- job/source-time duration: `4546.2756875` seconds;
- size: `1,192,499,080` bytes;
- source SHA-256: `72fed23e66a72a4caa784138209bcad34d6c5a084f78ff045acd3be3752f7aa7`;
- source fingerprint: `74abed1171ebfe5c1129195d398cf1a0becb1a3cbba5f46cf0081711127efff7`;
- observed source keyframe spacing: approximately `5.12` seconds.

The original is Safari-readable, but a 1.19 GB 1080p source with roughly five-second random-access spacing is a poor editing/scrubbing target. It also did not explain the one-second stop by itself: before proxy switching was added, original-source Working playback ran for more than two minutes after the playback controller repair.

### 2. Premature-stop root cause and corrected state flow

The stop was a playback-ownership defect, not an encoding failure.

The audit traced every `play()`, `pause()`, `currentTime` assignment, video event, range check, selected-clip effect, Detail update, and preview transition. The previous component allowed both the animation-frame guard and the `timeupdate` path to enforce boundaries. Clip Preview authority could also survive a user pause or native seek. Preview startup assigned `currentTime` and called `play()` without first awaiting `seeked`. The next ordinary play could therefore inherit a stale preview Out boundary, and both enforcement paths could pause it.

The repair is deterministic:

- one explicit playback controller owns mode and boundary state;
- one animation-frame guard is the only mode-specific boundary authority;
- `timeupdate` updates synchronized UI state but does not enforce a second boundary;
- native seeking clears preview identity and resumes as Source Navigation;
- preview startup awaits an exact seek before playing;
- programmatic and scrub seeks are guarded from Safari native-seek transitions;
- pausing is explicit and preserves only the intended resume mode;
- a handled-boundary key and `seekInProgress` prevent repeat joins.

No arbitrary delay was added.

### 3. Playback-mode architecture

The four exclusive modes are:

- `paused`: no automated boundary seek or stop; retains an explicit `resumeMode`;
- `source_navigation`: uninterrupted source/proxy playback; ignores Working joins and preview Out;
- `working`: plays only remaining source ranges, crosses virtual joins, and stops at the final remaining source end;
- `clip_preview`: plays one selected source In→Out range and ignores Working skips.

The main player resumes the current explicit context. After a Working scrub or extraction it resumes Working. A native player seek deliberately transitions to Paused · Source so stale Working or Preview authority cannot act on the seek. Completing Preview returns to Paused · Working.

### 4. Working playback, Clip Preview, and boundary tolerance

Working mode locates the current remaining source range. At its end it either seeks to the next range's source start and continues, or pauses at the final source end. Its boundary key is derived from the exact join (`rangeEnd->nextRangeStart`), and the key remains guarded through the seek. A second boundary decision is suppressed while the seek is in progress or when the same key has already been handled.

Clip Preview seeks exactly to source In, waits for `seeked`, plays without Working range enforcement, pauses at source Out, exact-seeks to Out, clears preview identity, and restores Working as the resume context.

The frame-aware tolerance is:

`max(0.1 seconds, 2 / sourceFrameRate)`

For Woodstock at 25 fps this is `0.1` seconds. This covers two frames plus real browser event cadence without creating a second time domain.

Live Safari proofs:

- a temporary validation extraction at `00:11:19.084 → 00:11:21.084` was crossed in Working mode; status reported `Ripple join → 00:11:21.084`, playback continued, and no loop occurred;
- Preview of that same extracted range started at exact In and finished paused at exact Out (`681.0842` seconds), proving that Working skips were not applied during Preview;
- the temporary extraction was undone and the restored In mark was cleared;
- final-range Working playback started at `01:15:39.602`, stopped once at `01:15:46.276`, and reported `Reached the end of the Working Timeline.`

### 5. Editing-proxy architecture and profile

The server accepts only `year`, `jobSlug`, source fingerprint, and the approved profile. It resolves the source through the existing Media Lab job; no browser-provided filesystem path is accepted. The implementation verifies source existence and fingerprint, snapshots the source before and after encoding, confines output to the job's derived `proxy/` directory, uses array arguments with `shell: false`, validates a temporary file, atomically renames the validated result, and atomically writes the manifest.

Profile `browser-edit-720p-v1`:

- MP4;
- H.264 via `libx264`;
- maximum 1280×720 with preserved aspect ratio and even dimensions;
- source frame rate preserved;
- yuv420p;
- one-second deterministic GOP (`25` frames for Woodstock);
- closed GOP, scene cuts disabled for deterministic spacing, B-frames disabled;
- CRF 22, `faster` preset;
- AAC, 160 kbps, 48 kHz, practical source channel layout;
- faststart;
- zero intended offset;
- duration tolerance `0.25` seconds;
- start-time tolerance `0.05` seconds.

Final Woodstock ffmpeg argument array:

```text
-hide_banner -nostdin -y
-i <job-resolved-source>
-map 0:v:0 -map 0:a:0?
-vf scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2
-c:v libx264 -preset faster -crf 22 -pix_fmt yuv420p
-g 25 -keyint_min 25 -sc_threshold 0 -bf 0 -flags +cgop
-x264-params keyint=25:min-keyint=25:scenecut=0:open-gop=0
-c:a aac -b:a 160k -ar 48000
-movflags +faststart -max_muxing_queue_size 1024
-progress pipe:1 -nostats
<job-proxy-directory>/temporary-generation-file.mp4
```

The worker invokes `ffmpeg`, `ffprobe`, and version inspection through executable-plus-argument arrays. It does not interpolate a shell command string.

### 6. Proxy directory, manifest, and fingerprint binding

Woodstock derived files are:

```text
woodstock-festival-1969-remastered-2026-07-30T14-34-10/
  proxy/
    editing-720p.mp4
    proxy-manifest.json
    temporary-generation-file.mp4   # exists only during generation
```

The manifest records version, source fingerprint/name/duration, profile and filename, proxy duration and technical streams, keyframe interval, ffmpeg version and exact arguments, complete ffprobe result, validation status, source snapshots, proxy size, generation wall time, and generation speed.

Readiness is invalidated when the manifest is absent or malformed, the proxy file is missing, validation is not `valid`, the source fingerprint changes, the profile changes, or the recorded duration exceeds tolerance. The proxy URL and ETag are fingerprint/profile-bound. A valid manifest is reused; loading the job never starts generation by itself.

### 7. Progress, cancellation, validation, and failure handling

The Cutter header now exposes compact states without changing layout:

- Original;
- Proxy Preparing with real percentage/progress;
- Proxy Ready;
- Proxy Failed;
- Proxy Stale;
- Active · Editing Proxy or Active · Original Fallback.

Preparation is explicit. While encoding, the server parses ffmpeg `-progress pipe:1` output and exposes elapsed media time, speed, percentage, and state. Cancel sends `SIGTERM`, removes only `temporary-generation-file.mp4`, persists a cancelled state, never publishes the temporary file, and permits Retry.

Validation requires a nonempty file, readable container, video stream, readable codec/resolution/frame rate, expected maximum resolution, H.264/yuv420p, recorded optional audio state, AAC when audio exists, 48 kHz audio, plausible duration, duration difference at or below `0.25` seconds, and start offset at or below `0.05` seconds. Invalid output remains unavailable to editing and records a concise reason.

The failure paths for missing source, fingerprint mismatch, missing ffmpeg/ffprobe, child failure, cancellation, invalid output, duration mismatch, deleted proxy, stale manifest, and Safari media error preserve source/edit/transcript state. Safe failures activate the original source and require an explicit retry; they do not loop generation.

### 8. Safari byte-range serving and media cache headers

The job-bound proxy media route supports GET and HEAD, closed/open/suffix single ranges, `200`, `206`, `304`, and `416`, and never buffers the whole MP4. It validates the active fingerprint/profile/manifest before opening the file.

Response contract:

- `Content-Type: video/mp4`;
- `Accept-Ranges: bytes`;
- exact `Content-Length`;
- `Content-Range` for partial responses;
- fingerprint-bound quoted `ETag`;
- `Cache-Control: private, max-age=31536000, immutable`.

A live Safari cancellation exposed one concrete stream bug in the first implementation: Node's default `Readable.toWeb()` bridge could enqueue after the browser cancelled a range, producing `Invalid state: Controller is already closed`. It was replaced with a cancellation-safe bridge that destroys the Node stream once, stops enqueuing after cancel/close, and tolerates late source data. The regression test passes, and subsequent Safari `206` cancellations produced no uncaught stream error.

### 9. Source/proxy handoff and one-to-one time mapping

The selection order is valid Editing Proxy, then Original Fallback. The initial source opens even when no proxy exists. Once an explicitly requested proxy validates, the Cutter waits until playback is paused and no scrub is active, preserves source playhead, active In, selected clip, playback resume mode, extracted clips, Working ranges, and transcript context, then changes the single video source. A proxy media error performs the inverse controlled handoff to original.

There is no proxy-relative edit domain. Player `currentTime`, source playhead, In/Out, clips, transcript segments, remaining ranges, Working mappings, and thumbnail sample times all remain original source seconds. Both Woodstock streams start at zero, and `4546.283` proxy seconds represent the same source timeline as `4546.283` original seconds.

### 10. Scrub-state architecture and seek throttling

Explicit scrub state is `idle | overview_drag | detail_drag | working_drag`. While a scrub is active, playback pauses, mode-specific boundary handling is suppressed, proxy switching is suppressed, and no persistence write is caused by pointer movement.

Every pointer movement updates the visual source/Working playhead immediately. Media work is separately scheduled through `requestAnimationFrame` plus a `75 ms` interval. Approximate seeks use `fastSeek()` only when Safari exposes it; otherwise they assign `currentTime`. Release cancels pending approximate work, assigns exact `currentTime`, waits for `seeked`, synchronizes both timelines, clears scrub state, and remains paused.

Detail scrubbing retains the fixed window and does not auto-recenter it. The 10-second, 30-second, one-minute, and five-minute controls remain explicit; 10 seconds is the finest window. Working scrubbing maps pointer→Working seconds→source seconds and reframes Detail only after release.

Measured scrub evidence:

- deterministic 200-move fixture: before `200` media seeks; after `25` approximate seeks plus one exact release seek;
- in-app Detail drag: 31 pointer positions, 5 media seeks, exact release `00:00:47.456`;
- in-app Working drag: 26 pointer positions, 4 media seeks, exact source release `00:47:10.728`, Detail reframed;
- actual Safari Detail drag: exact `00:12:42.985`, 2 media seeks;
- actual Safari Working drag: exact source `00:52:35.254`, 2 media seeks, Detail reframed to `00:50:05.254 → 00:55:05.254`;
- all release cases remained paused and no boundary skip fired during scrub.

### 11. Disposable validation

The short fixture validation ran before the full Woodstock proxy and was repeated after final code changes. The fixture was created in a temporary directory and removed automatically.

Latest passing metrics:

- source: 30 seconds, 1920×1080, 25 fps, H.264/AAC, `41,205,677` bytes;
- source SHA-256: `9a965cfae1fe39ad41fd2da6651d1b44c6dd52a56efa1692f40e4baa98dbe1fc`;
- fixture fingerprint: `9ade1cc3e31d008cc6b268274169d26e6568cced4dc447dc95f7660e0b427fd4`;
- fixture creation: `0.774` seconds;
- first successful proxy: `7,395,429` bytes;
- proxy SHA-256: `c8c9bccfb9d31ee1881258b2aaba1bb760d8c3320437d45f39117ce9e93cdca2`;
- first proxy generation: `0.872` seconds observed, `0.868` seconds manifest, `34.562×` real time;
- proxy duration: `30.016` seconds; difference `0.016` seconds;
- proxy: 1280×720, 25 fps, H.264/yuv420p, AAC mono/48 kHz;
- byte-range proof: `bytes=101-356`, status `206`, exactly `256` bytes with the required headers;
- continuous full decode: 30 seconds, zero premature stops;
- repeated seeks: `0.25`, `3.75`, `9.5`, `17.25`, and `28.5` seconds;
- cancellation: cancel request accepted, final state cancelled, temporary output removed, no ready manifest;
- forced failure: duration mismatch persisted as failed and original fallback remained safe;
- delete reconciliation: missing file produced Stale;
- retry/regeneration: Ready in `0.887` seconds;
- cached reuse: proxy mtime preserved and no regeneration occurred;
- source hash and full source snapshot were unchanged.

The reported cancellation wall-time field spans more of the validation script than the termination itself, so it is intentionally not presented as cancellation latency.

### 12. Woodstock proxy metrics

The full proxy was generated once after disposable validation:

- source duration used for edits: `4546.2756875` seconds;
- source size: `1,192,499,080` bytes;
- proxy size: `1,046,489,980` bytes;
- size reduction: `146,009,100` bytes (`12.24%`);
- proxy SHA-256: `ba5fd2510501efd0f27c6953459aff018971d326deb1baf93126b9d3bf8e7381`;
- generation wall time: `159.877` seconds;
- generation speed: `28.436×` real time;
- output: H.264 High, 1280×720, yuv420p, 25 fps;
- audio: AAC LC, stereo, 48 kHz;
- observed keyframes: `0, 1, 2, 3, …` seconds;
- proxy start time: `0`;
- proxy duration: `4546.283` seconds;
- difference from job duration: `0.0073125` seconds;
- validation: valid.

Warm Safari range requests were observed at approximately `25–245 ms`; clean-server cold requests were approximately `242–366 ms` and include development compilation effects. Cached status/reopen requests were approximately `87–325 ms` in the development server. Reload selected Proxy Ready without a second generation.

### 13. Source and Cutter-state immutability proof

Woodstock source before and after:

- path: unchanged;
- size: `1,192,499,080` bytes before and after;
- mtime: `1785422052509.5356` ms before and after;
- fingerprint: `74abed1171ebfe5c1129195d398cf1a0becb1a3cbba5f46cf0081711127efff7` before and after;
- SHA-256: `72fed23e66a72a4caa784138209bcad34d6c5a084f78ff045acd3be3752f7aa7` after generation and live verification.

The original production state still contains exactly `Clip 001`, ID `manual-74abed1171-0-4bsg-1`, source `0 → 201.9039988`, Include for Export enabled, and no edit history. Remaining duration returned to `1:12:24`; original duration remains `1:15:46`.

The explicit live I/O test necessarily advanced only the top-level `clip-extractions.json` audit timestamp when its temporary clip was extracted and undone. Semantic clip content, stable ID, source In/Out, title metadata, include flag, and empty history returned to the original state. The resulting manifest hash is `7186603b47a94e9d6eb6d1b26e4b1f47245dbe1e55c07f5ffae2f2c3baf0f44a`.

Unrelated production artifacts remained byte-identical to their pre-proxy hashes:

- chapters: `1bc44ce0c34cd1e14c72f178cb487e4808b11366313b24df6186438c11a153af`;
- transcript: `a198a3ba64d3afe005d0f40e50e6cfbc073239beb295ead214b901fbb0859529`;
- editorial segments: `551e6643a73a5b2f600cae6591bf935c4b240f97aca600cc413cda5514e57252`.

No retranscription, chapter regeneration, approval, queue, or export occurred. Filmstrip requests created only normal fingerprint-bound thumbnail caches for the windows inspected during live scrubbing.

The valid proxy manifest was temporarily and reversibly replaced with an invalid derived manifest to exercise the live failure UI, then restored byte-for-byte. Its final SHA-256 is the original valid hash `a5f10c4ff1faed93913be5f992d15859160e9ff408f55649c7aac85959d19524`; only its filesystem mtime advanced during the atomic restoration.

### 14. Live Safari verification

Safari used the normal existing Ops/PIN session at `http://127.0.0.1:3001/bobos/media-lab`. No autoplay behavior was assumed; playback began only after a native user interaction. AAC audio was active, the native control exposed Mute, and Safari showed the tab audio indicator.

Continuous proof started at source `201.9893` seconds and reached at least `514.2117` seconds while remaining Mode · Working, for more than five uninterrupted minutes (`312.22+` seconds). Playback was later paused at `520.835`, resumed to `523.526`, and had zero premature stops.

The complete requested checklist:

1. Pass — Cutter layout unchanged.
2. Pass — active Woodstock job resumed.
3. Pass — proxy status visible.
4. Pass — valid proxy selected.
5. Pass — Original Fallback exercised in the forced failure state.
6. Pass — more than five uninterrupted minutes.
7. Pass — no one-second stop.
8. Pass — native Pause changed to Paused · Working.
9. Pass — Resume returned to Working and advanced time.
10. Pass — native Skip Forward changed source time and safely selected Paused · Source.
11. Pass — Detail playhead synchronized.
12. Pass — Working mapped playhead synchronized.
13. Pass — Detail visual playhead moved during drag.
14. Pass — Detail media seeks were throttled.
15. Pass — Detail release landed exactly at the reported target.
16. Pass — Working pointer mapped through ripple time to source time.
17. Pass — Working release landed exactly and reframed Detail.
18. Pass — scrub suppressed boundaries.
19. Pass — scrub release remained paused.
20. Pass — I stored exact source `679.0842` seconds.
21. Pass — O created source `679.0842 → 681.0842`.
22. Pass — proxy use preserved all clip source timecodes.
23. Pass — Working skipped the temporary extracted range.
24. Pass — playback continued after the virtual join.
25. Pass — no repeated join/seek loop.
26. Pass — final Working range stopped once at `4546.2756875` source seconds (displayed `01:15:46.276`).
27. Pass — Preview began at exact In.
28. Pass — Preview stopped at exact Out, within the 0.1-second tolerance.
29. Pass — Preview played inside an extracted range, proving Working skips were inactive.
30. Pass — Preview completion restored Paused · Working.
31. Pass — failure→cached Retry handoff preserved `679.0842`, clips, and mode.
32. Pass — reload reused the cached proxy.
33. Pass — no generation POST/child process started on reload.
34. Pass — live proxy requests returned `206` ranges.
35. Pass — Safari Web Inspector showed no media errors. Its only error was a development-only missing `/favicon.ico` (`404`).
36. Pass — the final clean load had no broken Media Lab API request. A transient Next.js hot-refresh page `500` occurred while the development bundle was being edited; clearing generated `.next` state and restarting produced repeated clean `200`/`206` loads.
37. Pass — source size, mtime, fingerprint, and SHA-256 unchanged.
38. Pass — transcript hash/mtime unchanged and no transcription request occurred.
39. Pass — chapters hash/mtime unchanged and no regeneration occurred.
40. Pass — no approval action or request.
41. Pass — no queue action or request.
42. Pass — no export action or request.

Safari Web Inspector was opened after the final-range proof. It showed the Cutter at Proxy Ready / Editing Proxy / Paused · Working and one non-media favicon `404`; there was no codec, seek, range, playback, stream, or Media Lab API error.

### 15. Screenshots and console evidence

All required captures are in `reports/evidence/media-lab-editing-proxy/` as real PNG files:

1. Proxy preparing — `02-proxy-preparing.png`
2. Proxy progress — `03-proxy-progress.png`
3. Proxy ready — `04-proxy-ready-active.png`
4. Cutter using editing proxy — `08-safari-proxy-ready.png`
5. Original fallback status — `01-original-fallback.png` and `12-safari-proxy-failure-fallback.png`
6. Detail scrubbing — `06-detail-scrub-release.png`
7. Working scrubbing — `07-working-scrub-release.png`
8. Continuous playback after several minutes — `09-safari-continuous-five-minutes.png`
9. Working virtual join — `10-safari-working-virtual-join.png`
10. Clip Preview — `11-safari-clip-preview.png`
11. Cached proxy after reload — `05-cached-proxy-after-reload.png`
12. Proxy failure state — `12-safari-proxy-failure-fallback.png`
13. Retry success — `13-safari-proxy-retry-success.png`
14. Final active Cutter — `14-final-safari-cutter.png`

Additional console evidence: `15-safari-console-audit.png`.

### 16. Automated verification

Final deterministic run:

- `64/64` named tests passed;
- zero failures, skips, cancellations, or todos;
- disposable end-to-end proxy validation passed;
- Studio TypeScript (`npx tsc --noEmit -p apps/studio/tsconfig.json`): passed;
- `git diff --check`: passed.

The 64 named tests cover the pure policy portions of the requested matrix: fingerprint/profile cache keys, valid reuse, missing/stale/invalid states, safe containment and overwrite blocking, array ffmpeg policy, scaling/resolution/GOP/faststart/yuv420p/AAC/temp output, ffprobe requirements and audio absence, duration/start tolerances, progress parsing, atomic manifests and cleanup, source snapshots, range parsing/headers/ETag/416, cancellation-safe streams, four-mode exclusivity, native seek transition, Source boundary isolation, Working join/continue/final stop/loop guard, Preview isolation/Out stop/stale-state cleanup, scrub boundary suppression/throttling/fastSeek/fallback/exact policy, frame tolerance, source handoff state, source/Working pointer mappings, exact edit-state persistence, active job preference, and thumbnail time-domain safety.

Environment-dependent cancellation, retry, atomic rename, full decode, repeated seek, source immutability, active-job proxy selection, no-regeneration reload, fallback, no retranscription/chapter regeneration/approval/queue/export, and Safari behavior were additionally exercised by the disposable workflow and live Safari checks.

### 17. Known limitations and measured tradeoffs

- The v1 proxy is only `12.24%` smaller than the source. CRF 22, one-second closed GOPs, and no B-frames deliberately trade compression efficiency for predictable Safari random access.
- CPU utilization was not sampled separately; wall time and generation speed were recorded.
- Working join latency was observed within the frame/event tolerance and continued successfully, but a separate high-resolution join-latency probe was not added.
- Safari `fastSeek` availability is feature-detected at runtime but not exposed through accessibility inspection. Both fastSeek and currentTime policies are deterministic-tested, and actual Safari scrubbing passed.
- Development hot refresh produced one transient page-runtime failure from generated Next.js cache state. Removing only `apps/studio/.next` and restarting the development server corrected it; final page, status, filmstrip, and proxy range requests were healthy.
- Safari's one console error is the unrelated development favicon `404`, not a media or Media Lab API error.
- This sprint intentionally does not implement export, export validation, queueing, chapter editing, approval, Final Cut integration, ProRes, or any other deferred scope.

### 18. Exact proposed staging list

- `apps/studio/app/api/ops/media-lab/editing-proxy/route.ts`
- `apps/studio/app/api/ops/media-lab/editing-proxy/video/route.ts`
- `packages/shared/components/ops/media-lab/MediaLabCutterWorkspace.tsx`
- `packages/shared/lib/ops/media-lab/cutter-playback.ts`
- `packages/shared/lib/ops/media-lab/cutter-playback.test.ts`
- `packages/shared/lib/ops/media-lab/editing-proxy.ts`
- `packages/shared/lib/ops/media-lab/editing-proxy-store.ts`
- `packages/shared/lib/ops/media-lab/editing-proxy-worker.ts`
- `packages/shared/lib/ops/media-lab/editing-proxy.test.ts`
- `packages/shared/lib/ops/media-lab/media-byte-range.ts`
- `packages/shared/lib/ops/media-lab/media-stream.ts`
- `scripts/validate_media_lab_editing_proxy_disposable.ts`
- `reports/evidence/media-lab-editing-proxy/`
- `reports/woodstock-media-lab-segmentation-implementation.md`

Runtime proxy media, manifests, Cutter state, and filmstrip caches under `RETROVERSE_DATA` are intentionally excluded from Git staging.

### 19. Acceptance criteria and definition of done

The Cutter now automatically reuses the fingerprint-bound validated Woodstock editing proxy; preserves original-source seconds for every edit; falls back to original safely; plays continuously; pauses/resumes; supports native seeking; scrubs Detail and Working responsively with exact release; crosses Working joins without stopping or looping; stops at the final Working end; previews exact In→Out ranges; serves Safari byte ranges; and reloads without regeneration.

The source is unchanged. Existing clip identity/timecodes and Working decisions are preserved. Transcript, chapters, editorial decisions, approval, queue, and export remain untouched. The disposable workflow, full Woodstock generation, 42-item Safari checklist, 15 captures, 64 focused tests, Studio TypeScript, and `git diff --check` pass. Nothing was staged, committed, or pushed.

## Independent range selection continuation — 2026-07-31

The prior Cutter used one temporary `activeInSec` and treated `O` as the extraction command. That made an Out-first workflow impossible: after marking an intended Out, returning to the start and pressing `I` did not preserve an independent Out boundary because the control layer still expected the current playhead to be the extraction endpoint.

The Cutter now uses independent temporary `rangeInSec` and `rangeOutSec` state. `I` sets or moves In, `O` sets or moves Out, and neither action persists or extracts. The range status is empty, In-only, Out-only, valid, reversed, or invalid. Reversed ranges remain visible and are blocked from preview/extraction until corrected.

Preview Selection and Extract are explicit controls. `P` previews the temporary In→Out range through the existing playback boundary controller, while `E` calls the existing atomic extraction transaction with the exact selected bounds. Clear Range/Escape clears only temporary state. Existing ripple removal, clip persistence, transcript naming, Return to Timeline, Undo, proxy handling, and source-time authority remain unchanged.

The control bar now exposes Set In, Set Out, Preview Selection, Extract, and Clear Range. The timing panel shows Source Playhead, In, Out, Selected, and Range Status. The Detail filmstrip retains the selected range and now shows a distinct Out marker alongside In.

Keyboard precision uses a documented 25 fps fallback: Left/Right step 0.04 seconds, Shift steps 0.1 seconds, and Option steps 1 second. Timeline scrubbing continues to use the existing throttled scrub controller with exact release seeking; no persistence writes occur during temporary range adjustment. J/K/L were not added because reliable reverse playback is not available from the browser player.

Focused deterministic range tests cover boundary order, reversed state, and positive selected duration. Studio TypeScript and whitespace validation pass. Live Safari verification and screenshots for this continuation remain outstanding; no source media, transcription, chapters, approval, queue, or export were touched.

## Drag-to-select Working Timeline continuation — 2026-07-31

The operator-facing I/O range-creation workflow has been replaced by a direct pointer model. The Working Timeline now owns coarse selection: dragging across ripple-closed Working time maps through the existing Working-to-source conversion, normalizes the earlier point as Selection Start and the later point as Selection End, and makes the released edge active. Nothing extracts on pointer release.

The selected range remains temporary and is shown as a high-contrast body with large START and END handles. The active edge is retained separately from persisted extracted clips. Existing extraction, Preview Selection, Undo, Return to Timeline, source fingerprint checks, and ripple mapping remain authoritative and unchanged.

The Detail Filmstrip remains the fine positioning surface and the Working Timeline remains the coarse selection surface. The existing scrub controller continues to throttle media seeks and perform exact release seeks; the new Working selection overlay updates geometry locally and does not persist, request thumbnails, or call APIs during pointer movement. Whole-range body dragging was not added in this pass; selection creation and edge activation are prioritized.

The prior I/O state is retained only where shared compatibility is required internally; the visible control language now uses Selection Start, Selection End, Selected Duration, and Active Edge. TypeScript, focused range tests, and `git diff --check` pass. Live Safari verification, pointer-performance measurements, and screenshots remain outstanding.

## Working Timeline drag ownership defect continuation — 2026-07-31

The live defect was interaction ownership: the selection capture element was nested inside the Working Timeline, while the parent timeline still received bubbled pointer events and immediately entered the ordinary scrub path. That parent also captured the pointer, so the selection controller never received authoritative drag ownership. The result was a scrub-only timeline despite selection helpers and overlay styles existing in the component.

The Working Timeline now has one pointer authority for selection creation. It records the initial client X and Working/source anchor, uses a named 5 CSS-pixel threshold, and treats sub-threshold movement as ordinary click navigation. Once the threshold is crossed, the old scrub path is not started; the transient range is normalized from the approved Working-to-source mapping and committed on release. The selection overlay is above thumbnails and below the large START/END handles, with intentional pointer-event behavior.

Rightward drags activate END; leftward drags activate START. Release preserves the selection, exact-seeks once to the active edge, and hands that edge to the existing Detail positioning path. The visible control language no longer exposes Mark In/Mark Out, Set In/Set Out, or I/O keyboard hints; it uses Selection Start, Selection End, Preview Selection, Extract Clip, and Clear Selection.

Focused range tests, Studio TypeScript, and `git diff --check` pass. A live Safari drag measurement and screenshots were not captured in this continuation; no API, thumbnail, persistence, transcription, chapter, approval, queue, export, or source-media operation was performed.

## Control-panel simplification continuation — 2026-07-31

The Cutter now presents the operator workflow as SELECT → PREVIEW → CUT. A left selection summary shows large whole-second START, END, and CLIP LENGTH values plus TRIMMING START, TRIMMING END, or NO EDGE SELECTED. A right action panel provides large PREVIEW CLIP, CUT CLIP, and CLEAR SELECTION buttons. CUT CLIP reuses the existing extraction transaction; the existing saving state prevents duplicate activation and displays CUTTING… while the transaction is active.

Internal source-time precision and persisted extraction boundaries remain unchanged. Operator times use deterministic nearest-whole-second formatting as MM:SS below one hour and H:MM:SS at or above one hour. Hundredths remain available through the trim formatter for localized precision; full millisecond values remain technical rather than primary operator UI.

The previous small action row is visually demoted so the new side-panel actions are authoritative. Existing proxy, playback, Working Timeline, selection geometry, preview, ripple extraction, Undo, Return to Timeline, and source fingerprint behavior were not changed. Operator formatter tests and range tests pass, as do Studio TypeScript and `git diff --check`. Live Safari control-panel verification and screenshots remain outstanding.

## Timeline enlargement and coarse handle dragging continuation — 2026-07-31

The redundant technical timing strip was removed from the normal Cutter workspace; the large side selection summary remains the operator-facing timing authority. Detail and Working timeline tracks now use responsive clamp-based heights, larger ruler labels, larger Working duration text, and larger START/END hit targets.

The previous START/END buttons only activated an edge on pointerdown and did not own a drag interaction. They now stop propagation, capture the pointer, update only the selected edge through the existing Working-time-to-source-time mapping, preserve the opposite edge, enforce a minimum separation, and perform one exact seek on release. Coarse handle dragging does not persist, request thumbnails, call APIs, or extract. Detail remains the fine edge-trimming surface.

The selected edge is handed back to the existing active-edge/detail positioning path after release. Pointer cancellation clears the transient edge-drag ref without mutating persisted clip state. Focused formatter/range tests, Studio TypeScript, and `git diff --check` pass. Live Safari verification, performance measurements, and screenshots remain outstanding.

## Playhead and preview synchronization continuation — 2026-07-31

The responsiveness audit found a shared 75ms intermediate-seek throttle for Working, Detail, and coarse-handle interactions. Pending targets were replaceable, but all surfaces used the same cadence and a queued animation-frame callback could survive an exact release seek. This contributed to delayed preview feedback and possible stale reconciliation after rapid pointer movement.

The existing seek path remains the single authority. Working and coarse interactions now use a 100ms intermediate cadence, while Detail scrubbing uses a tighter 50ms cadence. Pointer geometry and React state behavior are unchanged; no persistence, API, thumbnail, transcript, or extraction work is added during intermediate movement. Exact release seeks still use the existing precise `currentTime` path.

Intermediate callbacks now capture a seek interaction generation. Clearing scheduled scrub work increments that generation, so a callback queued before release or a new interaction cannot issue a stale target afterward. The replaceable pending target remains latest-wins rather than an unbounded queue. Fast-seek capability detection and exact-seek behavior remain unchanged.

Focused range/time tests, Studio TypeScript, and `git diff --check` pass. No live Safari cadence measurements, screenshots, or five-minute playback verification were performed in this continuation; source media and all persistence/export workflows remain untouched.

## Single-timeline viewport foundation continuation — 2026-07-31

The single-timeline sprint begins with a safe geometry foundation while the current two-timeline Cutter remains available as the fallback reference. Added deterministic viewport helpers for Fit, edge focus, pointer-anchored zoom, bounded pan, and reversible viewport/Working-time mapping. These helpers keep viewport state separate from source/Working authority and do not seek media, persist changes, or alter selection boundaries.

Focused viewport tests cover fit bounds, edge-focus clamping, pointer-anchor preservation, pan clamping, and reversible mapping. Studio TypeScript and `git diff --check` pass.

The normal Detail retirement, single-timeline UI migration, thumbnail-density pipeline, FFmpeg fade analysis, suggestion persistence, marker UI, snapping, dismissal, Woodstock calibration, Safari verification, and screenshots remain outstanding. No source media, analysis job, transcription, extraction, approval, queue, or export operation was performed.

## Single-timeline UI migration continuation — 2026-07-31

The viewport foundation is now connected to the rendered Working Timeline. The normal Cutter no longer renders the Detail Filmstrip in the main editing flow, and the primary timeline exposes FIT, 5 MIN, 1 MIN, 30 SEC, and 10 SEC viewport controls. The viewport is initialized to Fit, edge-focused around the active START/END boundary, and keeps viewport state separate from selection and source-time authority.

Primary timeline positions now use visible viewport Working time for ruler, playhead, selection, and handle geometry. Selection creation and coarse handle mapping continue through the existing ripple-closed Working-to-source conversion. The existing Detail component remains in source as an internal fallback reference but is not mounted in the normal workspace. The legacy edit bar is hidden from normal operation so duplicate Detail controls are not shown.

Viewport tests, Studio TypeScript, and `git diff --check` pass. Pan and pointer-centered wheel zoom, viewport-aware thumbnail loading, single-timeline fine trim controls, and live Safari verification remain outstanding. No fade analysis or suggestion work was started.
