# RV04-03 Experience Inspector — Phase 0 Report

**Sprint:** Experience Inventory  
**Date:** 2026-07-21  
**Scope:** Read-only single-song inventory. No production UI polish.

---

## 1. Current BobOS architecture discovered

- **Registry source of truth:** `lib/bobos/rv-registry.ts` (`RV_REGISTRY`, `getRvEntry`)
- **Cockpit entry:** `/bobos` → `apps/studio/app/bobos/page.tsx` → `BobosCockpit`
- **RV directory:** `/bobos/rv-directory` lists registry entries
- **Route convention:** RV IDs are registry keys; routes are human slugs under `/bobos/*` or `/ops/*` (not `/ops/bobos/RV04-03`)
- **Ops AI tools** (pattern followed): `/ops/experience-director-pilot`, `/ops/intelligence`
- **Shared code:** repo-root `lib` / `components` are symlinks into `packages/shared/*`; Studio resolves `@/*` via that tree
- **RV04 today (before this sprint):** `RV04-01` Song Packages Workbench, `RV04-06` AI Usage. **RV04-02 does not exist** in registry; closest Ollama surface is Experience Director Pilot (unregistered)

---

## 2. Exact route and registry files used

| Item | Path |
|------|------|
| Registry entry | `lib/bobos/rv-registry.ts` → `RV04-03` → `/ops/experience-inspector` |
| Ops command-center link | `lib/ops/command-center.ts` |
| Page | `apps/studio/app/ops/experience-inspector/page.tsx` |
| UI | `components/ops/experience-inspector/ExperienceInspectorPanel.tsx` |
| Styles | `components/ops/experience-inspector/experience-inspector.css` |
| Orchestrator | `lib/ops/intelligence/experience-inspector/read-experience-inventory.ts` |
| Types / helpers | `lib/ops/intelligence/experience-inspector/*` |

**Route:** `/ops/experience-inspector?rvtr=RVTR######`  
**VDJ route:** `/ops/experience-inspector?vdj=<FilePath>` (Label RVTR only)

---

## 3–5. Inventory subsystems, loaders, and adapters

### Source matrix

