# Browser Plus 3.2 — Readiness Dashboard

**Date:** 2026-06-24  
**Scope:** Audit + implementation plan only — **no code changes**  
**Dataset:** Live loader snapshot (8,878 active VIDEO rows)

---

## Executive Summary

Browser Plus 3.1 answers **library statistics** (how many videos, how many missing package files). It does **not** answer patron-impact questions (Sunday ready? Top 100 ready? what should Ollama run next?).

**Validated finding:** Readiness is much better than the dashboard suggests once cover logic matches reality.

| Panel | Current dashboard | Patron readiness (audited) |
|---|---|---|
| Sunday Nights | 76 / 120 in library (strict) | **118 / 138** snapshot RVTRs · **116 / 120** in library |
| Top 100 | 48 / 100 | **55 / 100** |
| Top 500 | 178 / 500 | **208 / 500** |
| Top 1000 (queue) | 230 / 1,000 | **287 / 1,000** |
| No usable cover | 7,705 flagged | **17** truly missing |
| Ollama eligible | 7,212 (all missing package) | **302** in Top 500 cohort · **1** Sunday |

**Recommendation:** Ship 3.2 as a **readiness-first layout** with **audited cohort metrics on top**, operational queues below, and **tiered research priority** replacing the library-wide Ollama banner.

---

## Part A — Audit

### A1. Current dashboard (what it answers today)

Source: `components/ops/browser-plus-2/BrowserPlus2Client.tsx` + `lib/ops/browser-plus-2/work-queues.ts`

| Metric | Rule | Count | Answers |
|---|---|---|---|
| Videos | Active `/VIDEO/` rows | 8,878 | How big is the library? |
| Needs Identity | No RVTR | 402 | Matcher backlog |
| Needs Research | RVTR + no package JSON | 7,212 | Missing **file**, not missing knowledge |
| Needs Review | Package `status === review` | 936 | Human approval queue |
| Needs Cover | No package `metadata.coverUrl` | 7,705 | Missing **package field**, not missing artwork |
| Experience Ready | Package + package cover + story + review/published | 611 | Strict finished inventory |

**Gap:** Top row is dominated by implementation artifacts (7,212 / 7,705). A new operator cannot tell if Sunday or Top 100 is ready in under 10 seconds.

See also: [`NEEDS-RESEARCH-AUDIT.md`](NEEDS-RESEARCH-AUDIT.md), [`NEEDS-COVER-AUDIT.md`](NEEDS-COVER-AUDIT.md).

---

### A2. Readiness definitions (proposed for 3.2)

Two readiness modes audited:

#### Patron Readiness (recommended for Sunday / Top N panels)

All must be true:

1. RVTR assigned  
2. Research package JSON exists  
3. **Any usable cover** — package URL OR canonical Cover Library OR VDJ embedded OR sidecar thumbnail  
4. Story count > 0  
5. Renderable status — package `review` or `published` (`isSongExperienceRenderable`)

#### Strict Readiness (current Experience Ready)

Same as patron readiness but step 3 is **package `metadata.coverUrl` only**.

| Scope | Strict (current) | Patron (proposed) | Delta |
|---|---|---|---|
| Global (RVTR rows) | 611 | **1,008** | +397 |
| Sunday — in library (120) | 76 | **116** | +40 |
| Sunday — snapshot RVTRs (138) | — | **118** | — |
| Top 100 | 48 | **55** | +7 |
| Top 500 | 178 | **208** | +30 |
| Top 1000 | 230 | **287** | +57 |

**User example “132 / 145”:** Not exact match to current data. Closest audited figures:

- **118 / 138** snapshot RVTRs patron-ready  
- **116 / 120** in-library Sunday rows patron-ready  
- **154** snapshot song rows (includes duplicate paths / non-video entries)  
- **18** snapshot RVTRs not in active VIDEO library  

Use **138 snapshot RVTRs** as the Sunday denominator (canonical event pool), not 8,878 library size.

---

### A3. Cohort data sources

