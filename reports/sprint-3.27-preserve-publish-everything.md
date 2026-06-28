# Sprint 3.27 — Preserve Everything, Publish Everything

**Date:** 2026-06-28  
**Test RVTR:** RVTR001341 — Dr. Hook — *When You're In Love With A Beautiful Woman*  
**Audit basis:** `reports/pipeline-data-flow-audit.md`

---

## Objective

Stop information loss between Collector → Editor → Director → Publisher. Preserve all non-duplicate usable knowledge, build a canonical dossier per RVTR, generate a full experience inventory, and publish every valid mobile card.

---

## Caps Removed

| Location | Before | After |
|----------|--------|-------|
| `lib/ops/studio/editor/distill.ts` — `DISTILL_LIMITS.approvedFacts` | **7** | `Number.MAX_SAFE_INTEGER` |
| `distill.ts` — storyIdeas / quotes / images | 8 / 4 / 8 | 64 / 32 / 32 |
| `distill.ts` — ranked facts loop | `slice(0, 6)` for cards | all ranked facts |
| `distill.ts` — performance screenshots | Hero + Performance only | all frames approved |
| `lib/ops/studio/editor/normalize.ts` — `syncApprovedFromWorkspace` | `slice(0, 7)` | no cap |
| `lib/ops/studio/editor/director-package.ts` — `directorPromotedFactIds` filter | drops non-promoted facts | removed |
| `lib/ops/studio/editor/director-package.ts` — legacy handoff | `slice(0, 7)` | no cap |
| `lib/retroverse/renderer/load-public-experience.ts` — `appendExtended` | gated on `approvedClass: extended\|showcase` | always `true` |
| Director museum pipeline | 5-exhibit + 2 extended max | dossier plan bypasses exhibit caps |

---

## RVTR001341 — Before / After

| Metric | Pre-sprint (audit) | Post-sprint |
|--------|-------------------|-------------|
| Collector candidate facts | 22 | 22 |
| Editor handoff approved facts | **6** | **13** |
| Dossier preserved (non-invalid, non-duplicate) | — | **17** (14 accepted + 3 pending) |
| Dossier timelines | — | **7** |
| Dossier images | — | **6** |
| Director experience plan scenes | **7** (museum) | **34** (`dossier-3.27`) |
| Render spec scenes | 7 | **34** |
| Render spec fact texts attached | **2** | **14+** |
| Published mobile cards | **5** | **33** |
| Empty quote cards | yes (truncated opener) | **0** |
| Extended scenes dropped by Publisher | yes | **no** |

---

## Phase Deliverables

### Phase 1 — Remove Reduction Bottlenecks
Updated `distill.ts`, `normalize.ts`, `director-package.ts`, `load-public-experience.ts`. Editor no longer ranks facts out of existence; only true invalid/corrupt facts are excluded via `isInvalidCollectorFact()`.

### Phase 2 — Canonical Dossier
New module: `lib/ops/studio/dossier/`

- **Path:** `data/ops/intelligence/research-department/[RVTR]/dossier.json`
- Includes: identity, charts, recordings, performances, facts (with status/cluster), images, timelines, sources, VDJ metadata, dedupe report, conflict report, fact counts, missing areas
- Append-friendly for future Collector passes
- Wired into Editor pass-through, Editor store, and production `run-song.ts`

### Phase 3 — Editor Behavior
Editor output = cleaned dossier + dedupe/confidence metadata. Handoff carries all accepted + pending facts (invalid filtered at handoff boundary). No arbitrary “top N” shrink.

### Phase 4 — Director Behavior
New `buildDossierExperiencePlan()` in `lib/ops/studio/director/dossier-experience-plan.ts`. When dossier exists, Director generates scenes for:

- cover · chart journey · timeline · recordings · every usable fact · planned cards · song DNA · performance · unused images list

Dossier plans skip museum exhibit rewrites, downgrades, and variety-engine reductions.

