# Retroverse Experience 2.0 — From Research To Delight

**Date:** 2026-06-24  
**Scope:** Patron-facing song experience audit + architecture proposals  
**Principle:** Research exists to improve Experience. Experience is the product.

---

## Executive Summary

Retroverse has built a **research factory** (636 song packages, Ollama extraction, story cards, timelines, vault sources) and a **canonical graph** (chart history, albums, artists, covers for thousands of RVTRs). The patron Song Experience at `/retroverse-2/song/[rvtr]` reads almost **none of it**.

Today a patron sees: title, artist, year, cover, generic chart blurbs, and tabbed sections assembled from graph templates. A richly researched package like *Heart of Glass* holds 9 story cards, 15 facts, 10 timeline events, label intel, and video facts — **zero of which reach the page**.

The highest-impact fix is not more research. It is **wiring `loadPerformanceDeck()` card projection into the Song Experience** and adding a **Live Mode** that surfaces one fact, one story, one discovery at room-scale typography.

---

## 1. Experience 2.0 Audit

### Method

Compared **data existence** (Postgres graph + package JSON) vs **patron presentation** (`app/retroverse-2/song/[rvtr]/page.tsx`, `/live`, `/retroverse-2/live`) for five representative samples.

| Sample | RVTR | Role |
|--------|------|------|
| Top chart hit | RVTR044043 | *Heart Of Glass* — Blondie, Hot 100 #1 |
| Showcase / hardcoded | RVTR891825 | *American Pie* — special-case content in page.tsx |
| Rich package | RVTR023559 | *Dreams* — Cranberries, 9 story cards, 19 facts |
| Minimal package | RVTR016328 | *Mamma Mia* — ABBA, draft, vault only |
| Sunday Nights live | (current bridge RVTR) | Whatever VDJ is playing → same Song Experience route |

### 1.1 Top 100 Song — *Heart Of Glass* (RVTR044043)

| Layer | Exists | Shown | Hidden |
|-------|--------|-------|--------|
| Identity (title, artist, RVTR) | ✓ graph + package | ✓ hero | RVTR (patron OK) |
| Cover | ✓ Cover Library | ✓ hero | — |
| Hot 100 #1, 21 weeks | ✓ graph + package intel | ✓ hero stat + tab boilerplate | Full chart trajectory (`trajectoryWeeks` loaded but **never rendered**) |
| Label (Chrysalis Records) | ✓ package intel | ✗ | Entire label card |
| Story cards (9) | ✓ package | ✗ | "Grammy Hall of Fame", MTV first rotation, Solid Gold debut, etc. |
| Timeline (10 events) | ✓ package intel | ✗ partial | 1978 re-recording, Gold certification, video debuts |
| Recording / video facts | ✓ package | ✗ | 6 video facts, 2 recording facts |
| Cultural impact facts | ✓ package (4 approved) | ✗ | Pop-culture placement, induction |
| Artist facts | ✓ package | ✗ | Dedicated artist card content |
| Wikipedia / vault sources | ✓ 7 vault entries | ✗ | All provenance |
| Related songs (graph) | ✓ `relatedTracks` | ✓ weak — 4 links in Story tab only | No "You May Also Like" panel |
| Year context (1978/1981) | ✓ `/rv/{year}` | ✓ Culture tab — defining songs | Editorial copy is generic |
| YouTube playback | ✓ resolver | ✓ CTA | — |
| VDJ local media | ✓ metadata | ✗ one line in Media tab if `hasVdjMedia` | Performance history |

**Patron feels:** "Nice cover. It went #1." Not: "This was in MTV's first 90-video rotation."

### 1.2 American Pie (RVTR891825) — The Exception

| Layer | Exists | Shown | Hidden |
|-------|--------|-------|--------|
| Package research | Unknown / may not exist on disk | ✗ | N/A |
| Hardcoded narrative | In `page.tsx` (`isAmericanPie()`) | ✓ rich tabs, cultural moments | **Not scalable** — one song gets museum treatment |
| Graph data | ✓ | ✓ mixed with hardcoded | — |
| `retroverse2.story` control fields | If package exists | ✓ can override hardcoded | — |

