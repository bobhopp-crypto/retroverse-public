# Pipeline Data Flow Audit — RVTR001341

**Song:** Dr. Hook — *When You're In Love With A Beautiful Woman*  
**RVTR:** RVTR001341  
**Audit date:** 2026-06-28  
**Scope:** Investigation only — no pipeline changes  

---

## Executive Summary

RVTR001341 has a **complete Collector package** (56 KB, 22 candidate facts, 9 sources, 5 extracted video frames, canonical chart/recording/cultural data). The **published patron experience shows only a fraction** of that material: **5 museum exhibits**, **2 unique images** (hero + performance, reused across scenes), and **effectively zero readable fact text** on published scenes.

Data disappears at **four choke points**:

| Stage | What happens | Impact |
|-------|----------------|--------|
| **Collector → Editor** | `distill.ts` ranks/filters facts; 7 never enter editor workspace; hard cap of **7 approved facts**; only **Hero + Performance** frames auto-approved | 68% of candidate facts excluded from handoff layer |
| **Editor → Director** | Editorial Brain `promotedFactIds` drops album graph fact; **0 approved cards, 0 quotes**; 3 of 5 images not approved | Handoff shrinks to 6 facts, 2 images |
| **Director → Render spec** | Museum **5+2 exhibit model**; chart scene links **wrong fact**; most scenes have **empty headlines/copy** | 7 scenes planned but fact-poor |
| **Publisher → Live** | `composeMuseumExperience()` publishes **5 core exhibits only** (`approvedClass: ready`); extended scenes **dropped**; facts not surfaced in presentable scenes | Patron sees 5 visual slides, not 22 facts |

**Root cause:** The pipeline is optimized for **visual museum pacing**, not **information fidelity**. Collector gathers broadly; Editor/Director aggressively filter for a short swipe experience; Publisher ships the 5-exhibit subset.

**Mission Control** accurately reflects package **stage** (published) but **overstates richness** — department metrics count queue/completion, not fact/image utilization rates.

---

## Artifact Inventory (On Disk)

| File | Path | Size | Purpose |
|------|------|------|---------|
| collector.json | `data/ops/intelligence/research-department/RVTR001341/` | 56,624 B | Collector output |
| editor.json | same | 38,019 B | Editor output |
| director-handoff.json | same | 11,189 B | Editor → Director handoff |
| director.json | same | 22,433 B | Director plan + embedded render spec |
| director-render-spec.json | same | 11,614 B | Machine render spec |
| song-dna.json | same | 2,369 B | Visual/musical DNA (Collector-side) |
| visual-identity.json | same | (dir metadata) | Visual identity sidecar |
| visual-assets/ | same | 5 files | alternate, close-up, crowd, hero, performance JPGs |
| publisher record | `data/ops/studio/publisher-records.json` | entry | Evaluation + publish decision |

---

# Phase 1 — Collector Audit

## Top-Level Object Counts

| Object | Field / Path | Record Count |
|--------|--------------|--------------|
| Package | `collector.json` top-level keys | 32 |
| Stages | `stages.*` | 12 stage objects |
| Candidate facts | `candidateFacts[]` | **22** |
| Source log | `sourceLog[]` | **9** |
| Visual inventory | `visualAssets.inventory[]` | **7** |
| Extracted frames | `visualAssets.extraction.assets[]` | **5** |
| Performances | `performances[]` | **1** |
| Video items | `videoPerformance.items[]` | **1** |
| VDJ media | `virtualDj.mediaItems[]` | **2** |
| Recording notes | `recording.notes[]` | **2** |
| Cultural notes | `culturalContext.notes[]` | **4** |
| Related artists | `relationships.relatedArtists[]` | **1** |
| Song timeline | `timelines.song[]` | **5** |
| Recording timeline | `timelines.recording[]` | **1** |
| Performance timeline | `timelines.performance[]` | **1** |
| Recordings entity | `recordings[]` | **1** |
| Performance entities | `performanceEntities[]` | **1** |
| Missing areas | `missingAreas[]` | **1** |
| Story seed ideas | `storySeed.storyIdeas[]` | **4** |

## Field-by-Field Collector Inventory

### Billboard / Charts