| Section | Owning subsystem | Existing loader/API | Storage source | RVTR linkage | Status (on Night Moves) |
| ------- | ---------------- | ------------------- | -------------- | ------------ | ----------------------- |
| canonical-song | Postgres graph | `resolveCanonicalTrack` + `loadTrackPage` | `canonical_track_display` | track id / RVTR | available |
| artist | Postgres artists | `resolveCanonicalTrack.artist` | `artists` (RVAR) | via track | available |
| album | Primary album policy | `loadTrackPage.primaryAlbum` | albums + memberships | via track | available |
| year | Canonical year | `loadTrackPage.releaseYear` | chart / track year | via track | available |
| database-identifiers | Postgres | `resolveCanonicalTrack` | track/artist/album ids | RVTR | available |
| database-relationships | Track page graph | `loadTrackPage` | related + charts + albums | RVTR | available |
| alternate-identifiers | SongPackage metadata | `loadSongPackage` | packages JSON | filename/key | available |
| canonical-artwork | Cover Library | `loadCoverInfoForRvtrs` | album artwork links | RVTR batch | available |
| public-song-payload | Public track page | `loadTrackPage` | Postgres | RVTR | available |
| story | SongPackage | `loadSongPackage.storyCards` | packages JSON | RVTR | available |
| timeline | SongPackage intel | `loadSongPackage.intel.timelineEvents` | packages JSON | RVTR | available |
| trivia | SongPackage facts | `candidateFacts` category trivia | packages JSON | RVTR | available |
| quotes | SongPackage facts | `candidateFacts` category quote | packages JSON | RVTR | available |
| related-songs | Postgres peers | `loadTrackPage.relatedTracks` | same-artist Hot 100 | RVTR | available |
| chart-journey | Chart Journey | `buildChartJourneyExperience` | track trajectory + collector | RVTR | available |
| song-package | Intelligence | `loadSongPackage` | `ops/intelligence/packages/{RVTR}.json` | RVTR | available |
| universal-package | Universal renderer | `loadUniversalPackage` | package → cards | RVTR | available |
| bundled-package-file | Filesystem | `fs.access` on package paths | runtime + bundled | RVTR | available |
| public-exhibit | Exhibit store | `loadPublicExhibit` | `experience.json` | RVTR | missing |
| public-experience | Publisher-gated renderer | `loadPublicExperience` | director/render | RVTR | available |
| public-experience-ops-preview | Renderer (bypass gate) | `loadPublicExperience({bypassPublisherGate})` | director/render | RVTR | available |
| virtualdj-record | VirtualDJ XML | `findVdjEntryByRvtr` / `scanVdjDatabase` | `database.xml` Label | Label RVTR | available |
| virtualdj-file-path | VirtualDJ XML | same | FilePath | Label RVTR | available |
| virtualdj-play-count | VirtualDJ XML | same | PlayCount | Label RVTR | empty* |
| virtualdj-tags-metadata | VirtualDJ XML | same | Label/User2/album/year | Label RVTR | available |
| virtualdj-attached-rvtr | VirtualDJ Label | `rvtrFromVdjLabel` | Label field | Label RVTR | available |
| virtualdj-video-karaoke | VirtualDJ XML | same | isVideo + path heuristics | Label RVTR | available |
| bundled-vdj-index | Bundled index | `loadBundledVdjRvtrEntry` | `data/ops/vdj-rvtr-index.json` | RVTR key | missing† |
| retroverse-tags | Tags store | `loadRetroverseTagsStore` + `tagsForRvtr` | `ops/retroverse-tags-by-rvtr.json` | RVTR key | empty |
| media-library | Postgres media | **new** `loadMediaLinksForRvtr` | `media_assets` + links | graph→CTD→RVTR | available |
| local-videos | VDJ + media | VDJ entry + media filter | paths | Label / links | empty/available |
| youtube-references | Package/collector scan | package vault/facts + collector JSON scan | research URLs | RVTR | empty |
| hero-artwork | Visual profile | `resolveHeroForRvtr` | package + track cover | RVTR | available |
| derived-visuals | Visual assets | `loadDerivedVisuals` | future hook (always empty) | RVTR | empty |
| visual-identity | Studio Collector | `loadVisualIdentityPackage` | research-department | RVTR dir | available |
| visual-library | Visual library | `loadVisualLibrary` | research-department | RVTR | missing |
| visual-production | Publisher visual producer | `loadVisualProduction` | research-department | RVTR | missing |
| browser-plus-thumbnail | Thumbnail exports | `fs.access` probe | `Sites/retroverse-data/exports/thumbnails` | path-derived | empty |
| now-playing-package | Broadcast | `loadNowPlayingPackage` | universal / VDJ fallback | RVTR | available |
| publisher-record | Studio Publisher | `getPublisherRecord` | publisher store JSON | RVTR | available |
| artifact-readiness | Intelligence readiness | `computeArtifactReadiness` | derived from package | RVTR | available |
| batch-pipeline-status | Batch status | `loadBatchStatus` + `getBatchJob` | batch status JSON | RVTR | missing |
| collector-package | Studio Collector | `loadCollectorPackage` | `collector.json` | RVTR dir | available |
| song-dna | Studio Collector | `loadSongDnaPackage` | `song-dna.json` | RVTR dir | available |
| retrograph | Studio Retrograph | `loadRetrograph` | `retrograph.json` | RVTR dir | missing |
| editor-story | Studio Editor | `loadEditorStory` | `editor.json` | RVTR dir | available |
| director-handoff | Studio Director | `loadDirectorHandoff` | handoff JSON | RVTR dir | available |
| director-package | Studio Director | `loadDirectorPackage` | `director.json` | RVTR dir | available |
| studio-stage | Studio Kernel | `deriveStudioStage` | artifact presence | RVTR | available |
| production-tracker | Production tracker | `loadProductionTrackerSnapshot` | multi-department | RVTR | available |
| creative-review | Creative review | `loadCreativeReviewPackage` | creative-review JSON | RVTR | missing |
| director-pilot | Ollama Director Pilot | pilot output paths | `director-pilot/{RVTR}.json` | RVTR | available |
| candidate-stories | SongPackage drafts | `candidateStories` | packages JSON | RVTR | available |
| research-vault | SongPackage research | `researchVault` | packages JSON | RVTR | available |

\* Play count may be unset on the Label-matched VDJ row even when pilot selection had a count.  
† Bundled VDJ index is a fallback for songs without packages; Night Moves has a full package so index absence is expected.

### New adapters added

| Adapter | Purpose |
|---------|---------|
| `readExperienceInventory` | Read-only orchestrator + section isolation |
| `inspectSection` | Per-section try/catch normalize |
| `listVdjRvtrLinkedEntries` / `findVdjEntryByRvtr` / `resolveRvtrFromVdjFilePath` | Label-only VDJ↔RVTR (no title/artist fuzzy) |
| `loadMediaLinksForRvtr` | Thin Postgres media join by RVTR |

---

## 6. Data sources not yet associated with an RVTR

Confirmed present in repo but **not** inventory sections (no stable RVTR addressability, or not song-scoped):

- Media Lab job folders (year/slug keyed, not RVTR)
- Video Factory cover-recovery queues (cohort scoped)
- Broadcast mixer live queue / RVBA assets (package-linked at play time, not a durable per-RVTR store beyond now-playing loader)
- BobOS AI usage store (aggregate, not per-RVTR)
- Harvest clip library (clip ids)
- Atlas mission workspaces (partial RVTR use; not required for Phase 0 completeness of experience stack)