**Patron feels:** This is what Experience 2.0 should feel like for every song with research. **Problem:** it is hand-authored in code, not generated from packages.

### 1.3 Richly Researched — *Dreams* (RVTR023559)

Package status: `review`. 9 story cards, 19 facts, 7 vault sources, 10 timeline events, recording + video fact arrays.

| Exists in package | Shown on Song Experience |
|-------------------|-------------------------|
| Debut single story, 1992 Island release | ✗ |
| 2017 acoustic re-release | ✗ |
| Three music videos | ✗ |
| Demo tape with *Linger* | ✗ |
| Chart peak #42, 20 weeks | ✓ if graph agrees — generic sentence |
| Story headlines (ranked) | ✗ |

**Gap:** Ops Browser Plus marks ~611 songs "Experience Ready" (package status `review`/`published` + story count). Patrons cannot tell the difference between Dreams and Mamma Mia on the public page — both show "Experience Ready" badge.

### 1.4 Minimally Researched — *Mamma Mia* (RVTR016328)

| Layer | Exists | Shown |
|-------|--------|-------|
| Package file | draft, 0 facts, 0 cards | Badge still says "Experience Ready" for any resolved RVTR |
| Canon vault captures | 4 sources | ✗ |
| Graph chart/album (likely) | probably ✓ Postgres | ✓ template copy only |

**Patron feels:** Same shell as a researched song — emptier tabs, no stories. **False readiness signal.**

### 1.5 Sunday Nights / Live

Routes: `/live`, `/retroverse-2/live`, channel redirect → `/retroverse-2/song/[rvtr]`.

| Layer | Exists | Shown |
|-------|--------|-------|
| Now playing identity | ✓ bridge + `loadTrackPage` | ✓ cover, title, artist (Live 2 slightly richer) |
| Package story cards | ✓ for playing RVTR | ✗ |
| Live 2 "Why This Song Matters" | — | **Template cards** from chart/year/album — not research |
| Discovery | ✓ graph | ✗ on live surfaces |
| Room-readable fact | ✓ in package | ✗ |

**Patron at Sunday Nights:** Sees cover + buttons. Must tap through to Song Experience and scroll tabs to find anything interesting — if it exists in research at all.

### 1.6 Aggregate: Stored vs Surfaced

| Knowledge type | Approx. songs (active VIDEO) | Reaches patron UI today |
|----------------|------------------------------|-------------------------|
| Chart history (Postgres) | 4,967 | Partial — peak/weeks only |
| Album links | 4,390 | Album title in hero stats |
| Cover Library | 4,034 | Cover image |
| Package with story cards | 345 | **~0** (not wired) |
| Package timeline intel | 1,094 | **0** |
| Candidate facts | 1,148 | **0** |
| Research vault | 1,264 packages | **0** |
| Chart trajectory weeks | loaded in `TrackPageData` | **0** |
| Artist page depth | all with slug | Artist tab — stats only |
| Year destination | years with chart history | Culture tab — link list |
| Performance deck cards | 395+ packages | **Orphaned** (deck route redirects) |
| Song sheet artifacts | package-backed | **Orphaned** (no public route) |

**The presentation layer is still a graph template with one hardcoded demo song.**

---

## 2. Card Architecture Proposal

### Design principle

Cards are **projections**, not pages. They appear when backing data exists. No fixed count. No empty placeholders.

### Source of truth

```
SongPackage + TrackPageData + ArtistPageData + RvYearDestination
        ↓
  experience-card-projector.ts  (new — unify deck + graph)
        ↓
  ExperienceCard[]  (ordered, scored, deduped)
```

Reuse `loadPerformanceDeck()` card types as the internal model — already maps research to patron cards:

