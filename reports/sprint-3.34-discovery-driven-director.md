# Sprint 3.34 — Discovery-Driven Director

**Objective:** Teach the Director to find what is genuinely interesting about a song before deciding how to present it.

**Scope:** Director storytelling pipeline + workspace UI only. Collector, Editor, Retrograph architecture, Creative Review, and Publisher unchanged.

**Verification song:** RVTR001341 — Dr. Hook, *When You're In Love With A Beautiful Woman*

---

## Thinking Model Change

| Before (3.31–3.32) | After (3.34) |
|---|---|
| Retrograph → Stories → Exhibits → Pages | Retrograph → **Interesting Discoveries** → **Experience Opportunities** → **Story Chapters** → Exhibits → Pages |

The Director no longer asks "What pages can I build?" It asks "What would surprise, educate, or delight someone about this song?"

---

## Pipeline Stages

**Orchestrator:** `lib/ops/studio/director/storytelling/run-pipeline.ts`

```
discoverInteresting()     → raw discoveries (probes)
rankDiscoveries()         → 6-dimension scores + composite rank
buildExperienceOpportunities() → discovery → story mapping
buildNarrativeChapters()  → editorial chapters from opportunities
discoverStories()         → stories gated by opportunities + discoveryIds
designExhibits()          → unchanged exhibit design
buildPagesFromExhibits()  → unchanged page building
buildStoryboard()         → ordered by min discovery rank
buildDiscoveryCoverage()  → discovery-first audit
buildOperatorSummary()    → creative brief (not stats-first)
```

**Story plan version:** `3` (`DirectorStoryPlan.version`)

---

## Phase 1 — Discovery Engine

**File:** `lib/ops/studio/director/storytelling/discover-interests.ts`

Deterministic **probe library** — each probe tests Retrograph facts, chart metadata, media, performances, and unknowns for a specific editorial angle. Probes return `eligible`, `factIds`, optional `mediaIds`, and `confidence`. No page thinking at this stage.

| Probe ID | Category | Trigger |
|---|---|---|
| `uk_number_one_surprise` | unexpected_chart_success | UK #1 fact + US peak fact |
| `bathroom_pitch` | rare_recording_story | bathroom / pitch keywords |
| `muscle_shoals_session` | famous_studio | Muscle Shoals in facts |
| `chart_longevity` | chart_journey | Hot 100 peak + weeks on chart |
| `belated_international_hit` | cultural_influence | Canada/Australia/international keywords |
| `seventh_album_turning_point` | career_turning_point | seventh album / Pleasure and Pain |
| `performance_footage` | rare_footage | performances + performance-linked media |
| `gold_certification` | awards | RIAA / certified gold |
| `songwriter_even_stevens` | famous_collaborator | Even Stevens in facts |
| `dual_album_pressing` | historical_coincidence | two different track line-ups |
| `missing_research_depth` | missing_research | retrograph unknowns (artist depth) |

Probes not eligible for a song are silently skipped — no empty discoveries.

---

## Phase 2 — Ranking Heuristics

**File:** `lib/ops/studio/director/storytelling/rank-discoveries.ts`

Each discovery receives six scores (0–100) plus a weighted **composite**:

| Dimension | Weight | Heuristic highlights |
|---|---|---|
| Audience interest | 22% | Base from confidence; +12 unexpected chart; +10 rare recording story |
| Historical significance | 18% | Multi-fact bonus; chart/album/gold title boost |
| Emotional impact | 18% | Bathroom/pitch/live/performance title boost |
| Visual potential | 15% | +28 when discovery has linked media |
| Research confidence | 12% | Direct from probe confidence |
| Uniqueness | 15% | Rare recording / historical coincidence bonus |

Discoveries sorted by composite descending; `rank` assigned 1…N.

---

## Phase 3 — Experience Opportunities

**File:** `lib/ops/studio/director/storytelling/build-opportunities.ts`

Each ranked discovery (except `missing_research`) maps to one or more **story IDs** via `DISCOVERY_TO_STORY`:

