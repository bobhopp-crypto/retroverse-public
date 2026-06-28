# Studio Production Startup Profile

Generated: 2026-06-28T00:16:56.266Z

## Goal

First `[1/N]` log within **5 seconds** on a warm system.

## Before fix (code audit — pre-instrumentation)

| Phase | Estimated impact |
| --- | --- |
| `buildPipelineHealthSnapshot()` before any log | 5–30s (200 RVTR scan + editor loads) |
| `loadBrowserPlus2Model()` full dashboard | 10–60s+ |
| Full queue with `limit: 0` then slice | Scans all 8026 candidates |
| `loadPublisherStore()` per RVTR assessed | 988+ JSON parses × row count |
| First console output | After all of the above |

**Observed symptom:** silence for several minutes after script start.

## After fix (measured)

| Phase | Elapsed (ms) | Delta (ms) |
| --- | ---: | ---: |
| Starting... | 0 | 0 |
| Report directory ready | 3 | 3 |
| Loading progress file... | 3 | 0 |
| Progress loaded (fresh run) | 3 | 0 |
| Loading publisher records... | 3 | 0 |
| Publisher records loaded (988 records) | 34 | 31 |
| Loading VDJ candidate index... | 34 | 0 |
| VDJ index loaded (8026 candidate RVTRs) | 898 | 864 |
| Building queue... | 899 | 1 |
| Queue built: 10 songs (scanned 34/8026 candidates) | 914 | 15 |
| Selecting first candidate: RVTR800065 — Electric Avenue | 914 | 0 |
| Starting song 1... | 914 | 0 |
| Loading pipeline health snapshot (before)... | 914 | 0 |
| Before snapshot ready | 959 | 45 |

**First song log:** +914ms

## Queue build stats

| Metric | Value |
| --- | --- |
| Limit | 10 |
| Queue selected | 10 |
| VDJ candidate rows (unique RVTR) | 8026 |
| Rows scanned for eligibility | 34 |
| Publisher records loaded | 988 |

## Slow phases (>2s)

None.

## Root cause

Startup blocked silently before any queue log:

1. **`buildPipelineHealthSnapshot()` ran first** — scans up to 200 RVTR directories with parallel `loadEditorStory` calls before any user-facing output.
2. **`selectProductionQueue({ limit: 0 })`** — built the entire eligible queue before applying `--limit`, so `--limit 10` still scanned every play-count row.
3. **`loadBrowserPlus2Model()` inside queue selection** — rebuilt the full Browser+ 2 dashboard (cohorts, cover batch, metadata impact, studio operations, package integrity) just to read sorted VDJ rows.
4. **`assessPackagePipelineStage()` re-parsed publisher store per RVTR** — `loadPublisherStore()` on every candidate row (multi-MB JSON × hundreds of songs).

## Fixes applied

- Log startup phases immediately with `[startup +Nms]` timestamps.
- Defer `buildPipelineHealthSnapshot()` until after queue selection / first song log.
- Pass CLI `--limit` into queue builder for early exit once N eligible songs are found.
- Load publisher store once; pass `publisherByRvtr` map into every stage assessment.
- Replace `loadBrowserPlus2Model()` with lightweight `loadProductionCandidateRows()` (`loadBrowserPlusModel` + filter only).