| Asset | Present | Location | Detail |
|-------|---------|----------|--------|
| Hot 100 peak | ✓ | `charts.peakHot100` | **#6** |
| Weeks on chart | ✓ | `charts.chartWeeks` | **25** |
| Chart summary | ✓ | `charts.summary` | `"Hot 100 peak #6 · 25 weeks"` |
| Album on chart context | ✓ | `charts.albumTitle` | `"Pleasure + Pain"` |
| Weekly chart entries | ✗ | — | Not collected (Wikipedia excerpt mentions weekly charts section but no structured rows) |
| UK / international peaks | ✗ (structured) | — | **In source excerpt only** — Wikipedia excerpt says UK #1 Nov 1979; not a candidate fact |
| Year-end charts | ✗ | — | Not collected |
| Certifications | ✗ | `songEntity.certifications[]` | **Empty array** (RIAA Gold mentioned in Wikipedia excerpt only) |

### Album / Release

| Asset | Present | Location | Detail |
|-------|---------|----------|--------|
| Album title | ✓ | `identity.albumTitle` | `"Pleasure + Pain"` |
| Release year | ✓ | `identity.year` | **1978** |
| Recording entity | ✓ | `recordings[0]` | `rec-obse3`, studio_album, releaseDate 1978 |
| Record label | ✗ | `recordings[0].label` | **null** |
| Catalog number | ✗ | `recordings[0].catalogNumber` | **null** |
| B-side | ✗ | — | Not collected |
| Recording studio | ✓ | fact + `recording.notes` | Muscle Shoals Sound Studio, Alabama |
| Track listing | ✗ (structured) | — | Full listing in Wikipedia **sourceLog excerpt** only (10 tracks) |

### Credits / Personnel

| Asset | Present | Location | Detail |
|-------|---------|----------|--------|
| Songwriter | ✓ (partial) | fact `7816c2eb…` | Even Stevens (via bathroom pitch story) |
| Producer | ✓ (partial) | same fact | Ron Haffkine mentioned in songwriter fact |
| Musicians / band lineup | ✗ (structured) | — | **11 musicians** in Wikipedia album excerpt (Ray Sawyer, Dennis Locorriere, etc.) — not extracted to facts |
| Engineers | ✗ | — | Not collected |

### External Sources

| Source | Present | sourceLog id | Notes |
|--------|---------|--------------|-------|
| Retroverse Canon | ✓ | retroverse-identity | Identity + album + year |
| Retroverse Cover Library | ✓ | retroverse-cover | Cover URL |
| Retroverse Graph (charts) | ✓ | retroverse-chart | Peak + weeks |
| VirtualDJ database.xml | ✓ | retroverse-vdj-snapshot | Path, year 1981, genre Rock, play count 2 |
| VirtualDJ Library (video) | ✓ | vdj-media-0d70c904 | MP4 path |
| VirtualDJ Library (audio) | ✓ | vdj-media-feb40a32 | MP3 fill version |
| Retroverse Year Workspace | ✓ | retroverse-year-workspace | Performance year context |
| Wikipedia (song) | ✓ | wiki-song-when-you-re-in-love… | Rich excerpt incl. UK #1, 1979 hit, chart tables (unparsed) |
| Wikipedia (album) | ✓ | wiki-album-pleasure-and-pain… | Track listing, personnel, RIAA Gold |
| MusicBrainz | ✗ | — | Not in sourceLog |
| Discogs | ✗ | — | Not in sourceLog |
| IMDb | ✗ | — | Not in sourceLog |
| Spotify | ✗ (direct) | — | No Spotify API metadata in collector |

### Audio Analysis

| Asset | Present | Location | Detail |
|-------|---------|----------|--------|
| Song DNA package | ✓ | `song-dna.json` | Tempo 109.6, key G#, energy/valence/danceability from `canonical_album_track_display+virtualdj_key` |
| Spotify-style features | ✓ (derived) | `song-dna.json` → `musical.*` | 9 dimensions populated |
| Lyrics | ✗ | `lyrics.available` | **false** |

### Video / Performance / TV

| Asset | Present | Location | Detail |
|-------|---------|----------|--------|
| Owned video file | ✓ | `videoPerformance.items[0]` | 1981 Rock video, 220s |
| Performance entity | ✓ | `performanceEntities[0]` | `perf-l35b9p`, music_video, year 1981 |
| Extracted frames | ✓ | 5 JPGs in `visual-assets/` | Alternate, Hero, Close-up, Crowd, Performance |
| TV appearances | ✗ | — | No TV/film facts |
| Live performance history | ✗ (beyond video) | — | Single video performance only |

