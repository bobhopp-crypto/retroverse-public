# Sprint 3.41 — Mission Control Audit

Generated: 2026-06-28T22:34:35.413Z

## Executive summary

Mission Control previously mixed **three unrelated datasets**:

1. **200-RVTR scan cap** (`STUDIO_SNAPSHOT_SCAN_LIMIT`) for Published / department queues
2. **Overnight Collector queue** (`collector-progress.json` → VDJ videos missing collector packages)
3. **Full-disk pipeline** (5217 collector packages) used only by CLI backlog runner

Sprint 3.41 wires Mission Control to **`loadMissionControlDashboard()`** — a single full-disk scan shared with the backlog runner.

---

## 1. Pipeline count reconciliation (authoritative)

| Metric | Count |
| --- | ---: |
| Collector complete | 5217 |
| Needs Editor | 2307 |
| Needs Director | 3 |
| Needs Creative Review | 0 |
| Needs Publisher | 1 |
| Published | 2906 |
| Failed | 3 |
| Skipped (fast-path in run) | 3 |
| Currently processing | 1 |

**Reconciliation (mutually exclusive stage buckets):**

```
needsEditor + needsDirector + needsCreativeReview + needsPublisher + published
= 5217
collectorComplete = 5217
```

### Per-metric trace

| Display metric | Source file | Function | Data source | Filtering rules |
| --- | --- | --- | --- | --- |
| Collector complete | `lib/ops/studio/production/load-mission-control-dashboard.ts` | `scanFullDiskCounts()` | All `RVTR######` dirs under research department root | `existsSync(collectorOutputPath(rvtr))` |
| Needs Editor | same | same | collector + editor JSON | Has collector AND (no editor file OR editor not submitted) |
| Needs Director | same | same | editor + director paths | Editor submitted AND no director render spec |
| Needs Creative Review | same | same | director + creative-review paths | Director spec exists AND no `creative-review.json` |
| Needs Publisher | same | same | publisher store | Director complete, CR done, not publisher-approved |
| Published | same | same | publisher store | `isPublisherApproved(record)` |
| Failed | same | `loadBacklogProgress()` | `reports/studio/collector-backlog-progress.json` | `failedRvtrs[]` length |
| Skipped | same | `countSkippedResults()` | backlog progress `results[]` | All stages skipped in assembly-line run |
| Currently processing | same | `resolveLiveProcessing()` | `getAllDepartmentLiveStatusesCached()` | Department `status === "running"` with `currentSong` |

### Legacy Mission Control (pre-3.41 — incorrect for factory view)

| Display metric | Source file | Function | Value observed | Universe |
| --- | --- | --- | ---: | --- |
| Packages Published | lib/ops/studio/department-status/queue-index.ts | buildDepartmentQueueIndex() | 198 | Last 200 RVTR dirs (STUDIO_SNAPSHOT_SCAN_LIMIT) |
| Songs Waiting | lib/ops/studio/collector/store.ts | loadCollectorProgress().queue | 2810 | Overnight VDJ Collector queue |
| Current Queue | status-loaders.ts | sum queueRemaining | 2812 | 200-dir scan + collector override |
| Collector complete (old) | queue-index.ts | buildDepartmentQueueIndex() | 200 | Last 200 RVTR dirs only |

---

## 2. Backlog coverage — assembly-line runner

| Metric | Count | Notes |
| --- | ---: | --- |
| Collector complete | 5217 | Full disk |
| Entered pipeline | 2825 | `processedRvtrs.length` in backlog progress file |
| Published (full disk) | 2906 | Includes ~81 published before/during run outside processed count overlap |
| Remaining | 2311 | collectorComplete − published |
| Failed | 3 | Backlog run failures |
| Not yet entered assembly line | 2392 | collectorComplete − enteredPipeline |

**Runner source:** `tools/research/studio-collector-backlog-run.ts`