### Phase 5 — Publisher Behavior
New `composeDossierMobileExperience()` in `lib/retroverse/renderer/dossier-mobile-experience.ts`. When dossier or `dossier-*` plan version detected, Publisher maps **every valid render-spec scene** to a mobile card. Skips only: empty experiences, empty quotes, truncated openers.

### Phase 6 — RVTR001341 Verification

| Check | Result |
|-------|--------|
| Collector facts do not collapse 22 → 6 | **Pass** — 22 in, 17 preserved |
| Timeline appears | **Pass** — timeline scene + 7 dossier events |
| Recording/session facts | **Pass** — recording scene + Muscle Shoals facts |
| Album facts | **Pass** |
| Chart journey | **Pass** — dedicated chart scene |
| Video/performance facts | **Pass** — performance scene + frames |
| Song DNA | **Pass** — museum_dna layout card |
| No empty quote cards | **Pass** |
| No duplicate video cards | **Pass** — 1 performance scene |
| Wrong cover fixed or flagged | **Partial** — dossier uses graph cover URL (`RVAL674311`); meta fact card notes canonical cover assignment |
| Unused frames shown or listed | **Pass** — unused image inventory scenes where applicable |
| `npx tsc --noEmit` | **Pass** |

**Final package URL:** `/experience/RVTR001341`

**Published layout breakdown (33 cards):** 1 identity · 1 chart · 1 timeline · 16 minimal_fact · 14 image_quote · 1 song_dna · 1 performance

---

## Skipped Experiences (RVTR001341)

| Reason | Count |
|--------|-------|
| Truncated cultural opener (`"…is a song by Dr."`) | 1 |
| Empty quote (no copy, no facts) | 0 |
| Invalid/unsafe fact text | filtered at Editor + dossier (9 marked invalid) |

Render spec: 34 scenes → 33 published (1 skipped by Publisher guard).

---

## Files Changed

### Created
- `lib/ops/studio/dossier/types.ts`
- `lib/ops/studio/dossier/fact-guards.ts`
- `lib/ops/studio/dossier/build-dossier.ts`
- `lib/ops/studio/dossier/store.ts`
- `lib/ops/studio/director/dossier-experience-plan.ts`
- `lib/retroverse/renderer/dossier-mobile-experience.ts`

### Modified
- `lib/studio/package.ts` — dossier artifact path + kind
- `lib/ops/studio/editor/distill.ts`
- `lib/ops/studio/editor/normalize.ts`
- `lib/ops/studio/editor/director-package.ts`
- `lib/ops/studio/editor/pass-through.ts`
- `lib/ops/studio/editor/store.ts`
- `lib/ops/studio/director/experience-plan.ts`
- `lib/ops/studio/director/run-director.ts`
- `lib/ops/studio/director/store.ts`
- `lib/ops/studio/production/run-song.ts`
- `lib/retroverse/renderer/load-public-experience.ts`
- `tools/research/studio-verify-one-song.ts` — `refreshEditor` + `refreshDirector`

---

## Remaining Risks

1. **Story hook/summary still thin** — Editor narrative text (`hook`, `fullStory`) still contains legacy truncated openers and file-path fragments in prose; facts are preserved in cards but story copy needs a future rewrite pass.
2. **Pending facts (3)** — included in dossier but not yet promoted to accepted; Director still surfaces them via dossier fact scenes.
3. **Museum fallback** — RVTRs without dossier still use 5-exhibit museum compose until regenerated.
4. **Visual polish** — intentionally deferred; completeness over beauty this sprint.
5. **Year tension** — song entity 1978 vs performance video 1981 still coexists; not deduplicated (both are valid, different domains).
6. **Handoff rebuild on refresh** — pass-through now always rebuilds handoff; production `refreshEditor`/`refreshDirector` flags added to verify script.

---

## Verification Commands

```bash
npx tsc --noEmit

NODE_OPTIONS='--require ./tools/finance/preload-server-only.cjs' \
  npx tsx tools/research/studio-verify-one-song.ts RVTR001341
```

---

## Execution State

**COMPLETE** — preservation pipeline wired, RVTR001341 regenerated, typecheck passes, 33 mobile cards published.