### Images / Artwork

| Asset | Present | Detail |
|-------|---------|--------|
| Album cover (CDN) | ✓ | R2 URL in `visualAssets.coverUrl` |
| Hero frame | ✓ | hero.jpg @ 80s |
| Performance frame | ✓ | performance.jpg @ 200s |
| Close-up frame | ✓ | close-up.jpg — **not approved downstream** |
| Alternate frame | ✓ | alternate.jpg — **not approved downstream** |
| Crowd frame | ✓ | crowd.jpg — **not approved downstream** |

### Relationships / Discovery

| Asset | Present | Detail |
|-------|---------|--------|
| Related artists | ✓ (minimal) | `["Dr. Hook"]` only — self-reference |
| Related songs | ✗ | No graph expansion |
| Similar songs | ✗ | Not collected |
| Historical events | ✓ (partial) | 5 song timeline events (release, chart, 3 truncated wiki fragments) |

### Quotes

| Asset | Present | Detail |
|-------|---------|--------|
| Verified quotes | ✗ | No quote-category facts; wiki fragments used as cultural_impact facts |

### All 22 Candidate Facts (Collector)

| # | Category | Source | approvalStatus | Text (truncated) |
|---|----------|--------|----------------|------------------|
| 1 | trivia | Retroverse Graph | approved | Retroverse track identity: RVTR001341 |
| 2 | artist | Retroverse Graph | approved | Performed by Dr. Hook |
| 3 | album | Retroverse Graph | approved | Appears on "Pleasure + Pain" (1978) |
| 4 | album | Retroverse Graph | approved | Canonical cover art assigned |
| 5 | chart | Retroverse Graph | approved | Peaked #6 Hot 100, 25 weeks |
| 6 | trivia | Retroverse Graph | approved | VDJ play count: 2 |
| 7 | recording | Retroverse Graph | approved | Released 1978 |
| 8 | trivia | Retroverse Canon | approved | Title fragment "…by Dr." |
| 9 | trivia | Cover Library | approved | Cover assignment note |
| 10 | trivia | Cover Library | approved | Cover URL graph-owned |
| 11 | trivia | VDJ database | approved | VDJ metadata fragment (year 1981…) |
| 12 | trivia | VDJ database | pending | MP4 filename fragment |
| 13 | trivia | VDJ Library | pending | Path fragment |
| 14 | trivia | VDJ Library | pending | MP4 + plays |
| 15 | trivia | VDJ Library | pending | MP3 path fragment |
| 16 | cultural_impact | Wikipedia | approved | Song opener fragment |
| 17 | cultural_impact | Wikipedia | approved | Muscle Shoals studio |
| 18 | cultural_impact | Wikipedia | approved | Even Stevens / Ron Haffkine bathroom pitch |
| 19 | cultural_impact | Wikipedia | approved | Pleasure and Pain seventh album fragment |
| 20 | cultural_impact | Wikipedia | pending | Top 10 hits both singles |
| 21 | cultural_impact | Wikipedia | pending | UK/Canada/Australia chart hits |
| 22 | *(implicit in sources)* | Wikipedia excerpt | **not factized** | UK #1 1979, RIAA Gold, full personnel, track times |

---

# Phase 2 — Editor Audit

## What Editor Receives

Editor receives `collector.json` via `distillCollectorPackage()` (`lib/ops/studio/editor/distill.ts`). All 22 candidate facts are **input**, plus full timelines, performances, visual extraction, canonical model, story seed.

## Editor Output Counts

| Object | Path | Count |
|--------|------|-------|
| Approved facts (handoff cap) | `approved.facts[]` | **7** (hard limit `DISTILL_LIMITS.approvedFacts = 7`) |
| Workspace candidate facts | `workspace.candidateFacts[]` | **15** (top 20 ranked minus score-0 noise) |
| Accepted in workspace | status `accepted` | **11** |
| Pending in workspace | status `pending` | **4** |
| Rejected | status `rejected` | **0** |
| Approved images | `approved.images[]` | **2** |
| Image board total | `workspace.imageBoard[]` | **5** |
| Approved cards | `approved.cards[]` | **0** |
| Approved quotes | `approved.quotes[]` | **0** |
| Planned cards | `workspace.plannedCards[]` | **8** (all `approved: false`) |
| Timeline events | `workspace.evidence.timeline[]` | **5** |
| Story ideas (cards) | `workspace.storyIdeas.cards[]` | **8** (all `suggested`) |
| Performance screenshots | `workspace.performances.perf-l35b9p.screenshots[]` | **5** |