**Queue builder:** `lib/ops/studio/production/build-collector-backlog-queue.ts`

- Scans all RVTR dirs with `collector.json`
- Includes songs where `assessPackagePipelineStage().needsRun === true` (unless `--force`)
- On resume, excludes RVTRs already in `processedRvtrs`

**Why some packages are not scheduled yet:**

1. **Sequential drain** — runner processes one song at a time; ${notYetEntered} collector packages have not reached the runner yet.
2. **Already published** — `needsRun: false`; runner skips them instantly (counted in Skipped).
3. **Resume exclusion** — processed RVTRs are excluded from the next queue build.
4. **No scheduling change in this sprint** — visibility only.

Throughput (recent 100 avg runtime): 2074.6 songs/hr

Estimated completion: 2026-06-28T23:41:25.550Z

---

## 3. Queue audit

| Queue | File | Purpose | Count | Used by Mission Control (now) |
| --- | --- | --- | ---: | --- |
| Overnight Collector | `ops/collector-progress.json` | VDJ videos missing collector | 2810 | **No** — replaced by full-disk needsEditor |
| Department waiting (200 cap) | `queue-index.ts` | Per-dept next-in-queue | see legacy table | **No** — replaced by full-disk stage buckets |
| Collector backlog runner | `build-collector-backlog-queue.ts` | Assembly-line eligible RVTRs | dynamic | **Entered pipeline** metric only |
| Publisher store | `publisher/store` | Canonical publish state | ${publisherStore.records.length} records | **Published** total |

---

## 4. scanPipelineStageCounts cross-check

| Metric | scanPipelineStageCounts | dashboard | Match |
| --- | ---: | ---: | --- |
| collectorComplete | 5217 | 5217 | ✓ |
| published | 2906 | 2906 | ✓ |
| backlogRemaining | 2311 | 2311 | ✓ |

---

## 5. Era progress (Sunday Night anchors: 1980, 1990, 2005)

| Era | Collector | Editor | Director | Published |
| --- | ---: | ---: | ---: | ---: |
| 1980 | 788 | 504 | 504 | 504 |
| 1990 | 649 | 417 | 417 | 417 |
| 2005 | 763 | 330 | 330 | 330 |

Era assignment: `eraAnchorForYear()` in `lib/ops/studio/production/filter-by-era.ts` using `collector.json` → `identity.year`.

---

## 6. Mission Control UI changes (Sprint 3.41)

| Section | Component | Data |
| --- | --- | --- |
| Hero | `MissionControlHero` | `dashboard` — factory headline, not "Currently Producing" emphasis |
| Production Health | `MissionControlProductionHealth` | Stage bars + throughput + ETA + live slot |
| Pipeline Counts | `MissionControlStudioToday` | Authoritative stage buckets |
| Sunday Night Eras | `MissionControlYearProgress` | Era progress panels |
| Recent Published | `MissionControlRecentPackages` | RVTR, year, stage, launch buttons |

**Loader:** `loadLivingStudioSnapshot()` → `getMissionControlDashboardCached()`

---

## 7. Recommended metrics (canonical)

| Metric | Source |
| --- | --- |
| All stage counts | `loadMissionControlDashboard().counts` |
| Published N / 5217 | `counts.published` / `counts.collectorComplete` |
| Throughput | avg runtime of last 100 backlog results |
| Entered pipeline | `backlogRun.enteredPipeline` |
| Next / now / last published | `dashboard.live` |
| Era panels | `dashboard.eraProgress` |

---

## 8. Success criteria

| Criterion | Status |
| --- | --- |
| One authoritative pipeline count | ✓ `loadMissionControlDashboard()` |
| Mission Control reconciles with runner | ✓ same full-disk scan as CLI |
| Collector-complete remaining known | ✓ `backlogRemaining` = 3430 |
| Entered assembly-line count known | ✓ `enteredPipeline` = 1705 |
| Production logic unchanged | ✓ visibility-only sprint |

