# Sprint 3.31 — Director Storytelling

**Objective:** Teach the Director to think like a documentary filmmaker / museum curator — stories first, pages last.

**Scope:** Director only. Collector, Editor, Retrograph, and Publisher modules unchanged.

**Verification song:** RVTR001341 — Dr. Hook, *When You're In Love With A Beautiful Woman*

---

## Architecture

```
Retrograph (read-only)
    ↓
Discover Stories        discover-stories.ts
    ↓
Build Story Clusters    build-clusters.ts
    ↓
Design Exhibits         design-exhibits.ts
    ↓
Build Pages             build-pages.ts
    ↓
Storyboard              build-storyboard.ts
    ↓
ExperiencePlan          pages-to-experience-plan.ts  →  Publisher (unchanged contract)
```

Orchestrator: `lib/ops/studio/director/storytelling/run-pipeline.ts`

Director integration: `run-director.ts` calls `runStorytellingPipeline()` when a Retrograph is present. Output attaches `storyPlan` to `DirectorPackage` and sets `templateLibraryVersion: "storytelling-3.31"`.

---

## Step 1 — Story Discovery Algorithm

**File:** `lib/ops/studio/director/storytelling/discover-stories.ts`

Eleven story templates are evaluated against the Retrograph:

| Story ID | Title | Gate |
|---|---|---|
| `hero` | Rise of the Song | Song identity exists |
| `introduction` | Story Introduction | Always eligible |
| `recording_story` | Recording Story | ≥1 recording/studio/songwriter fact |
| `album_story` | Album Story | Album entity or album facts |
| `chart_journey` | Chart Journey | Peak Hot 100 present |
| `artist_journey` | Artist Journey | Artist entity or career facts |
| `performance_history` | Performance History | Performances in Retrograph |
| `song_dna` | Song DNA | Song DNA package linked |
| `cultural_impact` | Cultural Impact | International/cultural facts |
| `legacy` | Legacy | Timeline or legacy facts |
| `related_songs` | Related Songs | Related-song relationships |

Each template carries a **whyCare** string. Templates that fail eligibility are marked `skipped` with a reason — the Director does not create stories just because facts exist.

---

## Step 2 — Story Clustering Strategy

**File:** `lib/ops/studio/director/storytelling/build-clusters.ts`

For each built story:

1. Seed cluster from discovery-phase `factIds`, `mediaIds`, `relationshipIds`.
2. Expand with category/keyword rules (`STORY_FACT_RULES`) — facts may belong to multiple stories.
3. Album story pulls recording notes from `retrograph.album.recordings`.
4. Performance history pulls facts mentioning performance titles.

Output: one `DirectorStoryCluster` per built story with a human-readable summary.

---

## Step 3 — Exhibit Generation

**File:** `lib/ops/studio/director/storytelling/design-exhibits.ts`

Each story maps to a fixed exhibit template library (`EXHIBITS_BY_STORY`). Examples:

- **Recording Story** → Recording Session, Studio, Songwriter, Producer
- **Chart Journey** → Peak Moment, Chart Longevity, International Charts
- **Performance History** → Official Video, Live Performances, TV Appearances

Each exhibit receives:

- `title`, `purpose`
- Filtered `factIds`, `mediaIds`, `relationshipIds` from its cluster
- `estimatedPages`
- `status: built | skipped` (skipped when zero supporting material)

---

## Step 4 — Page Generation

**File:** `lib/ops/studio/director/storytelling/build-pages.ts`

Pages are built **from exhibits**, never from isolated facts.

Special handlers:

- **Hero** → single identity page with cover art
- **Introduction** → cold-open page from Editor handoff hook
- **Chart peak** → dedicated chart template page
- **General exhibits** → one page per fact cluster (grouped by category), not one-fact-one-card

Every page carries `storyId`, `exhibitId`, `factIds`, `mediaIds`, and a scene `templateId`.

---

## Step 5 — Storyboard Generation

**File:** `lib/ops/studio/director/storytelling/build-storyboard.ts`

Fixed documentary order:

```
Hero → Introduction → Recording → Album → Chart → Artist → Performance → Song DNA → Cultural Impact → Legacy → Related Songs
```

Roles: `opening` | `act` | `visual_break` | `closing`

Only built stories with pages appear in the storyboard.

---

## Director Workspace

**Files:** `DirectorWorkspaceView.tsx`, `load-director-workspace.ts`, `director-workspace.css`

When `director.storyPlan` is present, the workspace leads with the Director's thought process:

1. Retrograph Summary
2. Stories
3. Story Clusters
4. Exhibits
5. Pages
6. Storyboard
7. Coverage Report

Legacy layout (Collector Inventory → Editor → Catalog → Blueprint) remains for packages without a story plan.

---

## RVTR001341 Verification

Pipeline run: `npm run research:studio:verify-one -- RVTR001341`  
Result: **published** · Director complete · `storytelling-3.31`

