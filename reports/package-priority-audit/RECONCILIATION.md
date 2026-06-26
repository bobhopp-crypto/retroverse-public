# Package Readiness Reconciliation Audit

**Date:** 2026-06-24  
**Cohort:** 7,206 owned VIDEO + RVTR tracks (same as Phase 5 pipeline audit)

---

## Executive summary

The **4%** and **2%** figures are **not disconnected** from Ollama generation — but they measure **strict downstream readiness**, not **total packages generated**.

| What you generated | Count | % of owned cohort |
|--------------------|------:|------------------:|
| **Ollama package files on disk** | **1,184** | **16.4%** |
| **Intelligence package** (audit “4%”) | **287** | **4.0%** |
| **Fully ready** (audit “2%”) | **136** | **1.9%** |

**~1,351 packages exist globally** in storage. **789 owned tracks** have a package file stuck in `review` with **zero story cards** — pipeline ran, but never crossed the intelligence threshold.

The 4% figure is **completed intelligence package count**, not total generated count, not published-only count.

---

## 1. Total generated packages

| Scope | Count | Location |
|-------|------:|----------|
| **Global package files** | **1,351** | `RETROVERSE_DATA/ops/intelligence/packages/*.json` |
| **Global index entries** | **1,351** | `RETROVERSE_DATA/ops/intelligence/package-index.json` |
| **Owned VIDEO cohort with any package file** | **1,184** | Intersection of 1,351 with 7,206 owned RVTRs |
| **Outside owned cohort** | **167** | Graph/VDJ RVTRs with packages but not in owned VIDEO set |

Ollama batch produced **hundreds → 1,351** package JSON files. On the owned cohort, **16.4%** have a file, not 4%.

---

## 2. Draft packages

| Scope | Count |
|-------|------:|
| Global `draft` status | 132 |
| Owned cohort `draft` (no story cards) | 108 |

Draft = package file exists, status `draft`, **no ranked story cards**.

---

## 3. Review packages

| Scope | Count | Notes |
|-------|------:|-------|
| Global `review` status | 955 | |
| Owned cohort `review` total | **892** | |
| ↳ `review` **without** story cards | **789** | Generated but **not** intelligence package |
| ↳ `review` **with** story cards | **103** | **Count as** intelligence package |

**789 tracks** explain most of the gap between 16.4% (has file) and 4% (intelligence package). Ollama wrote files; story card step never completed or never promoted.

---

## 4. Published packages

| Scope | Count | % of owned |
|-------|------:|-----------:|
| Global `published` | 64 | — |
| Owned cohort `published` | **61** | **0.8%** |
| Owned `cards_ready` | **123** | 1.7% |
| Owned `approved` | 0 | — |

Published alone is **0.8%**, not 4%. The 4% metric includes `cards_ready`, `published`, `approved`, and **any package with ranked story cards** (including 103 in `review`).

---

## 5. Legacy packages

| Type | Count |
|------|------:|
| Phase 1 (`version: 1`) | **0** |
| Phase 2 (`version: 2`) | **1,351** |
| Missing `intel` block | **0** |

All packages are Phase 2 schema. No legacy v1 split affects counts.

**Stale bundled copy:** `RETROVERSE_PUBLIC/data/ops/intelligence/packages/` contains **636** files (partial mirror). Authoritative store is **RETROVERSE_DATA** (1,351). Audits using only the bundled copy would under-count by **715 packages**.

---

## 6. Tables and storage locations

### File storage (source of truth)

| Path | Role |
|------|------|
| `RETROVERSE_DATA/ops/intelligence/packages/RVTR######.json` | **Canonical package JSON** (Ollama output) |
| `RETROVERSE_DATA/ops/intelligence/package-index.json` | Index of all packages + status |
| `RETROVERSE_DATA/ops/intelligence/batch-status.json` | Batch job tracker (121 jobs — **not** package inventory) |
| `RETROVERSE_DATA/ops/intelligence/backfill-queue.json` | Cover/package queue |
| `RETROVERSE_DATA/ops/intelligence/research/{RVTR}/` | Research vault per track |

### Bundled fallback (repo — stale)

| Path | Role |
|------|------|
| `data/ops/intelligence/packages/` | 636-file subset; used only if RETROVERSE_DATA missing |
| `data/ops/intelligence/package-index.json` | Stale index (636 entries) |