| Discovery | Stories |
|---|---|
| Bathroom Pitch | recording_story, introduction |
| UK #1 Surprise | chart_journey, cultural_impact |
| Muscle Shoals | recording_story |
| Chart longevity | chart_journey |
| Belated international | chart_journey, cultural_impact |
| Seventh album | album_story, artist_journey |
| Performance footage | performance_history |
| Gold certification | legacy |
| Songwriter Even Stevens | recording_story |

Structural stories (`hero`, `introduction`, `song_dna`) get fixed-priority opportunities without a discovery parent.

---

## Phase 4 — Story Construction

**File:** `lib/ops/studio/director/storytelling/discover-stories.ts`

Stories are **gated by opportunities**: if no discovery (or structural slot) drives a story, it is skipped with reason `"No interesting discovery drives this story"`.

Each built story carries `discoveryIds[]` tracing back to source discoveries.

**Narrative chapters** (editorial grouping, not page order):

| Chapter | Thesis | RVTR001341 stories |
|---|---|---|
| The Life of the Song | Written, recorded, released, climbed charts | hero, introduction, recording_story, album_story, chart_journey, artist_journey, legacy |
| Watching the Song | Performance footage + musical fingerprint | performance_history, song_dna |
| Crossing Borders | US hit → international success | cultural_impact, chart_journey |

**Storyboard ordering** (`build-storyboard.ts`): non-structural stories sorted by `minDiscoveryRankForStory()` so strongest discoveries surface early.

---

## Phase 5 — Discovery Coverage Audit

**File:** `lib/ops/studio/director/storytelling/discovery-coverage.ts`

Reports:

- discoveries found / used / ignored (+ reason)
- unused fact IDs, media IDs, relationship IDs

Goal: **maximum meaningful discovery coverage**, not maximum page count.

---

## Phase 6 — Director Summary (Creative Brief)

**File:** `lib/ops/studio/director/storytelling/build-operator-view.ts`

Replaces stats-first summary with an executive pitch:

> This song contains 9 major discoveries. The strongest are: • Bathroom Pitch • UK #1 Surprise • Live Performance Footage The experience focuses on how the song grew from a US hit into an international success.

Stats (story/exhibit/page counts) remain available but secondary in the workspace.

---

## Workspace UI

**File:** `components/ops/studio/director/workspace/DirectorWorkspaceView.tsx`

New sections (when `storyPlan.version >= 3`), near top:

1. **Director Summary** — creative brief lead
2. **Interesting Discoveries** — discovery board cards
3. **Discovery Ranking** — ranked list with six-dimension scores
4. **Experience Opportunities** — discovery → story links
5. **Story Construction** — narrative chapters
6. *(existing)* Audience Sequence, Story Chapters, Coverage, Preview Wall, Review Board
7. **Discovery Coverage** — used/ignored/unused facts

**CSS:** `app/ops/studio/director-workspace.css` — discovery board, rank list, narrative chapter styles.

---

## RVTR001341 Verification

Regenerated via:

```bash
NODE_OPTIONS='--require ./tools/finance/preload-server-only.cjs' \
  npx tsx tools/research/studio-verify-one-song.ts RVTR001341
```

### Discoveries (10 found, 9 used, 1 ignored)

| Rank | Discovery | Confidence | Status | Supporting facts |
|---|---|---|---|---|
| 1 | Bathroom Pitch | 96% | used | 7816c2eb… (bathroom pitch fact) |
| 2 | UK #1 Surprise | 98% | used | wiki excerpt + d1fbc407… (Hot 100 #6) |
| 3 | Live Performance Footage | 90% | used | 5 performance media assets |
| 4 | 25 Weeks on Hot 100 | 94% | used | chart facts |
| 5 | Muscle Shoals Session | 92% | used | b4bb9aa8… |
| 6 | Seventh Album Turning Point | 86% | used | 3 album/career facts |
| 7 | Songwriter Even Stevens | 88% | used | 2 facts |
| 8 | Belated International Hit | 88% | used | 5efbcbf0… |
| 9 | Gold Certification | 84% | used | RIAA excerpt |
| 10 | Unexplored Artist Depth | 55% | ignored | Research gap — recommend Collector follow-up |

**Not fired:** `dual_album_pressing` — no matching fact text in current Retrograph.

### Discovery → story traceability