## Collector → Editor Field Actions

| Collector Asset | Editor Action | Reason |
|-----------------|---------------|--------|
| 22 candidate facts | **15 kept** in workspace; **7 never imported** | `rankFacts()` assigns score 0 to RVTR identity, graph noise, truncated VDJ fragments → excluded from `buildCandidateFacts()` top-20 |
| 7 canonical/identity facts (RVTR id, artist, cover meta) | **Removed / ignored** | Noise filters: `isNoiseFact`, `GRAPH_NOISE`, `/^retroverse track identity/i` |
| 4 pending VDJ path fragments | **Pending** (not accepted) | `approvalStatus !== "approved"` → distill marks `pending` |
| 2 pending Wikipedia international facts | **Pending** | Same — awaiting approval, not in approved layer |
| 16 approved collector facts | **11 accepted**, **7 in approved layer** | Cap at 7 for `approved.facts` |
| 5 extracted frames | **5 on image board**, **2 approved** | `buildPerformanceWorkspace`: only `Hero` + `Performance` auto-approved for recommended perf |
| 3 frames (alternate, close-up, crowd) | **Ignored for handoff** | `approved: false` on image board |
| Album cover URL | **Kept** in evidence, not a separate approved image | Cover used via graph, not performance screenshot |
| 8 planned cards | **Created, none approved** | Pass-through warning: `no_planned_cards` |
| Full Wikipedia personnel/track listing | **Not factized** | Never entered candidateFacts — only in sourceLog excerpt |
| songEntity.writers | **Merged** into Wikipedia fact text | Not separate approved fact |
| recordings[0].label / catalogNumber | **Ignored** | null in collector |
| song-dna.json | **Not consumed by Editor** | Parallel artifact; used later by Director/Publisher renderer |
| Timelines (7 events) | **Normalized** into `evidence.timeline` + entity timelines | 3 events are truncated wiki sentences with date "—" |
| culturalContext.notes | **Merged** into `evidence.culture` string | Not separate cards |
| relationships | **Kept** as string | `"Related artists: Dr. Hook."` |
| missingAreas | **Kept** | `"Artist relationship depth"` → editorialNotes.missing |

## Facts: Complete Disposition Table

