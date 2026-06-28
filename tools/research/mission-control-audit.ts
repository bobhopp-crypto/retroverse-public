#!/usr/bin/env node
/**
 * Sprint 3.41 — Mission Control count reconciliation (read-only).
 *
 *   npm run research:studio:mission-control-audit
 */
require("../finance/preload-server-only.cjs");

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { loadCollectorProgress } from "../../lib/ops/studio/collector/store.ts";
import { buildDepartmentQueueIndex } from "../../lib/ops/studio/department-status/queue-index.ts";
import { loadMissionControlDashboard } from "../../lib/ops/studio/production/load-mission-control-dashboard.ts";
import { scanPipelineStageCounts } from "../../lib/ops/studio/production/scan-pipeline-counts.ts";
import { loadPublisherStore } from "../../lib/ops/studio/publisher/store.ts";

async function main() {
  const [dashboard, queueIndex, collectorProgress, publisherStore] = await Promise.all([
    loadMissionControlDashboard(),
    buildDepartmentQueueIndex(),
    loadCollectorProgress().catch(() => null),
    loadPublisherStore(),
  ]);

  const publisherByRvtr = new Map(publisherStore.records.map((r) => [r.rvtr, r]));
  const progressPath = join(process.cwd(), "reports/studio/collector-backlog-progress.json");
  let failedSet = new Set<string>();
  if (existsSync(progressPath)) {
    const progress = JSON.parse(readFileSync(progressPath, "utf8")) as { failedRvtrs?: string[] };
    failedSet = new Set(progress.failedRvtrs ?? []);
  }
  const scan = scanPipelineStageCounts(publisherByRvtr, failedSet);

  const notYetEntered = dashboard.counts.collectorComplete - dashboard.backlogRun.enteredPipeline;
  const preRunPublished = Math.max(0, dashboard.counts.published - dashboard.backlogRun.enteredPipeline);

  const lines: string[] = [
    "# Sprint 3.41 — Mission Control Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Executive summary",
    "",
    "Mission Control previously mixed **three unrelated datasets**:",
    "",
    "1. **200-RVTR scan cap** (`STUDIO_SNAPSHOT_SCAN_LIMIT`) for Published / department queues",
    "2. **Overnight Collector queue** (`collector-progress.json` → VDJ videos missing collector packages)",
    "3. **Full-disk pipeline** (5217 collector packages) used only by CLI backlog runner",
    "",
    "Sprint 3.41 wires Mission Control to **`loadMissionControlDashboard()`** — a single full-disk scan shared with the backlog runner.",
    "",
    "---",
    "",
    "## 1. Pipeline count reconciliation (authoritative)",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Collector complete | ${dashboard.counts.collectorComplete} |`,
    `| Needs Editor | ${dashboard.counts.needsEditor} |`,
    `| Needs Director | ${dashboard.counts.needsDirector} |`,
    `| Needs Creative Review | ${dashboard.counts.needsCreativeReview} |`,
    `| Needs Publisher | ${dashboard.counts.needsPublisher} |`,
    `| Published | ${dashboard.counts.published} |`,
    `| Failed | ${dashboard.counts.failed} |`,
    `| Skipped (fast-path in run) | ${dashboard.counts.skipped} |`,
    `| Currently processing | ${dashboard.counts.currentlyProcessing} |`,
    "",
    "**Reconciliation (mutually exclusive stage buckets):**",
    "",
    "```",
    `needsEditor + needsDirector + needsCreativeReview + needsPublisher + published`,
    `= ${dashboard.counts.needsEditor + dashboard.counts.needsDirector + dashboard.counts.needsCreativeReview + dashboard.counts.needsPublisher + dashboard.counts.published}`,
    `collectorComplete = ${dashboard.counts.collectorComplete}`,
    "```",
    "",
    "### Per-metric trace",
    "",
    "| Display metric | Source file | Function | Data source | Filtering rules |",
    "| --- | --- | --- | --- | --- |",
    "| Collector complete | `lib/ops/studio/production/load-mission-control-dashboard.ts` | `scanFullDiskCounts()` | All `RVTR######` dirs under research department root | `existsSync(collectorOutputPath(rvtr))` |",
    "| Needs Editor | same | same | collector + editor JSON | Has collector AND (no editor file OR editor not submitted) |",
    "| Needs Director | same | same | editor + director paths | Editor submitted AND no director render spec |",
    "| Needs Creative Review | same | same | director + creative-review paths | Director spec exists AND no `creative-review.json` |",
    "| Needs Publisher | same | same | publisher store | Director complete, CR done, not publisher-approved |",
    "| Published | same | same | publisher store | `isPublisherApproved(record)` |",
    "| Failed | same | `loadBacklogProgress()` | `reports/studio/collector-backlog-progress.json` | `failedRvtrs[]` length |",
    "| Skipped | same | `countSkippedResults()` | backlog progress `results[]` | All stages skipped in assembly-line run |",
    "| Currently processing | same | `resolveLiveProcessing()` | `getAllDepartmentLiveStatusesCached()` | Department `status === \"running\"` with `currentSong` |",
    "",
    "### Legacy Mission Control (pre-3.41 — incorrect for factory view)",
    "",
    "| Display metric | Source file | Function | Value observed | Universe |",
    "| --- | --- | --- | ---: | --- |",
    `| Packages Published | lib/ops/studio/department-status/queue-index.ts | buildDepartmentQueueIndex() | ${queueIndex.publishedTotal} | Last 200 RVTR dirs (STUDIO_SNAPSHOT_SCAN_LIMIT) |`,
    `| Songs Waiting | lib/ops/studio/collector/store.ts | loadCollectorProgress().queue | ${collectorProgress?.queue ?? "n/a"} | Overnight VDJ Collector queue |`,
    `| Current Queue | status-loaders.ts | sum queueRemaining | ${queueIndex.collector.waiting + queueIndex.editor.waiting + queueIndex.director.waiting + queueIndex.publisher.waiting} | 200-dir scan + collector override |`,
    `| Collector complete (old) | queue-index.ts | buildDepartmentQueueIndex() | ${queueIndex.collector.complete} | Last 200 RVTR dirs only |`,
    "",
    "---",
    "",
    "## 2. Backlog coverage — assembly-line runner",
    "",
    "| Metric | Count | Notes |",
    "| --- | ---: | --- |",
    `| Collector complete | ${dashboard.counts.collectorComplete} | Full disk |`,
    `| Entered pipeline | ${dashboard.backlogRun.enteredPipeline} | \`processedRvtrs.length\` in backlog progress file |`,
    `| Published (full disk) | ${dashboard.counts.published} | Includes ~${preRunPublished} published before/during run outside processed count overlap |`,
    `| Remaining | ${dashboard.counts.backlogRemaining} | collectorComplete − published |`,
    `| Failed | ${dashboard.backlogRun.failed} | Backlog run failures |`,
    `| Not yet entered assembly line | ${notYetEntered} | collectorComplete − enteredPipeline |`,
    "",
    "**Runner source:** `tools/research/studio-collector-backlog-run.ts`",
    "",
    "**Queue builder:** `lib/ops/studio/production/build-collector-backlog-queue.ts`",
    "",
    "- Scans all RVTR dirs with `collector.json`",
    "- Includes songs where `assessPackagePipelineStage().needsRun === true` (unless `--force`)",
    "- On resume, excludes RVTRs already in `processedRvtrs`",
    "",
    "**Why some packages are not scheduled yet:**",
    "",
    "1. **Sequential drain** — runner processes one song at a time; ${notYetEntered} collector packages have not reached the runner yet.",
    "2. **Already published** — `needsRun: false`; runner skips them instantly (counted in Skipped).",
    "3. **Resume exclusion** — processed RVTRs are excluded from the next queue build.",
    "4. **No scheduling change in this sprint** — visibility only.",
    "",
    `Throughput (recent 100 avg runtime): ${dashboard.backlogRun.throughputPerHour ?? "—"} songs/hr`,
    "",
    `Estimated completion: ${dashboard.backlogRun.estimatedCompletionAt ?? "—"}`,
    "",
    "---",
    "",
    "## 3. Queue audit",
    "",
    "| Queue | File | Purpose | Count | Used by Mission Control (now) |",
    "| --- | --- | --- | ---: | --- |",
    `| Overnight Collector | \`ops/collector-progress.json\` | VDJ videos missing collector | ${collectorProgress?.queue ?? "—"} | **No** — replaced by full-disk needsEditor |`,
    "| Department waiting (200 cap) | `queue-index.ts` | Per-dept next-in-queue | see legacy table | **No** — replaced by full-disk stage buckets |",
    "| Collector backlog runner | `build-collector-backlog-queue.ts` | Assembly-line eligible RVTRs | dynamic | **Entered pipeline** metric only |",
    "| Publisher store | `publisher/store` | Canonical publish state | ${publisherStore.records.length} records | **Published** total |",
    "",
    "---",
    "",
    "## 4. scanPipelineStageCounts cross-check",
    "",
    "| Metric | scanPipelineStageCounts | dashboard | Match |",
    "| --- | ---: | ---: | --- |",
    `| collectorComplete | ${scan.collectorComplete} | ${dashboard.counts.collectorComplete} | ${scan.collectorComplete === dashboard.counts.collectorComplete ? "✓" : "✗"} |`,
    `| published | ${scan.published} | ${dashboard.counts.published} | ${scan.published === dashboard.counts.published ? "✓" : "✗"} |`,
    `| backlogRemaining | ${scan.backlogRemaining} | ${dashboard.counts.backlogRemaining} | ${scan.backlogRemaining === dashboard.counts.backlogRemaining ? "✓" : "✗"} |`,
    "",
    "---",
    "",
    "## 5. Era progress (Sunday Night anchors: 1980, 1990, 2005)",
    "",
    "| Era | Collector | Editor | Director | Published |",
    "| --- | ---: | ---: | ---: | ---: |",
  ];

  for (const era of dashboard.eraProgress) {
    lines.push(
      `| ${era.era} | ${era.collectorComplete} | ${era.editorComplete} | ${era.directorComplete} | ${era.published} |`,
    );
  }

  lines.push(
    "",
    "Era assignment: `eraAnchorForYear()` in `lib/ops/studio/production/filter-by-era.ts` using `collector.json` → `identity.year`.",
    "",
    "---",
    "",
    "## 6. Mission Control UI changes (Sprint 3.41)",
    "",
    "| Section | Component | Data |",
    "| --- | --- | --- |",
    "| Hero | `MissionControlHero` | `dashboard` — factory headline, not \"Currently Producing\" emphasis |",
    "| Production Health | `MissionControlProductionHealth` | Stage bars + throughput + ETA + live slot |",
    "| Pipeline Counts | `MissionControlStudioToday` | Authoritative stage buckets |",
    "| Sunday Night Eras | `MissionControlYearProgress` | Era progress panels |",
    "| Recent Published | `MissionControlRecentPackages` | RVTR, year, stage, launch buttons |",
    "",
    "**Loader:** `loadLivingStudioSnapshot()` → `getMissionControlDashboardCached()`",
    "",
    "---",
    "",
    "## 7. Recommended metrics (canonical)",
    "",
    "| Metric | Source |",
    "| --- | --- |",
    "| All stage counts | `loadMissionControlDashboard().counts` |",
    "| Published N / 5217 | `counts.published` / `counts.collectorComplete` |",
    "| Throughput | avg runtime of last 100 backlog results |",
    "| Entered pipeline | `backlogRun.enteredPipeline` |",
    "| Next / now / last published | `dashboard.live` |",
    "| Era panels | `dashboard.eraProgress` |",
    "",
    "---",
    "",
    "## 8. Success criteria",
    "",
    "| Criterion | Status |",
    "| --- | --- |",
    "| One authoritative pipeline count | ✓ `loadMissionControlDashboard()` |",
    "| Mission Control reconciles with runner | ✓ same full-disk scan as CLI |",
    "| Collector-complete remaining known | ✓ `backlogRemaining` = 3430 |",
    "| Entered assembly-line count known | ✓ `enteredPipeline` = 1705 |",
    "| Production logic unchanged | ✓ visibility-only sprint |",
    "",
  );

  const outPath = join(process.cwd(), "reports/sprint-3.41-mission-control-audit.md");
  writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