### Postgres (readiness gates — not package storage)

| Table / view | Used for |
|--------------|----------|
| `canonical_track_display` | Chart history, artist name |
| `media_track_links` + VIDEO path clause | Owned playback link |
| `youtube_video_tracks` | YouTube playback fallback |
| Album / artwork joins | Cover via `loadCoverInfoForRvtrs` |

### Code loaders

| Function | Reads |
|----------|-------|
| `loadSongPackage(rvtr)` | RETROVERSE_DATA file first, then bundled fallback |
| `loadSongPackageIndex()` | RETROVERSE_DATA index first, then bundled |
| `hasIntelligencePackage()` | In-memory status + story card count |

**No Postgres table stores packages.** Package data is filesystem JSON only.

---

## 7. Exact readiness formulas

### Intelligence package (the “4%” metric)

From `lib/ops/package-priority-audit.ts` / `backfill-coverage.ts`:

```text
hasIntelligencePackage =
  storyCardCount > 0
  OR status IN ('published', 'cards_ready', 'approved')
```

**Denominator:** 7,206 owned VIDEO + RVTR tracks.

**Result:** 287 / 7,206 = **4.0%**

### Fully ready (the “2%” metric)

```text
fullyReady =
  hasIntelligencePackage
  AND hasCover          (Cover Library / album artwork URL)
  AND hasChartHistory   (canonical_track_display.has_hot100)
  AND hasArtistData     (canonical artist name present)
  AND hasPlaybackLink   (VIDEO media_track_links OR YouTube exact/high)
  AND artifactsReady    (record_label + timeline + story_constellation + song_dna)
```

From `lib/ops/intelligence/artifact-readiness.ts`:

```text
artifactsReady =
  intel.label OR intel.catalogNumber
  AND timelineEvents.length >= 2
  AND storyCount >= 2
  AND (recordingFacts + videoFacts + chartHistory) >= 2
```

**Result:** 136 / 7,206 = **1.9%**

---

## 8. What the 4% figure represents

| Interpretation | Correct? |
|----------------|----------|
| Total Ollama package files / owned cohort | **No** — that is **16.4%** (1,184) |
| Completed intelligence package / owned cohort | **Yes** — **4.0%** (287) |
| Published only / owned cohort | **No** — that is **0.8%** (61) |
| Disconnected audit | **No** — reads same RETROVERSE_DATA store |

---

## 9. Reconciliation math (owned cohort)

```text
7,206 owned VIDEO + RVTR
├── 6,022 (83.6%) — no package file
└── 1,184 (16.4%) — package file exists
    ├── 789 (10.9%) — review, NO story cards     ← largest “lost” bucket
    ├── 108 (1.5%)  — draft, no story cards
    ├── 103 (1.4%) — review WITH story cards   ┐
    ├── 123 (1.7%) — cards_ready               ├─ 287 intelligence (4.0%)
    └──  61 (0.8%) — published                   ┘
        └── 136 (1.9%) — fully ready (287 minus ~151 failing cover/chart/playback/artifacts gates)
```

Global: **395** intelligence packages total = **287** owned + **108** outside owned cohort.

---

## 10. batch-status.json vs package store

| Source | Jobs | Notes |
|--------|-----:|-------|
| `batch-status.json` | 121 | 119 `review`, 2 `running` |
| `package-index.json` | 1,351 | Complete inventory |

Batch status tracks **recent batch runs**, not all packages. Do not use it for total generated count.

---

## 11. Why it feels like “hundreds generated” but audit shows 4%

1. **1,351 packages were generated** — correct.
2. **1,184 of those** land on owned VIDEO RVTRs (16.4%).
3. **789 owned packages** are `review` with **no story cards** — file exists, intelligence threshold not met.
4. Audit **4%** counts only **287** with story cards or terminal status.
5. Audit **2%** adds cover, chart, playback, and artifact gates on top — **136** pass all.

**The discrepancy is definitional, not a storage bug** — except the stale **636-file bundled copy**, which would under-count if RETROVERSE_DATA were unavailable.

---

## Commands to reproduce

```bash
npm run ops:package-pipeline-audit   # owned cohort breakdown
# Manual: count files in RETROVERSE_DATA/ops/intelligence/packages/
```