| Card type | Trigger (data exists) | Primary source | Patron headline pattern |
|-----------|----------------------|----------------|-------------------------|
| **Hero** | always | graph + package metadata | (layout, not a scroll card) |
| **Story** | `storyCards` rank > 0 | package | headline + fact |
| **Chart** | peak or trajectory | graph + `intel.chartHistory` | "Chart Journey" |
| **Timeline** | `intel.timelineEvents` ≥ 2 | package intel | year-ladder |
| **Artist** | artist facts or artist page | package + graph | "About {Artist}" |
| **Album** | album link | graph | cover + era |
| **Label** | `intel.label` | package intel | Record Label card (reuse `RecordLabelCard`) |
| **Video** | video facts or `videoInfo` | package | "The Music Video Story" |
| **Performance** | `hasVdjMedia` or performance facts | VDJ + package | "In The Retroverse Library" |
| **Cultural Context** | cultural_impact / tv_film facts | package | "Still In The Culture" |
| **Did You Know?** | trivia category, high importance | package facts | single beat |
| **Retroverse Note** | Bob Talbert / promoted cards | package (`promoted` flag in deck) | editorial voice |
| **Related Song** | graph `relatedTracks` or package | graph | carousel chip |
| **Discovery** | year defining songs, same chart week | graph | "Same Moment" |

### Rendering rules

1. **Score and cap:** Show top 12 cards by rank/confidence; Live Mode takes top 1 per category.
2. **Suppress rank-0 cover card** on full experience (hero already shows cover); keep for Live.
3. **Hide low-confidence** (< 0.4) unless nothing else exists — fall back to graph templates.
4. **Deduplicate** facts already shown in hero stats.
5. **Empty tabs die:** Replace fixed 6-tab model with **dynamic sections** driven by card groups (Story, Chart & Timeline, People, Culture, Media, Discover).

### Tab → Card migration

| Current tab | Becomes |
|-------------|---------|
| Overview | Hero + top 3 story cards + chart card |
| Story | Story cards + timeline |
| Artist | Artist card + signature tracks (graph) |
| Culture | Cultural context + year discovery cards |
| Media | Video + performance cards |
| Timeline | Timeline card (infographic — reuse `TimelineInfographic`) |

### Badge honesty

Replace universal "Experience Ready" with:

- **Story Ready** — ≥ 3 visible story cards
- **Chart Connected** — graph chart data only
- **Exploring** — identity only

---

## 3. Live Mode Proposal

### Job

When a song is **playing in the room**, the screen answers one question: *"Why should I care about this song right now?"*

Readable from 15 feet. No scrolling. No tabs.

### Layout (single viewport, mobile + TV)

```
┌─────────────────────────────────────────┐
│  ● NOW PLAYING                          │
│                                         │
│         [ LARGE COVER ]                 │
│                                         │
│         HEART OF GLASS                  │
│         Blondie · 1981                  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ DID YOU KNOW?                    │   │
│  │ First Blondie video in MTV's     │   │
│  │ opening 90-video rotation.       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ STORY                            │   │
│  │ The music video debuted on       │   │
│  │ Solid Gold — January 31, 1981.   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌──────────┐  ┌──────────────────┐   │
│  │ DISCOVER │  │ RELATED          │   │
│  │ 1978 →   │  │ Rapture · Blondie│   │
│  └──────────┘  └──────────────────┘   │
│                                         │
│      [ Explore Full Story ]             │
└─────────────────────────────────────────┘
```

### Data selection (deterministic)

```typescript
liveModeProjection(package, track, artist, yearDest) => {
  fact: top approved fact by importance (category ≠ chart if peak shown)
  story: storyCards[1] // skip rank-0 cover card
  discovery: yearDest.definingSongs[0] | chartContext peer
  related: relatedTracks[0] | package related
}
```

### Routes

- `/retroverse-2/live` — channel follower + Live Mode when `channel.running`
- `/live` — same projection (unify; retire template story cards in `retroverse-live-2-view.tsx`)
- Auto-redirect from QR during show → Live Mode, not full Song Experience

### Typography

- Title: `clamp(2.5rem, 8vw, 4.5rem)` bold
- Fact/story: `clamp(1.25rem, 4vw, 2rem)` — max 2 lines each
- Cream paper, teal accent, thick borders (matches `live.css` + RV2)

---

## 4. Background Reader Proposal

### Two-layer research presentation

| Layer | Audience | Content |
|-------|----------|---------|
| **Background** (default) | Patron | Clean narrative paragraphs assembled from approved facts + story card copy. No Wikipedia logo. No URLs. No vault IDs. |
| **Sources** (expandable) | Curious patron | Provenance panel: source name, capture date, excerpt, link |

### Assembly