| Cohort | Source | Loader / file |
|---|---|---|
| **Sunday Nights** | Year pools 1967 / 1978 / 1992 | `data/sunday-nights/snapshots/{year}.json` via `loadSundayEventSongsFromSnapshots()` |
| **Top 100** | Play count rank on identifiable active VIDEO + RVTR | VDJ `database.xml` → BP2 rows, sort `playCount DESC`, slice 100 |
| **Top 500 Played** | Same, slice 500 | Same |
| **Current Queue Readiness** | Top 1,000 most-played active VIDEO + RVTR | Same, slice 1000 |
| **Live Aid** | ❌ Not implemented | Stub only: `lib/ops/media-collections/seed.ts` (`planned`) |
| **Woodstock** | ❌ Not implemented | Same stub pattern |

Sunday per-year (in-library rows):

| Year | Snapshot songs | RVTRs | In library | Patron ready | Strict ready |
|---|---|---|---|---|---|
| 1967 | 56 | 40 | 38 | 36 | 24 |
| 1978 | 49 | 49 | 39 | 37 | 24 |
| 1992 | 49 | 49 | 43 | 43 | 28 |

**Sunday blocking breakdown (120 in-library rows, patron mode):**

| Blocker | Count |
|---|---|
| Ready | 116 |
| No package | 1 |
| No cover | 1 |
| No story | 1 |
| Not renderable | 1 |

**Top 100 blocking (patron mode):**

| Blocker | Count | Next action |
|---|---|---|
| Ready | 55 | — |
| No package | 29 | Build Research |
| Not renderable | 16 | Fix Renderability |

**Top 500 blocking:** 208 ready · 263 no package · 19 not renderable · 10 no story  
**Top 1000 blocking:** 287 ready · 675 no package · 21 not renderable · 17 no story

---

### A4. No Usable Cover (Phase 5 validation)

**Proposed rule:**

```
noUsableCover = rvtr && !(packageCoverUrl || canonicalCoverUrl || vdjEmbedded || vdjThumbnail)
```

| Rule | Count |
|---|---|
| Current Needs Cover (package URL only) | **7,705** |
| **No Usable Cover (audited)** | **17** |

Validated against live loader + `loadCoverInfoForRvtrs()`. Matches [`NEEDS-COVER-AUDIT.md`](NEEDS-COVER-AUDIT.md) prediction.

Among Sunday snapshot RVTRs: **2** lack any usable cover (1 also not in library).

**Safe to implement Phase 5** — count is stable and meaningful.

---

### A5. Research Priority Queue (Phase 2 / 6 validation)

Current Ollama queue (`research-build-queue.ts`):

- Eligible: all `needsResearch` (**7,212**)
- Sort: play count DESC only
- No Sunday / Top N tier weighting

**Tier counts** (needsResearch rows only, exclusive tiers):

| Tier | Scope | Count |
|---|---|---|
| Tier 1 | Sunday Nights RVTRs | **1** |
| Tier 2 | Top 100 | **37** |
| Tier 3 | Top 500 (not Top 100) | **264** |
| Tier 4 | Everything else | **6,958** |
| **Total** | | **7,212** |

**Insight:** Sunday and Top 100 are **not** blocked on missing packages — they are blocked on **review approval and renderability**. Ollama on 7,212 would mostly ignore patron impact.

**What can be approved right now:**

| Queue | Total | Sunday | Top 100 | Top 500 |
|---|---|---|---|---|
| Needs Review | 936 | 133 | 4 | 179 |

**133 Sunday songs** are waiting on human review — the highest-impact “approve now” queue.

---

### A6. Next Action (Phase 3 audit)

Current `nextAutomation()` priority: Identity → Research → Review → Cover → Ready.

**Problem:** Always returns “Queue Ollama” for 7,212 research rows even when canonical graph could bootstrap deterministically.

**Audited next-action distribution** (expanded logic: review before cover when package exists):

| Next action | Count | Notes |
|---|---|---|
| Assign RVTR | 402 | Needs Identity |
| Build Research | 7,212 | Missing package file |
| Approve Review | 936 | Human gate — **do this before Ollama for Sunday** |
| Acquire Cover | **1** | True cover gap (patron rule) |
| Add Story | 115 | Package exists, no story |
| Fix Renderability | 136 | Package exists, status not review/published |
| Experience Ready | 76 | Strict ready subset |

Sunday missing (4 rows): 1 Build Research · 1 Approve Review · 1 Add Story · 1 Fix Renderability.

---

### A7. Acceptance test — current vs 3.2

