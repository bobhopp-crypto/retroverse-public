# Sprint 3.33 — Creative Review Department

**Objective:** Add a read-only Creative Review department between Director and Publisher that critiques experiences the way a magazine editor, museum curator, or documentary producer would.

**Scope:** New `lib/ops/studio/creative-review/` module + `/ops/studio/creative-review/[rvtr]` UI. Collector, Editor, Retrograph, Director, and Publisher unchanged.

**Verification song:** RVTR001341

---

## Pipeline Position

```
Collector → Editor → Retrograph → Director → Creative Review → Publisher
```

Creative Review:
- Never creates facts, stories, or pages
- Never mutates upstream artifacts
- Reads `director.json` (+ optional `retrograph.json`, `song-dna.json` read-only)
- Writes only `creative-review.json` (its own artifact)

---

## Review Architecture

```
DirectorPackage (read-only)
    ↓
collectBeats()          ← audienceSequence + pages, or experiencePlan fallback
    ↓
buildStoryFlow()        ← per-beat scores
buildPacing()           ← text/media/story runs
buildVariety()          ← template + slot diversity
buildRepetition()       ← facts, wording, media, titles
buildNarrative()        ← opening → ending arc
buildAudience()         ← 5 persona scorecards
buildMissingOpportunities() ← Retrograph-aware recommendations
buildDirectorFeedback() ← beat-specific editorial notes
buildExecutiveSummary() + buildPublishGate()
    ↓
CreativeReviewPackage → creative-review.json
```

**Orchestrator:** `lib/ops/studio/creative-review/build-review.ts`  
**Persistence:** `lib/ops/studio/creative-review/store.ts`  
**UI:** `components/ops/studio/creative-review/CreativeReviewView.tsx`

---

## Scoring Model

### Overall score (0–100)

Weighted blend:

| Dimension | Weight |
|---|---|
| Story flow (interest + visual + transition) | 28% |
| Pacing | 18% |
| Variety diversity | 18% |
| Repetition (inverse) | 18% |
| Narrative arc | 10% |
| Audience engagement | 8% |

### Per-beat scores

Each audience beat receives:

- **Interest** — headline hooks, chart/performance beats, recording material
- **Visual** — media presence, gallery/performance templates
- **Information density** — optimal copy length band (40–180 chars)
- **Audience attention** — density + template boost
- **Transition quality** — penalty for consecutive same template/story; bonus for alternation

### Publish gate

| Score / condition | Gate |
|---|---|
| Blockers present | `blocked` |
| ≥ 85%, no blockers | `ready` |
| 72–84% | `ready_with_changes` |
| 55–71% | `needs_revision` |
| < 55% | `blocked` |

Blockers: empty sequence, < 3 beats, DJ metadata in public copy.

---

## Editorial Heuristics

### Pacing

- Flags 4+ consecutive text-heavy beats
- Flags 4+ beats without media
- Flags long story-only stretches
- Flags missing chart/timeline in long experiences

### Variety

Tracks presence of: charts, timelines, Song DNA, album, performance, quotes, story cards, hero.  
Penalizes reused images.

### Repetition

Detects duplicate copy, titles, media IDs, shared facts across beats, repeated bathroom-pitch material, redundant performance exhibits.

### Narrative arc

Checks six phases: opening, discovery, momentum, surprise, payoff, ending — each with strength score and recommendation if weak/missing.

### Audience personas

Rates five personas (Music fan, Casual listener, DJ, Museum visitor, Retroverse collector) on:

Interesting · Educational · Emotional · Entertaining · Replay value

### Missing opportunities (recommendations only)

Examples: related songs, artist timeline, chart animation, video comparison, personnel page — inferred from Retrograph vs final audience sequence.

### Director feedback

Every note references specific beats. No vague advice.

---

## UI Sections (10)

Route: `/ops/studio/creative-review/RVTR001341`

1. Executive Summary  
2. Story Flow Review  
3. Pacing Review  
4. Variety Review  
5. Repetition Review  
6. Narrative Review  
7. Audience Review  
8. Missing Opportunities  
9. Publish Gate  
10. Director Feedback  

Department nav added to Studio shell: **Creative Review** → `/ops/studio/creative-review`

---

## Sample Review — RVTR001341

### Executive Summary

| Field | Value |
|---|---|
| Overall score | **83%** |
| Publish gate | **Ready after minor revisions** |
| Beats analyzed | 11 |

**Strengths:** Excellent recording story · Excellent chart section · Strong performance section

### Story flow (audience sequence)

1. Hero  
2. Why this song matters  
3. The bathroom pitch  
4. Album context  
5. Chart climb  
6. UK breakthrough  
7. Official music video  
8. Live on stage  
9. Song DNA  
10. International footprint  
11. Legacy timeline  

### Scores

| Section | Score |
|---|---|
| Variety diversity | 80% |
| Repetition issues | 0 |
| Audience personas | 5 rated |
| Director feedback notes | 3 |

### Publish recommendation

**READY WITH CHANGES** — strong documentary arc with recording + chart highlights; minor pacing/transition notes for Director to optionally apply before Publisher.

---

## Verification Checklist

| Criterion | Result |
|---|---|
| Story flow analyzed | ✓ 11 beats scored |
| Variety measured | ✓ diversity 80% |
| Repetition detected | ✓ engine active (0 issues on current plan) |
| Narrative evaluated | ✓ 6-phase arc |
| Audience score generated | ✓ 5 personas |
| Publish gate assigned | ✓ `ready_with_changes` |
| Director feedback produced | ✓ 3 beat-specific notes |

---

## Files Created

| File | Purpose |
|---|---|
| `lib/ops/studio/creative-review/types.ts` | Review package types |
| `lib/ops/studio/creative-review/paths.ts` | Output path + route helper |
| `lib/ops/studio/creative-review/scoring.ts` | Score + gate helpers |
| `lib/ops/studio/creative-review/build-review.ts` | Review engine |
| `lib/ops/studio/creative-review/store.ts` | Load/save/run |
| `components/ops/studio/creative-review/CreativeReviewView.tsx` | UI |
| `app/ops/studio/creative-review/[rvtr]/page.tsx` | Route |
| `app/ops/studio/creative-review/page.tsx` | Department index |
| `app/ops/studio/creative-review.css` | Styles |
| `reports/sprint-3.33-creative-review-department.md` | This report |

## Files Modified

| File | Change |
|---|---|
| `components/ops/studio/StudioShell.tsx` | Creative Review nav link |

---

## Execution State

**COMPLETE**

| Section | Result |
|---|---|
| Typecheck | Pass |
| Runtime verification | RVTR001341 — 83% overall, 11 beats, gate assigned |
| Upstream departments | Unchanged |
| Ready for review | Yes |