| Story | discoveryIds |
|---|---|
| introduction | bathroom_pitch |
| recording_story | bathroom_pitch, muscle_shoals_session, songwriter_even_stevens |
| chart_journey | uk_number_one_surprise, chart_longevity, belated_international_hit |
| cultural_impact | uk_number_one_surprise, belated_international_hit |
| performance_history | performance_footage |
| album_story | seventh_album_turning_point |
| artist_journey | seventh_album_turning_point (built, 0 pages) |
| legacy | gold_certification |
| related_songs | skipped — no discovery |
| hero, song_dna | structural (no discovery parent) |

### Storyboard order (strongest discoveries early)

1. Hero (structural)
2. Introduction ← Bathroom Pitch (#1)
3. Recording Story ← Bathroom Pitch (#1)
4. Chart Journey ← UK #1 Surprise (#2)
5. Cultural Impact ← UK #1 (#2)
6. Performance History ← Live Footage (#3)
7. Album Story ← Seventh Album (#6)
8. Legacy ← Gold (#9)
9. Song DNA (structural)

### Director Summary (actual output)

```
This song contains 9 major discoveries. The strongest are: • Bathroom Pitch • UK #1 Surprise • Live Performance Footage The experience focuses on how the song grew from a US hit into an international success.
```

### Coverage gaps (remaining missed opportunities)

| Gap | Detail |
|---|---|
| 8 unused facts | Personnel/session detail, duplicate album excerpts, chart-adjacent trivia |
| Artist journey | Discovery linked but 0 pages built — seventh-album angle under-served on screen |
| Producer Ron Haffkine | Named in bathroom fact but no dedicated producer probe fired |
| Dual album pressing | Probe exists; fact not present in Retrograph |
| Legacy lasting_significance page | Built in plan but dropped from final storyboard (11 pages total) |

---

## Files Created

| File | Purpose |
|---|---|
| `lib/ops/studio/director/storytelling/discover-interests.ts` | Discovery Engine probes |
| `lib/ops/studio/director/storytelling/rank-discoveries.ts` | Six-dimension ranking |
| `lib/ops/studio/director/storytelling/build-opportunities.ts` | Opportunities + narrative chapters |
| `lib/ops/studio/director/storytelling/discovery-coverage.ts` | Discovery coverage audit |

## Files Modified

| File | Change |
|---|---|
| `lib/ops/studio/director/storytelling/types.ts` | v3 types: discoveries, opportunities, chapters, coverage |
| `lib/ops/studio/director/storytelling/run-pipeline.ts` | Discovery-first orchestration |
| `lib/ops/studio/director/storytelling/discover-stories.ts` | Opportunity-gated stories + discoveryIds |
| `lib/ops/studio/director/storytelling/build-storyboard.ts` | Rank-ordered storyboard |
| `lib/ops/studio/director/storytelling/build-operator-view.ts` | Creative brief summary |
| `lib/ops/studio/director/storytelling/pages-to-experience-plan.ts` | templateLibraryVersion `storytelling-3.34` |
| `components/ops/studio/director/workspace/DirectorWorkspaceView.tsx` | Discovery board UI sections |
| `app/ops/studio/director-workspace.css` | Discovery section styles |

---

## Verification Checklist

| Criterion | Result |
|---|---|
| Discoveries generated before stories | ✓ pipeline order in `run-pipeline.ts` |
| Every story traces to ≥1 discovery (except structural) | ✓ all built content stories have discoveryIds |
| Every discovery identifies supporting Retrograph facts | ✓ factIds populated (performance uses mediaIds) |
| Strongest discoveries early in storyboard | ✓ #1–#3 drive positions 2–6 |
| Director Summary reads like creative pitch | ✓ creativeBrief field |
| Typecheck | ✓ `npx tsc --noEmit` pass |

---

## Implementation Report

| Section | Content |
|---|---|
| Files Created | 4 discovery modules (see above) |
| Files Modified | 8 pipeline + UI files |
| Behavior Changes | Director reasoning is discovery-first; stories without discoveries skipped; summary is brief-style |
| Runtime Verification | RVTR001341 full pipeline regen — Director ✓ 40ms |
| Typecheck | Pass |
| Technical Debt Removed | Fact-first story enumeration replaced by opportunity gating |
| Ready for Next Phase | Yes |

**Execution State: COMPLETE**