### Coverage Statistics

| Metric | Value |
|---|---|
| Stories discovered | 11 |
| Stories built | 10 |
| Stories skipped | 1 (`related_songs` — no related songs in Retrograph) |
| Exhibits built | 20 |
| Pages built | 30 |
| Experience scenes | 30 |
| Facts used | 11 / 17 |
| Facts unused | 6 |
| Media used | 5 / 6 |
| Relationships used | 17 / 17 |

### Built Stories

| Story | Exhibits | Pages |
|---|---|---|
| Rise of the Song | 1 | 1 |
| Story Introduction | 1 | 1 |
| Recording Story | 4 | 7 |
| Album Story | 2 | 6 |
| Chart Journey | 3 | 4 |
| Artist Journey | 2 | 4 |
| Performance History | 3 | 3 |
| Song DNA | 1 | 1 |
| Cultural Impact | 1 | 1 |
| Legacy | 2 | 2 |

### Storyboard (documentary order)

```
1. Rise of the Song          [opening]
2. Story Introduction        [opening]
3. Recording Story           [act] — 7 pages
4. Album Story               [act] — 6 pages
5. Chart Journey             [act] — 4 pages
6. Artist Journey            [act] — 4 pages
7. Performance History       [act] — 3 pages
8. Song DNA                  [visual_break]
9. Cultural Impact           [act]
10. Legacy                   [closing]
```

### Verification Checklist

| Criterion | Result |
|---|---|
| Stories discovered automatically | ✓ 11 templates evaluated, 10 built |
| Important facts in at least one story | Partial — 6 facts unused on pages (3 not assigned to any story cluster) |
| Every built story → exhibits | ✓ 20 exhibits across 10 stories |
| Every built exhibit → pages | ✓ 30 pages |
| Storyboard has beginning, middle, end | ✓ opening → acts → visual break → closing |
| No page without supporting story | ✓ all pages carry `storyId` + `exhibitId` |

**Before (Sprint 3.27–3.29):** ~22 fact-per-card scenes from dossier/retrograph plan.  
**After (Sprint 3.31):** 10 narrative stories → 20 exhibits → 30 story-driven pages.

---

## Remaining Gaps

1. **6 unused facts** — mostly album excerpts and secondary chart notes not matched by cluster keyword rules. Need broader album-story and chart-story matching or Editor promotion of pending facts.
2. **1 unused media asset** — not assigned to any exhibit page.
3. **Related Songs story** — skipped; Retrograph has no related-song relationships for this track.
4. **3 pending facts** — awaiting Editor promotion before they enter usable fact pool.
5. **Artist relationship depth** — flagged in Retrograph `unknowns`; no dedicated relationship exhibit yet.
6. **Publisher path** — `load-public-experience.ts` routes via Retrograph presence; storytelling plan version relies on saved `retrograph.json` (built during Editor refresh). No Publisher code changes required.

---

## Files Created

| File | Purpose |
|---|---|
| `lib/ops/studio/director/storytelling/types.ts` | Story plan types |
| `lib/ops/studio/director/storytelling/discover-stories.ts` | Step 1 |
| `lib/ops/studio/director/storytelling/build-clusters.ts` | Step 2 |
| `lib/ops/studio/director/storytelling/design-exhibits.ts` | Step 3 |
| `lib/ops/studio/director/storytelling/build-pages.ts` | Step 4 |
| `lib/ops/studio/director/storytelling/build-storyboard.ts` | Step 5 |
| `lib/ops/studio/director/storytelling/coverage-report.ts` | Coverage |
| `lib/ops/studio/director/storytelling/pages-to-experience-plan.ts` | Publisher bridge |
| `lib/ops/studio/director/storytelling/run-pipeline.ts` | Orchestrator |
| `reports/sprint-3.31-director-storytelling.md` | This report |

## Files Modified

| File | Change |
|---|---|
| `lib/ops/studio/director/run-director.ts` | Storytelling pipeline when Retrograph present |
| `lib/ops/studio/director/types.ts` | Optional `storyPlan` on package |
| `lib/ops/studio/director/experience-plan.ts` | Delegates to storytelling pipeline |
| `lib/ops/studio/director/retrograph-experience-plan.ts` | Deprecated shim |
| `lib/ops/studio/director/workspace/types.ts` | `storyPlan` on snapshot |
| `lib/ops/studio/director/workspace/load-director-workspace.ts` | Expose story plan |
| `components/ops/studio/director/workspace/DirectorWorkspaceView.tsx` | Stories-first layout |
| `app/ops/studio/director-workspace.css` | Storytelling section styles |

---

## Execution State

**COMPLETE**

| Section | Result |
|---|---|
| Typecheck | Pass (`npx tsc --noEmit`) |
| Runtime verification | RVTR001341 — 10 stories, 30 pages, published |
| Behavior changes | Director plans story-first; Publisher contract unchanged |
| Ready for review | Yes |