| Fact ID (short) | Collector | Editor Workspace | Approved Layer | Handoff | Why excluded if not approved |
|-----------------|-----------|------------------|----------------|---------|------------------------------|
| 780ced06 | approved | **NOT_IN_EDITOR** | — | — | Score 0: RVTR identity noise |
| c5cc038b | approved | **NOT_IN_EDITOR** | — | — | Score 0: redundant artist identity |
| 0b11f904 | approved | accepted | **yes (#7)** | **dropped** | In approved but **not** in Editorial Brain `promotedFactIds` |
| 240e657a | approved | **NOT_IN_EDITOR** | — | — | Score 0: cover metadata noise |
| d1fbc407 | approved | accepted | yes | yes | Chart fact — kept |
| b67b9be4 | accepted | accepted | no (cap) | — | Accepted but outside top-7 approved slice |
| c5cc0eef | approved | accepted | yes | yes | Release year |
| df065e91 | approved | accepted | no | — | In promotedFactIds but **outside approved.facts cap** |
| f1f45195 | approved | **NOT_IN_EDITOR** | — | — | Cover metadata noise |
| 399337ca | approved | accepted | no | — | Graph-policy noise |
| 57b05820 | approved | accepted | no | — | VDJ metadata fragment |
| b98a7d0c | approved | **NOT_IN_EDITOR** | — | — | VDJ noise score 0 |
| 0cefaef0 | pending | pending | — | — | Path fragment — pending |
| 1b6eec6b | pending | **NOT_IN_EDITOR** | — | — | Noise |
| 6f05175e | pending | **NOT_IN_EDITOR** | — | — | Noise |
| 675870b5 | pending | pending | — | — | Path fragment |
| bb937e0c | approved | accepted | yes | yes | Wiki opener (truncated) |
| b4bb9aa8 | approved | accepted | yes | yes | Studio location |
| 7816c2eb | approved | accepted | yes | yes | Songwriter/producer story |
| 9975324c | approved | accepted | yes | yes | Album fragment |
| 1426bd17 | pending | pending | — | — | International/album context — pending |
| 5efbcbf0 | pending | pending | — | — | UK/Canada/Australia — pending |

**Net:** 22 collector facts → **6 facts** in Director handoff (not 7).

---

# Phase 3 — Director Audit

## What Director Receives (`director-handoff.json`)

| Asset | Count |
|-------|-------|
| Approved facts | **6** |
| Approved images | **2** |
| Approved cards | **0** |
| Approved quotes | **0** |
| Performance | **1** (perf-l35b9p, Official Video 1981) |
| Narrative blueprint beats | **5** |
| Key moments | **2** |
| Story prose | headline + hook + summary + fullStory (truncated/duplicative) |

## Director Output (`director.json` / render spec)

| Metric | Value |
|--------|-------|
| Experience plan scenes | **7** |
| Core museum exhibits | **5** |
| Extended exhibits | **2** (chart milestone, music video) |
| Estimated runtime | **52s** |
| Template downgrades | Scene 1: Hero → Story (missing supporting copy) |
| Unique images in manifest | **2** (hero.jpg reused on scenes 1, 2, 6) |
| Facts linked in render spec | **2** fact texts total across 7 scenes |
| Song DNA in plan | exhibit slot present, **no image assets** |

## Experience Catalog (RVTR001341)

| Experience | Available (data) | Generated (Director) | Published (live) | Skipped / Reason |
|------------|------------------|----------------------|------------------|------------------|
| Hero Cover | ✓ cover + hero frame | ✓ Scene 1 (cover) | ✓ | Downgraded to Story template; **empty supportingCopy** |
| Chart Journey | ✓ peak #6, 25 weeks | ✓ Scene 2 | ✓ | Links **wrong fact** (wiki opener, not chart fact); chart UI from track page |
| Timeline | ✓ 5 editor timeline events | ✗ | ✗ | No timeline template selected; events not bound to scenes |
| Song Story | ✓ fullStory in handoff | ✗ (prose not rendered) | ✗ | Museum model uses images not narrative body |
| Record Label | ✗ null in collector | ✗ | ✗ | No label metadata |
| Album Card | ✓ album facts | ✗ | ✗ | Facts exist but no album exhibit type in museum plan |
| Personnel / Musicians | ✗ (excerpt only) | ✗ | ✗ | Never factized |
| Recording Session | ✓ Muscle Shoals + songwriter fact | partial | ✗ | Fact in handoff but **not placed** in any scene |
| Music Video | ✓ owned MP4 + frames | ✓ Scene 7 (extended) | ✗ | **Dropped at publish** (extended not appended) |
| TV Performances | ✗ | ✗ | ✗ | Not collected |
| Live History | ✓ 1 video perf | ✓ Scene 5 (performance exhibit) | ✓ | Image-only; no venue/year copy on screen |
| Artist Spotlight | ✓ minimal | ✗ | ✗ | No exhibit type |
| Songwriter Spotlight | ✓ fact 7816c2eb | ✗ | ✗ | Fact not assigned to scene |
| Producer Spotlight | ✓ (in songwriter fact) | ✗ | ✗ | Same |
| Historical Context | ✓ 4 cultural notes | ✗ | ✗ | Not templated |
| Similar / Related Songs | ✗ | ✗ | ✗ | relationships = self only |
| Museum Exhibit (5-room) | ✓ | ✓ 5 core + 2 extended | **5 only** | Extended requires `approvedClass: extended\|showcase` |
| Song DNA | ✓ song-dna.json | ✓ Scene 4 | ✓ | Watercolor generated; **no factual copy** |
| Iconic Moment | ✓ performance frame | ✓ Scene 3 | ✓ | Headline only: "The Breakthrough Moment" |
| Quote Card | ✗ | ✗ | ✗ | approvedQuotes empty |
| Did You Know / Fact Stack | ✓ 6+ facts | ✗ | ✗ | Museum plan doesn't allocate fact-stack scenes |
| DJ Slides / Mobile Story | ✓ render spec | ✓ spec exists | partial | 5 scenes not 7 |
| Gallery (3 unused frames) | ✓ close-up, alternate, crowd | ✗ | ✗ | Not approved in Editor |

## Director Review Warnings (from package)

- Missing assets: **Needs Supporting Copy** (Scene 1)
- Readiness: `missing_optional_assets`
- factCoveragePct: low (per Publisher evaluation)
- Duplicate template warnings: hero frame repeated across slides

---

# Phase 4 — Publisher Audit

## What Publisher Receives

- `director.json` + `director-render-spec.json` (7 scenes)
- `collector.json` (for evaluation asset checks)
- `song-dna.json` (for Song DNA artwork check)

## Evaluation Summary

| Metric | Value |
|--------|-------|
| qualityScore | **63** |
| publicationClass | needs_coaching → **approved ready** (pass-through) |
| Story dimension | **20/100** — missing opening/closing beats, weak headlines |
| Visual variety | **25/100** — repeated performance frames |
| Asset coverage | **90/100** |
| Patron experience pacing | **100/100** |

## Published vs Planned

| Item | Director Plan | Published Live |
|------|---------------|----------------|
| Scene count | 7 | **5** |
| Extended exhibits | 2 | **0** (appendExtended=false for `ready` class) |
| Fact texts on scenes | 2 in spec | **0** on presentable scenes |
| Images used | 2 unique | **2** (hero reused) |
| Chart journey data | ✓ | ✓ (from track page chart payload) |
| Song DNA artwork | ✓ | ✓ |
| Story prose | in handoff | **Not displayed** |
| Opening/closing beats | empty in spec | **Empty** |

## Asset Checks (Publisher)

| Check | Present |
|-------|---------|
| Cover artwork | ✓ |
| Performance frames | ✓ |
| Chart journey | ✓ |
| Song DNA artwork | ✓ |
| Derived artwork | ✓ |

## Placeholder / Empty / Disabled Pages

| Scene | Issue |
|-------|-------|
| Cover (published #1) | Title only; **no supporting copy** |
| Chart Journey (#2) | **Empty headline**; fact not shown in UI |
| Iconic Moment (#3) | Headline present; no body facts |
| Song DNA (#4) | **Empty headline**; visual only |
| Performance (#5) | **Empty headline**; performance ID linked but minimal copy |

## Coaching Issues (non-blocking)

- Story arc needs editorial attention
- Visual variety below editorial standard
- 5 slides lack strong headlines

---

# Phase 5 — Complete Flow Matrix

| Collector Asset | Editor Action | Director Received | Published | Visible in Experience |
|-----------------|---------------|-------------------|-----------|------------------------|
| 22 candidate facts | 15 workspace / 7 approved cap / 6 handoff | 6 facts | 2 fact IDs in spec | **~0** (facts not rendered in scene UI) |
| Hot 100 #6 | kept in approved | chart fact available | chart exhibit | **Yes** (chart visualization) |
| 25 weeks on chart | kept | in fact d1fbc407 | linked scene 6 only | **Partial** (extended scene dropped) |
| UK #1 1979 | in wiki excerpt only | never factized | — | **No** |
| Muscle Shoals studio | approved | handoff | not scene-linked | **No** (text) |
| Songwriter bathroom pitch | approved | handoff | not scene-linked | **No** (text) |
| Album Pleasure + Pain | approved then dropped from handoff | partial (9965324c) | — | **No** |
| RIAA Gold / personnel | wiki excerpt only | — | — | **No** |
| Album cover CDN | kept | cover scene | cover exhibit | **Yes** |
| hero.jpg | approved | scenes 1,2,6 | reused 3× | **Yes** |
| performance.jpg | approved | scenes 3,5,7 | yes | **Yes** |
| close-up.jpg | not approved | — | — | **No** |
| alternate.jpg | not approved | — | — | **No** |
| crowd.jpg | not approved | — | — | **No** |
| MP4 video | performance entity | perf-l35b9p | performance room | **Partial** (still image, not video) |
| song-dna.json | not via editor | director/collector | song DNA scene | **Yes** (visual) |
| Spotify-style features | song-dna | renderer | DNA only | **Partial** (not labeled for patron) |
| Lyrics | unavailable | — | — | **No** |
| Timelines (5 events) | normalized | not bound | — | **No** |
| 8 planned cards | all unapproved | 0 cards | — | **No** |
| 8 story idea cards | suggested only | — | — | **No** |
| 4 quote ideas | suggested only | 0 quotes | — | **No** |
| Related artists | minimal | string only | — | **No** |
| Record label | null | — | — | **No** |
| Weekly chart rows | not collected | — | — | **No** |
| MusicBrainz / Discogs / IMDb | not collected | — | — | **No** |
| VDJ tags | empty array | — | — | **No** |
| International chart facts | pending | — | — | **No** |

---

# Phase 6 — Mission Control Audit

## Package Stage (Ground Truth)

`assessPackagePipelineStage(RVTR001341)`:

| Flag | Value |
|------|-------|
| hasCollector | true |
| hasEditor | true |
| editorSubmitted | true |
| hasDirector | true |
| publisherEvaluated | true |
| publisherApproved | true |
| stage | **published** |

## Pipeline Events (studio-pipeline-events.json)

Complete chain recorded for RVTR001341:

1. collector_started → collector_complete  
2. editor_started → editor_complete  
3. director_started → director_complete  
4. publisher_started → publisher_complete → **published**

Timestamps: 2026-06-28 ~02:10 (Collector) through ~02:25 (Publish). **Mission Control event log matches disk artifacts.**

## Mission Control Metrics vs Reality

| MC Metric | Reflects | Discrepancy |
|-----------|----------|-------------|
| Department queue counts | Packages waiting per dept | **Accurate** for queue; RVTR001341 not in queue (complete) |
| Completed today / progress | Collector progress file | **Accurate** for run completion |
| Stage labels | File existence + handoff flags | **Accurate** — shows Published |
| Patron value / quality | Editor editorialReview | Shows **9.3 / Strong** — **overstates** published story quality (Publisher scored story **20**) |
| Asset richness indicators | Not shown per-RVTR | MC implies completion = richness; **no utilization metric** |
| Director workspace catalog | 34 experience types | Shows many "generated/published" at type level but **patron sees 5 rooms** |

**Conclusion:** Mission Control is **truthful for pipeline position** but **does not surface data-loss metrics** (facts approved vs facts rendered, images extracted vs images shown).

---

# Missing / Lost / Unused Information

## Never Collected

- Weekly Billboard position rows  
- UK/#1 international chart (in wiki text only)  
- Record label, catalog #, B-side  
- Full band personnel (in wiki excerpt)  
- MusicBrainz, Discogs, IMDb  
- TV appearances  
- Lyrics  
- Related songs graph  
- VDJ User2 / Retroverse tags (empty)

## Collected but Lost Before Handoff

- 7 candidate facts filtered as noise (identity, cover meta, VDJ fragments)  
- 3 image frames not approved (alternate, close-up, crowd)  
- 2 international Wikipedia facts left **pending**  
- 8 planned cards never approved  
- 4 quote ideas never promoted  
- Full wiki excerpt content (personnel, track listing, certifications)

## In Handoff but Not Published Visibly

- 4 of 6 handoff facts not linked to any published scene text  
- fullStory / narrative blueprint prose (not rendered in museum UI)  
- 2 extended director scenes (chart milestone, music video)  
- Timeline events (5)  
- Recording notes as structured evidence strings

## Unused but Available on Disk

- `song-dna.json` musical features (partially used for DNA visual only)  
- `visual-identity.json`  
- 3 unused JPG frames  
- Second VDJ media item (MP3 fill version)

---

# Recommendations (Investigation Only — No Fixes Applied)

1. **Measure utilization, not just completion.** Add per-RVTR metrics: `facts_collected / facts_handoff / facts_rendered / images_extracted / images_shown`.

2. **Audit Editor caps.** `DISTILL_LIMITS.approvedFacts = 7` and screenshot approval rule (`Hero | Performance` only) are the largest intentional data reductions.

3. **Separate collection from presentation.** Wikipedia excerpts contain personnel, certifications, and international charts that never become candidate facts — consider structured extraction at Collector stage.

4. **Director fact placement.** Chart Journey scene links fact `bb937e0c` (wiki opener) instead of `d1fbc407` (chart fact) — verify exhibit→fact mapping.

5. **Publish gate transparency.** `approvedClass: ready` silently drops 2 extended scenes; operators may believe 7-scene plan shipped.

6. **Museum vs Story modes.** Current publish path (`composeMuseumExperience`) is image-first; narrative prose in Editor output has **no render target**.

7. **Mission Control.** Add "data fidelity" panel: collector fact count → editor approved → director linked → patron visible.

---

## Execution State: **COMPLETE**

Audit deliverable: `reports/pipeline-data-flow-audit.md`  
No pipeline, prompt, or generation changes were made.