| Question | BP 3.1 today | After 3.2 (with audited metrics) |
|---|---|---|
| Am I ready for Sunday? | No — must infer from 611 global | **118/138** patron ready panel |
| What songs block readiness? | Manual filter only | Click panel → missing list |
| What will Ollama process next? | “7,212 need research” | Tier 1–4 counts + ordered batch |
| What can I approve now? | Needs Review buried in metrics | **936** prominent; **133** Sunday |
| How many truly missing artwork? | Shows 7,705 | **17** No Usable Cover |
| Biggest patron improvement? | Not surfaced | Sunday review (133) + Top 100 renderability (16) |

---

## Part B — Implementation Plan

**Principle:** Metrics audited above must match UI before merge. No shipping new counts without loader tests.

### Phase 0 — Prerequisites (before UI)

| Task | Files | Output |
|---|---|---|
| Define shared readiness helpers | New `lib/ops/browser-plus-2/readiness.ts` | `patronReadiness()`, `strictReadiness()`, `noUsableCover()`, `readinessBlocker()`, `nextPatronAction()` |
| Load canonical covers in BP2 model | `load-browser-plus-2.ts` | Batch `loadCoverInfoForRvtrs()` for active RVTRs |
| Define cohort membership | New `lib/ops/browser-plus-2/cohorts.ts` | Sunday RVTR set, Top 100/500/1000 play-count slices |
| Unit tests on counts | New `tools/ops/bp-readiness-audit.ts` | CI-runnable snapshot matching this audit |

**Checkpoint:** CLI audit reproduces tables in Part A within ±0.

---

### Phase 1 — Readiness panels (top section)

**UI:** `BrowserPlus2Client.tsx`, `browser-plus-2.css`

Replace primary metric row with:

```
┌─────────────────────────────────────────────────────────┐
│ Sunday Nights    118 / 138 ready    [View missing →]    │
│ Top 100           55 / 100 ready    [View missing →]    │
│ Top 500          208 / 500 ready    [View missing →]    │
│ Current Queue    287 / 1000 ready   [View missing →]    │
└─────────────────────────────────────────────────────────┘
```

Move existing 6 queue cards to **Operations** section below.

**API:** Extend `Bp2Model` with `readiness: { sunday, top100, top500, top1000 }` computed server-side in `load-browser-plus-2.ts`.

**Click behavior:** Set filter to cohort-missing (new filter IDs) and sort by play count or Sunday year.

**Checkpoint:** Opening BP answers “Am I ready for Sunday?” in first screenful.

---

### Phase 2 — Research Priority Queue

**Replace banner:** “Ollama Research Queue · 7,212 songs” → “Research Priority Queue”

| Tier | Label | Count (live) |
|---|---|---|
| 1 | Sunday Nights missing | 1 |
| 2 | Top 100 missing | 37 |
| 3 | Top 500 missing | 264 |
| 4 | Everything else | 6,958 |

**Backend:** `research-build-queue.ts` — sort by tier ASC, then play count DESC.

**Optional gate:** Exclude rows with canonical chart + album from Tier 4 (deterministic bootstrap path) — aligns with NEEDS-RESEARCH-AUDIT Definition C (~2,475 full Ollama).

**Checkpoint:** “Queue next batch” processes Tier 1 first; banner shows tier breakdown.

---

### Phase 3 — Next Action (inspector)

**UI:** Inspector header shows single **Next Action** chip:

| Condition | Label |
|---|---|
| No RVTR | Assign RVTR |
| No package | Build Research |
| Status review | Approve Review |
| No usable cover | Acquire Cover |
| No story | Add Story |
| Not renderable | Fix Renderability |
| Patron ready | Experience Ready |

**Backend:** Replace / extend `nextAutomation()` in `work-queues.ts` using shared readiness helpers.

**Checkpoint:** Selected song always shows explicit action — no inference required.

---

### Phase 4 — Queue filters

**Add filters** (`Bp2FilterId`, `status.ts`, sidebar):

- Sunday Nights Missing  
- Top 100 Missing  
- Top 500 Missing  
- Experience Ready (keep)  
- Needs Research (keep)  
- Needs Review (keep)  
- No Usable Cover (rename from Needs Cover)

**Remove from primary position:** Videos, library-wide counts → secondary “Operations” collapsible.

**Checkpoint:** Filters map 1:1 to readiness panels.

---

### Phase 5 — Cover queue fix

**Change:** `needsCover` → `noUsableCover` using audited any-source rule.

**Files:** `work-queues.ts`, `load-browser-plus-2.ts`, labels in `BrowserPlus2Client.tsx`.