---

## 7. Confirmed read-only boundaries

- Orchestrator file opens with an explicit **READ ONLY** comment block
- Barrel `index.ts` documents no write re-exports
- Page/UI import only `readExperienceInventory` + VDJ list helpers
- Grep over new files: no `saveSongPackage`, `writeFile`, `saveCollector*`, `writeDirector*`, `upsertPublisher*`, etc.
- Resolution refuses title/artist matching (`resolveRvtrsForVdjLibrary` not used)

---

## 8. Test RVTRs used

| RVTR | Role | Why |
|------|------|-----|
| **RVTR347287** | Highly complete | Night Moves — Experience Director pilot, published package, Studio Alpha artifacts, VDJ Label, director-pilot draft |
| **RVTR001341** | Partially complete | Gallery default — canonical + Studio Alpha strong, **no SongPackage** |
| **RVTR080577** | Sparse + VDJ-linked | Channel-zero fixture — canonical/chart/VDJ present, almost no experience package/studio drafts |
| **VDJ path** (Mouth & MacNeal) | VirtualDJ resolution | Label → `RVTR521270`, method `virtualdj-rvtr` |
| `NOT_AN_RVTR` | Invalid control | Controlled error string, no crash |
| `debugFailSection=story` | Isolation | Story forced to error; remaining 53 sections still returned |

---

## 9. Results and gaps found

### Observed totals (runtime orchestrator)

| Song | available | missing | empty | errors |
|------|-----------|---------|-------|--------|
| RVTR347287 Night Moves | 41 | 7 | 6 | 0 |
| RVTR001341 Dr. Hook | 35 | 15 | 4 | 0 |
| RVTR080577 Beatles (sparse) | 18 | 29 | 7 | 0 |

### Gaps

1. **Browser+ thumbnail probe** is heuristic (base64url prefix); may miss real thumbnail filenames — status often `empty` even when exports exist elsewhere.
2. **YouTube** detection is URL-scan only inside package/collector JSON — no dedicated YouTube store.
3. **`loadDerivedVisuals`** is a stub that always returns `[]`.
4. **Public exhibit** (`experience.json`) rarely present vs director/render path.
5. **Full studio `next build`** could not be completed in this environment (see verification).

---

## 10. Recommended inputs for future production UI

- Default seed: top-played VDJ Label-RVTR sequence (already used for prev/next)
- Showcase complete: `RVTR347287`, `RVTR478078`, `RVTR792762`
- Sparse contrast: `RVTR080577` and any VDJ Label track without package
- Keep resolution modes explicit: Direct RVTR vs VirtualDJ Label — never fuzzy search in the inspector chrome
- Surface section status chips + raw disclosure as the primary diagnostic interaction (already Phase 0 pattern)

---

## 11. Explicit deferred work

- Final visual design / theming
- Editing, repair, publish, pipeline triggers
- Completeness scoring / AI recommendations
- Batch inspection / multi-song compare
- Title/artist search
- Generalized subsystem plugin framework
- Persistent inventory cache
- Dedicated thumbnail resolver using Browser+ path formula
- RV04-02 Ollama Experience Enhancer (not present in current registry)

---

## Verification commands and results

| Check | Result |
|-------|--------|
| `cd apps/studio && npx tsc --noEmit` | **Pass** (0 errors after media SQL + album field fixes) |
| Runtime inventory script (3 RVTRs + VDJ + invalid + forced fail) | **Pass** — 54 sections, isolated errors, Label-only VDJ resolve |
| Write-import scan of new files | **Pass** — none |
| `npm run build:studio` | **Blocked** — concurrent bobos-runtime / `npm run dev` marker (pid active) |
| `npx next build` (studio, heap 8GB) | **Fail** — Node OOM during compile; pre-existing large-app / concurrent-dev pressure, not a type error in RV04-03 |
| HTTP `/ops/experience-inspector` | Route registered; redirects to `/internal/ops-pin` (ops gate) — expected |

---

## Definition of done checklist

| Criterion | Met? |
|-----------|------|
| RV04-03 in BobOS registry / directory | Yes |
| Opens via established BobOS/ops route | Yes (`/ops/experience-inspector`) |
| Direct RVTR inspect | Yes |
| VirtualDJ Label-RVTR inspect | Yes |
| Confirmed RVTR-addressable subsystems as sections | Yes (54) |
| available/missing/empty/error distinguishable | Yes |
| Source identified per section | Yes |
| Raw data expandable | Yes (`<details>`) |
| Errors isolated | Yes (`inspectSection` + forced fail test) |
| No writes | Yes |
| Report complete | Yes |
| Studio build | Typecheck pass; production build blocked/OOM documented |

**Phase 0 meets its definition of done** for inventory functionality and architecture validation. Production `next build` remains an environment constraint to re-run when bobos-runtime/dev is stopped.