1. Take top 3 story cards + cultural/recording facts.
2. Ollama **narrative stitch** (optional, cached in package as `experienceNarrative`) — or deterministic template merge for v1.
3. Render in reader typography (Georgia, generous line-height, max-width 42rem).

### Where it lives

- Song Experience: "The Story" section above card grid — **reader first, cards second**.
- Ops: Phase B of Browser Plus 3 (`SourceReader.tsx` — already planned in `reports/browser-plus-3/IMPLEMENTATION-PLAN.md`).

### Rules

- Never show `researchVault[].url` inline in narrative.
- "Sources (3)" disclosure at bottom — expands to list.
- Canonical facts labeled "Retroverse" not "Wikipedia" in patron view even when vault origin was wiki.

---

## 5. Discovery Engine Proposal

### Patron question

*"What else should I explore from here?"*

### Lanes (show section when non-empty)

| Lane | Graph query | Example |
|------|-------------|---------|
| **You May Also Like** | Same artist signature tracks + related artists' hits | Blondie → *Rapture*, *Call Me* |
| **Related Songs** | `relatedTracks` + package `relatedSongs` | Same artist chronology |
| **Same Artist** | `artist.signatureTracks` | Top 6 excluding current |
| **Same Era** | `RvYearDestination.definingSongs` | 1981 floor |
| **Same Chart Context** | Tracks peaking same year/week band | "#1 songs of 1981" |
| **Same Album** | `track.albums[0]` tracklist | Album siblings |
| **Same Story** | Shared timeline event keywords (future) | "MTV launch" cluster |
| **Same Event** | RV year events (future graph) | Sunday Nights set neighbors |

### Implementation

New `lib/retroverse-2/discovery-lanes.ts`:

- Inputs: `TrackPageData`, `ArtistPageData`, `RvYearDestination`, optional `SongPackage`
- Output: `DiscoveryLane[]` with `{ id, title, items: { label, href, coverUrl, meta }[] }`
- Render: horizontal collectible shelf below cards (RV2 moment-grid pattern)

### Ranking

1. Canonical graph edges first (stable RVTR links)
2. Chart significance (peak, weeks)
3. Package related songs
4. Never fuzzy search in discovery lanes

---

## 6. Continuous Enrichment → Experience

### Closed loop (target state)

```
VDJ play / chart sync / Ollama batch
        ↓
processSong(rvtr)  — canon vault → wiki → facts → stories
        ↓
buildCardsFromReview(rvtr)  — storyCards assembled
        ↓
status: review | cards_ready  (auto, no human)
        ↓
experience-card-projector  — reads package on next page load
        ↓
Patron sees new Story / Video / Timeline cards
```

### Automation triggers

| Event | Experience update |
|-------|-------------------|
| New fact approved (auto-top-N) | Did You Know? / Story card appears |
| `buildCardsFromReview` | Story cards populate |
| Cover assigned in Cover Library | Hero + Album card art updates |
| Chart sync | Chart card + Same Chart Context lane |
| VDJ tag write-back | Performance / Retroverse Note card |
| Narrative stitch job | Background reader text refreshes |

### Remove human gates for patron-visible content

Current pipeline stops at `review` — "Ready for human review". For Experience 2.0:

- **Auto-publish cards** when `confidence ≥ threshold` and `issueFlags` empty.
- Human review moves to **ops-only QA**, not a patron blocker.
- `retroverse2.story` control fields become **override**, not primary authoring.

### Weekly delight without curation

Scheduled job: process top N unprocessed RVTRs by play count (not 7,212-file queue — use Definition C ~2,475 from Browser Plus audit). Each processed song **automatically** gains cards on next visit.

---

## 7. Self-Healing Roadmap

### Target pipeline

```
VirtualDJ Universe
        ↓ identify (RVTR on Label)
Research (Ollama + canon + wiki)
        ↓
Experience (cards + live + discovery)
```

### Where it breaks today