**Expected count:** **17** (validated).

**Experience Ready decision (choose one before implement):**

| Option | Rule | Sunday ready | Global ready |
|---|---|---|---|
| A | Keep strict package cover for Experience Ready | 76 / 120 | 611 |
| B | Align Experience Ready with patron cover | 116 / 120 | 1,008 |

**Recommendation:** Option B for patron-facing “Experience Ready”; rename strict mode “Package Complete” in Operations if still needed.

**Checkpoint:** Needs Cover card shows ~17, not 7,705.

---

### Phase 6 — Research priority logic (Ollama order)

**Sort order:**

1. Sunday Nights RVTRs  
2. Live Aid *(blocked — needs curated list)*  
3. Woodstock *(blocked — needs curated list)*  
4. Top 100  
5. Top 500  
6. Remaining library  

**Prerequisite work for Live Aid / Woodstock:**

| Deliverable | Suggested path |
|---|---|
| Curated RVTR list | `data/show-sets/live-aid.json`, `woodstock.json` |
| Loader | `lib/ops/show-sets/load-show-set.ts` |
| Readiness panel | Add when list exists |

Until lists exist, show panels as **“Not configured”** — do not fake text-match counts.

**Checkpoint:** Automated batch respects tier order; Live Aid/Woodstock panels appear when data lands.

---

## Part C — File map

| Area | Primary files |
|---|---|
| Readiness logic | `lib/ops/browser-plus-2/readiness.ts` *(new)* |
| Cohorts | `lib/ops/browser-plus-2/cohorts.ts` *(new)* |
| Model loader | `lib/ops/browser-plus-2/load-browser-plus-2.ts` |
| Work queues | `lib/ops/browser-plus-2/work-queues.ts` |
| Research batch | `lib/ops/browser-plus-2/research-build-queue.ts` |
| Dashboard UI | `components/ops/browser-plus-2/BrowserPlus2Client.tsx` |
| Styles | `app/ops/browser-plus-2/browser-plus-2.css` |
| Sunday data | `data/sunday-nights/snapshots/`, `lib/sunday-nights/load-snapshots.ts` |
| Cover batch | `lib/ops/intelligence/load-rvtr-covers.ts` |
| Audit CLI | `tools/ops/bp-readiness-audit.ts` *(new)* |

---

## Part D — Recommended work order

1. **Phase 0** — shared readiness + audit CLI (no UI)  
2. **Phase 5** — No Usable Cover fix (smallest diff, validated)  
3. **Phase 1** — readiness panels  
4. **Phase 3** — Next Action  
5. **Phase 4** — filters wired to panels  
6. **Phase 2 + 6** — priority queue + Ollama sort  
7. **Live Aid / Woodstock** — curated lists when Bob defines set membership  

**Do not run Ollama on 7,212.** Priority work:

1. **Approve 133 Sunday reviews**  
2. **Fix 16 Top 100 renderability** (status promotion)  
3. **Build 29 Top 100 packages** (many may bootstrap from graph without full Ollama)  
4. **Tier 4** only after cohorts clear  

---

## Part E — Acceptance test (3.2)

Opening Browser Plus, first 10 seconds must answer:

1. **Am I ready for Sunday?** → Panel: **118 / 138** (patron)  
2. **What songs block readiness?** → Click → 20 missing (138 − 118)  
3. **What will Ollama process next?** → Tier breakdown; next batch = Sunday tier first  
4. **What can I approve right now?** → Needs Review **936** (133 Sunday)  
5. **How many truly missing artwork?** → No Usable Cover **17**  
6. **Biggest patron improvement?** → Sunday review queue + Top 100 package/renderability gaps  

If any answer requires scrolling past readiness panels or mental math, simplify further.

---

## Appendix — Audit methodology

Script: one-off tsx audit via `loadBrowserPlus2Model()`, `loadSundayEventSongsFromSnapshots('all')`, `loadCoverInfoForRvtrs()`.

Reproduce:

```bash
cd /Users/bobhopp/RETROVERSE_PUBLIC
NODE_OPTIONS='--require ./tools/finance/preload-server-only.cjs' \
  npx tsx tools/ops/bp-readiness-audit.ts   # after Phase 0 lands
```

Snapshot date: 2026-06-24. Counts tied to live VDJ database + package files on disk.

---

*End of audit and plan.*
