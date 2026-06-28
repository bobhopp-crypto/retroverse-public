# Sprint 3.19 — Department Responsibility Realignment

**Date:** 2026-06-27  
**Objective:** Redefine department responsibilities without rebuilding the pipeline. Start live-testing package generation for 1980s, 1990s, and 2000s eras.

---

## Summary

Department missions, boundaries, operator guides, and prompt language now reflect Sprint 3.19 responsibilities. The existing Collector → Editor → Director → Publisher pipeline is unchanged and operational.

**Batch generation started:** `npm run research:studio:year-batch -- --limit-per-era 20`

Era mapping for live testing:
| Anchor | Decade |
|--------|--------|
| 1980 | 1980–1989 |
| 1990 | 1990–1999 |
| 2005 | 2000–2009 |

VDJ video library era counts (2026-06-27): **1681 / 1311 / 1401** candidates per era.

---

## Updated Definitions (reflected in Studio)

| Location | What changed |
|----------|--------------|
| `lib/studio/department.ts` | Missions + `DEPARTMENT_BOUNDARIES` |
| `lib/studio/contract.ts` | `STUDIO_DEPARTMENT_CONTRACTS` missions |
| `docs/studio/STUDIO_BRAIN.md` | Department table |
| `lib/ops/studio/operator-guide/page-guides.ts` | Page guides, department context, tour copy |
| `lib/ops/studio/living/personalities.ts` | Mission Control department atmosphere strings |
| `lib/ops/studio/editor/editorial-brain-instructions.ts` | Editor role prompt → data prep |
| `lib/ops/studio/director/run-director.ts` | Module header comment |

### Target responsibilities (now documented)

| Department | Owns | Must never |
|------------|------|------------|
| **Collector** | All useful source material — metadata, charts, artwork, credits, media, VDJ, references | Design pages, dedupe, decide patron presentation |
| **Editor** | Dedupe, normalize, merge facts, flag conflicts → clean dataset | Create experiences, choose layouts, gather external research |
| **Director** | Experience design — Story, Timeline, DNA, Artist, Label, Chart, ordering | Gather raw metadata, publish, re-edit source data |
| **Publisher** | Build assets, publish pages, indexes, search export | Redesign content, re-edit data, reorganize experiences |

---

## Batch Generation

**Tool:** `tools/research/studio-year-batch.ts`  
**Script:** `npm run research:studio:year-batch`

Options:
- `--eras 1980,1990,2005` — era anchors (default: all three)
- `--limit-per-era N` — max songs per era per run (default: 15)
- `--refresh-collector` — re-run Collector even when package exists
- `--no-resume` — ignore prior progress file

Outputs:
- `reports/studio/YEAR_BATCH_REPORT.md`
- `reports/studio/year-batch-progress.json`
- `reports/studio/year-batch-run.log` (when tee'd)

**Smoke test (2026-06-27):** Fixed selection to use pipeline-eligible songs (4341 pending across eras). Test run: 9 songs (3 per era) processing successfully.

**Full batch command for overnight:**

```bash
RETROVERSE_OPS=1 npm run research:studio:year-batch -- --limit-per-era 20
```

Monitor: `tail -f reports/studio/year-batch-run.log`

---

## Responsibilities Still in the Wrong Department

These remain in code **after** Sprint 3.19 copy/prompt updates. Address after live testing — do not block tomorrow night.

### Editor still does Director-level work

| Current behavior | File(s) | Should move to |
|------------------|---------|----------------|
| Story rewrite / “strongest narrative” AI prompts | `lib/ops/studio/editor/rewrite.ts` | Director (experience narrative) |
| Narrative blueprint + planned cards | `lib/ops/studio/editor/narrative-blueprint.ts` | Director |
| Editorial brain / cover story framing | `lib/ops/studio/editor/editorial-brain.ts` | Director |
| Distill fact ranking + story angle selection | `lib/ops/studio/editor/distill.ts` | Split: Editor dedupes; Director selects angles |
| Performance workspace / image board curation | `lib/ops/studio/editor/types.ts`, UI | Director |

**Risk:** Editor prompts now say “data prep only” but runtime still generates narrative structure. Pipeline remains functional; semantic split is incomplete.

### Collector still does light curation

| Current behavior | File(s) | Notes |
|------------------|---------|-------|
| Fact approval / auto-promotion before Editor | `lib/ops/studio/collector/run-collector.ts`, `package-finalize.ts` | Borderline — acceptable as “verify sources” until Editor dedupe is stronger |
| Story seed generation | `collector/package-finalize.ts` | Belongs to Director long-term |

### Director still does Publisher-adjacent QC

| Current behavior | File(s) | Notes |
|------------------|---------|-------|
| Patron value / confidence scoring | `lib/ops/studio/director/review.ts` | OK for blueprint QA; Publisher should own publish gate |
| Coaching rules from Publisher feedback | `lib/ops/studio/director/coaching/` | Cross-department — acceptable for now |

### Publisher still evaluates / scores content

| Current behavior | File(s) | Should become |
|------------------|---------|---------------|
| Quality evaluation + coaching issues | `lib/ops/studio/publisher/evaluate.ts` | Publish-readiness checks only (asset exists, blueprint complete) |
| Editorial approve/return decisions | `publisher/store.ts`, decision API | Binary publish / hold — not content redesign |
| Auto-publish policy | `lib/ops/studio/publisher/publish-policy.ts` | Keep — this is publish execution |

### Publisher does not yet build live pages

| Gap | Notes |
|-----|-------|
| No search index export | Publisher marks approved in store; patron `/experience/[rvtr]` depends on existing renderer |
| No static page generation step | Render spec → museum experience is Director output consumed at read time |

---

## Pipeline Status

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| Year batch smoke test | Pass (2 published) |
| Existing `research:studio:production` | Unchanged |
| Mission Control / status APIs | Unchanged |

---

## Recommended Post–Live-Test Actions

1. **Split Editor distill** — deterministic dedupe/normalize pass only; move angle/card selection to Director.
2. **Move rewrite + narrative-blueprint** to Director run after handoff.
3. **Publisher evaluate** — reduce to structural publish checks (render spec present, required pages defined).
4. **Wire Publisher export** — explicit index/search update step when marking published.

---

## Execution State

**COMPLETE** — Department definitions updated, pipeline operational, year batch started, misalignment report delivered.
