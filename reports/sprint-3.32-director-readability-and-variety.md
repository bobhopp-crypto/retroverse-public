# Sprint 3.32 — Director Readability and Variety

**Objective:** Make the Director Workspace operator-readable and enforce page sequencing variety.

**Scope:** Director storytelling pipeline + workspace UI only. Collector, Editor, Retrograph, and Publisher unchanged.

**Verification song:** RVTR001341 — Dr. Hook, *When You're In Love With A Beautiful Woman*

---

## Layout Changes

### Director Workspace (`/ops/studio/director/workspace/[rvtr]`)

New storytelling layout (when `storyPlan.version >= 2`):

1. **Director Summary** — plain-language narrative, strengths, weaknesses, publish readiness
2. **Audience Sequence** — numbered list of what the public will see (primary section)
3. **Story Chapters** — vertical chapter cards (no horizontal scroll)
4. **Coverage** — compact facts/media stats
5. **Preview Wall** — grouped by chapter in a responsive grid
6. **Review Board** — actionable warnings with fix hints

Removed from primary view: horizontal story card grid, separate cluster/exhibit/page dumps, endless horizontal preview strip.

### New workspace data

- `previewChapters` — preview cards grouped by story chapter
- `storyPlan.summary` — operator summary
- `storyPlan.audienceSequence` — public beat order
- `storyPlan.chapters` — vertical chapter metadata + warnings
- `storyPlan.sequenceViolations` — rule engine output

---

## Sequencing Rules

**File:** `lib/ops/studio/director/storytelling/enforce-sequence-variety.ts`

| Rule | Enforcement |
|---|---|
| Max 2 same page style in a row | Switches 3rd consecutive text page to gallery or quote |
| Max 2 same fact cluster in a row | Flags when 3 pages share same exhibit |
| No repeat fact text within 5 pages | Drops duplicate fact pages |
| No repeat media within 3 pages | Clears reused image unless no alternative |
| No duplicate titles | Renames or dedupes headlines |
| No empty cards | Removes pages with no copy and no media |
| No DJ metadata | Strips/removes VirtualDJ play counts, file paths |
| Chart Journey required | Flags if chart data exists but no chart page |
| Song DNA required | Flags if `song-dna.json` exists but no DNA page |
| No generic Cultural Impact × N | Flags repeated generic headlines |

Violations surface in Review Board as: `[rule] message — Fix: hint`

### Page building changes

**File:** `lib/ops/studio/director/storytelling/build-pages.ts`

- **One page per exhibit** (not one page per fact)
- **Global fact deduplication** — each fact used once across the package
- **Public copy sanitization** — strips DJ metadata, track-listing fragments, truncated excerpts
- **Exhibit-specific headlines** — "The bathroom pitch", "Muscle Shoals", "Official music video"
- **Template diversity** — quote/gallery/chart/timeline/performance assigned by exhibit type

---

## Before / After — RVTR001341

| Metric | Before (3.31) | After (3.32) |
|---|---|---|
| Total pages | 30 | 11 |
| Story template pages | 23 | 2 |
| Max consecutive same template | 14 (Story) | 2 |
| Review warnings | 2 generic | 1–2 actionable |
| DJ metadata in scenes | present | 0 |
| Duplicate bathroom-pitch pages | many | 1 |
| Chart Journey | yes | yes |
| Song DNA | yes | yes |

### Before warnings

```
14 consecutive "Story" scenes (scenes 2–15) — recommend variation
7 consecutive "Story" scenes (scenes 17–23) — recommend variation
```

### After warnings

```
[no_repeat_fact_within_5] Dropped repeat fact near scene "certified Gold by the RIAA"
  — Fix: Merge duplicate facts into one exhibit page
```

---

## Final Audience Sequence (RVTR001341)

1. Hero
2. Why this song matters
3. The bathroom pitch
4. Album context
5. Chart climb
6. UK breakthrough
7. Official music video
8. Live on stage
9. Song DNA
10. Top 10 hits / international footprint
11. Legacy timeline

---

## Director Summary (example output)

> Retroverse found 10 stories in this Retrograph. The strongest material is the chart journey (Hot 100 #6), Muscle Shoals recording story, 1981 performance footage. Sequencing passes editorial variety checks. 11 pages · 20 exhibits · Ready to publish.

---

## Remaining Repetition Risks

1. **Legacy / cultural facts** — some facts still compete for the same exhibit slots; dropped at sequence time rather than merged upstream
2. **Performance gallery vs video** — two performance pages back-to-back when multiple video exhibits have media but no unique facts
3. **11 unused facts** — dedup + one-page-per-exhibit leaves research material on the table (coverage vs variety tradeoff)
4. **Old packages** — workspace shows regenerate prompt if `storyPlan.version < 2`

---

## Files Created

| File | Purpose |
|---|---|
| `lib/ops/studio/director/storytelling/sanitize-public-copy.ts` | Public copy + headline helpers |
| `lib/ops/studio/director/storytelling/enforce-sequence-variety.ts` | Sequencing rule engine |
| `lib/ops/studio/director/storytelling/build-operator-view.ts` | Summary, chapters, audience sequence |
| `reports/sprint-3.32-director-readability-and-variety.md` | This report |

## Files Modified

| File | Change |
|---|---|
| `lib/ops/studio/director/storytelling/build-pages.ts` | One page per exhibit, dedup, sanitize |
| `lib/ops/studio/director/storytelling/types.ts` | v2 plan fields |
| `lib/ops/studio/director/storytelling/run-pipeline.ts` | Variety + operator view |
| `lib/ops/studio/director/storytelling/pages-to-experience-plan.ts` | Quote template, v3.32 |
| `lib/ops/studio/director/run-director.ts` | Actionable review warnings |
| `lib/ops/studio/director/store.ts` | Pass `hasSongDna` |
| `components/ops/studio/director/workspace/DirectorWorkspaceView.tsx` | New layout |
| `lib/ops/studio/director/workspace/load-director-workspace.ts` | Preview chapters |
| `lib/ops/studio/director/workspace/types.ts` | PreviewChapter type |
| `app/ops/studio/director-workspace.css` | Summary, sequence, chapter styles |

---

## Execution State

**COMPLETE**

| Section | Result |
|---|---|
| Typecheck | Pass |
| Runtime verification | RVTR001341 — 11 pages, max 2 consecutive template, Chart + DNA present |
| Behavior changes | Director dedupes pages and enforces variety; workspace operator-readable |
| Ready for review | Yes |