| Stage | Break | Impact |
|-------|-------|--------|
| **Identify** | 779 unmatched 1970s videos (per territory audit) | No experience possible |
| **Research queue** | "Needs Research" = missing JSON file, ignores existing graph | Wastes Ollama on 7,212 songs |
| **Research → Experience** | **No loader connects package to Song Experience page** | Primary break |
| **Card build** | Requires manual `buildCardsFromReview` after review | Cards exist in ops, not patron |
| **Publish gate** | `review` status treated as ready but content unused | False positive |
| **Deck / Song Sheet** | Built, then retired from patron routes | Wasted artifact investment |
| **Live** | Template copy, no package read | Room experience flat |
| **Cover** | Package coverUrl ≠ Cover Library (771 vs 4,034) | Wrong art in research metadata |
| **Enrichment feedback** | No listener from package save → revalidate experience cache | Stale pages |

### Automation opportunities (ordered)

| Priority | Automation | Effort |
|----------|------------|--------|
| P0 | Wire `loadPerformanceDeck` cards into Song Experience | Small |
| P0 | Live Mode reads package projection | Small |
| P1 | Auto `buildCardsFromReview` at end of `processSong` | Small |
| P1 | Discovery lanes from existing graph loaders | Medium |
| P1 | Honest readiness badges | Tiny |
| P2 | Background reader narrative cache | Medium |
| P2 | Auto-publish when cards + cover + no issue flags | Medium |
| P2 | Nightly play-count-prioritized Ollama batch | Medium |
| P3 | Package save → `revalidatePath` for song + live | Small |
| P3 | Merge Cover Library → package metadata on process | Medium |
| P4 | Timeline/story clustering for Same Story lane | Large |
| P4 | Narrative stitch via Ollama (cached) | Medium |

### Self-healing milestones

**M1 — Wire-up (1–2 days)**  
Package cards visible on Song Experience. Live Mode shows one fact + story. American Pie hardcode deprecated for package-backed content.

**M2 — Discovery (3–5 days)**  
Discovery lanes on song page. Chart trajectory rendered. Timeline infographic from package intel.

**M3 — Autopilot (1 week)**  
processSong → auto cards → auto patron-visible. Play-count batch. Revalidation on package update.

**M4 — Narrative (2 weeks)**  
Background reader. Expandable sources. Weekly enrichment cron.

---

## 8. Highest-Impact Improvements (Patron-Noticeable)

Ranked by **felt delight per engineering hour**:

1. **Show story cards on the Song Experience** — Patrons immediately see research that already exists (345+ songs). *"Retroverse knows something about this song."*

2. **Live Mode with real facts** — Sunday Nights room transforms from cover + buttons to cover + surprise. *No scroll, no tap required to learn something.*

3. **Discovery shelf** — Same artist / same year chips below the fold. *"I want to keep exploring."*

4. **Chart trajectory visualization** — Peak is known; the **journey** is the story. Uses data already in `TrackPageData.trajectoryWeeks`.

5. **Timeline infographic** — Package intel already has events; `TimelineInfographic` component exists on orphaned song sheet.

6. **Honest empty states** — Remove misleading "Experience Ready" when no stories. Show graph-backed chart copy instead of silence.

7. **Background reader paragraph** — One clean "About this song" narrative above cards, stitched from top facts.

8. **Auto-card build after Ollama** — Every processed song gets richer **next week** without Bob touching Browser Plus.

---

## Appendix — Key Files

| Concern | File |
|---------|------|
| Patron song page (template-only today) | `app/retroverse-2/song/[rvtr]/page.tsx` |
| Package card model (unused patron-side) | `lib/ops/intelligence/load-performance-deck.ts` |
| Song sheet artifacts (orphaned) | `lib/ops/intelligence/load-song-sheet.ts`, `components/rvtr/SongSheetView.tsx` |
| Research pipeline | `lib/ops/intelligence/process-song.ts` |
| Live template cards | `app/retroverse-2/live/retroverse-live-2-view.tsx` |
| Graph track loader | `lib/track/load-track-page.ts` |
| Experience readiness (ops) | `lib/ops/intelligence/song-experience-renderability-core.ts` |
| Browser Plus queue audit | `reports/browser-plus-3/NEEDS-RESEARCH-AUDIT.md` |
| Background reader (planned ops) | `reports/browser-plus-3/IMPLEMENTATION-PLAN.md` Phase B |

---

*Research is not the product. Wire the research that exists. The experience gets interesting automatically.*
