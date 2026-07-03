import type {
  BatchRunSummary,
  CoachingIssue,
  LocalVsCloudComparison,
  SongBatchResult,
  SpotReviewPick,
  TrainingBatchMode,
} from "./types";

function avg(nums: Array<number | null>): number | null {
  const vals = nums.filter((n): n is number => n !== null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export function summarizeBatch(
  mode: TrainingBatchMode,
  targetCount: number,
  results: SongBatchResult[],
): BatchRunSummary {
  const completed = results.filter((r) => r.status === "complete");
  const failed = results.filter((r) => r.status === "failed");
  const partial = results.filter((r) => r.status === "partial");
  const totalRuntimeMs = results.reduce((s, r) => s + r.totalRuntimeMs, 0);
  const publisherReady = results.filter((r) => r.publisher.status === "complete").length;
  const rendererReady = results.filter((r) => r.renderer.status === "complete").length;
  const cloudRewrites = results.filter((r) => r.editor.details.usedCloud === true).length;

  return {
    mode,
    generatedAt: new Date().toISOString(),
    targetCount,
    processedCount: results.length,
    completedCount: completed.length,
    failedCount: failed.length,
    partialCount: partial.length,
    totalRetries: results.reduce((s, r) => s + r.retries, 0),
    totalRuntimeMs,
    avgRuntimeMsPerSong: results.length ? Math.round(totalRuntimeMs / results.length) : 0,
    avgConfidence: avg(results.map((r) => r.collector.confidence)),
    avgPatronValue: avg(results.map((r) => r.patronValue)),
    avgSceneCount: avg(results.map((r) => r.sceneCount)),
    avgWordsPerScene: avg(results.map((r) => r.wordsPerScene)),
    avgVisualCoverage: avg(results.map((r) => r.visualCoverage)),
    avgPackageCompleteness: avg(results.map((r) => r.packageCompleteness)),
    publisherReadyCount: publisherReady,
    rendererReadyCount: rendererReady,
    estimatedApiCostUsd: mode === "cloud" ? Math.round(cloudRewrites * 0.02 * 100) / 100 : null,
    results,
  };
}

function deptAvgConfidence(results: SongBatchResult[], dept: keyof Pick<SongBatchResult, "collector" | "editor" | "director" | "publisher" | "renderer">): number | null {
  return avg(results.map((r) => r[dept].confidence));
}

export function aggregateCoachingIssues(results: SongBatchResult[]): CoachingIssue[] {
  const buckets = new Map<string, CoachingIssue>();

  function add(dept: string, note: string, rvtr: string) {
    const key = `${dept}::${note.toLowerCase().slice(0, 80)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      if (existing.examples.length < 3) existing.examples.push(rvtr);
    } else {
      buckets.set(key, { department: dept, issue: note, count: 1, examples: [rvtr] });
    }
  }

  for (const r of results) {
    for (const note of r.coachingNotes) {
      const dept = note.split(":")[0]?.trim() ?? "general";
      add(dept, note, r.rvtr);
    }
    if (r.collector.details.missingAreas && Number(r.collector.details.missingAreas) > 2) {
      add("Collector", "Multiple missing research areas", r.rvtr);
    }
    if (r.editor.status === "failed") add("Editor", r.editor.error ?? "Editor failed", r.rvtr);
    if (r.director.status === "failed") add("Director", r.director.error ?? "Director failed", r.rvtr);
    if (r.publisher.status === "blocked") add("Publisher", "Not publish-ready", r.rvtr);
    if (r.renderer.status !== "complete") add("Renderer", "Experience not render-ready", r.rvtr);
  }

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);
}

function scoreSong(r: SongBatchResult): number {
  return (
    (r.patronValue ?? 0) * 10 +
    (r.packageCompleteness ?? 0) +
    (r.director.confidence ?? 0) * 0.5 +
    (r.renderer.status === "complete" ? 20 : 0)
  );
}

function pickSpot(
  results: SongBatchResult[],
  count: number,
  reason: string,
  sortFn: (a: SongBatchResult, b: SongBatchResult) => number,
): SpotReviewPick[] {
  return [...results]
    .sort(sortFn)
    .slice(0, count)
    .map((r) => ({
      rvtr: r.rvtr,
      artist: r.artist,
      title: r.title,
      reason,
      studioUrl: `/ops/studio/training/${r.rvtr}/collector`,
      score: scoreSong(r),
    }));
}

export function buildLocalVsCloudComparison(
  local: BatchRunSummary,
  cloud: BatchRunSummary,
): LocalVsCloudComparison {
  const localByRvtr = new Map(local.results.map((r) => [r.rvtr, r]));
  const improved: SpotReviewPick[] = [];

  for (const cloudR of cloud.results) {
    const localR = localByRvtr.get(cloudR.rvtr);
    if (!localR) continue;
    const delta =
      (cloudR.patronValue ?? 0) -
      (localR.patronValue ?? 0) +
      (cloudR.packageCompleteness ?? 0) -
      (localR.packageCompleteness ?? 0);
    if (delta > 5) {
      improved.push({
        rvtr: cloudR.rvtr,
        artist: cloudR.artist,
        title: cloudR.title,
        reason: `Patron/completeness +${Math.round(delta)} vs local`,
        studioUrl: `/ops/studio/training/${cloudR.rvtr}/collector`,
        score: delta,
      });
    }
  }
  improved.sort((a, b) => b.score - a.score);

  const deptNames = ["collector", "editor", "director", "publisher", "renderer"] as const;
  const departmentConfidence: LocalVsCloudComparison["departmentConfidence"] = {};
  for (const dept of deptNames) {
    departmentConfidence[dept] = {
      local: deptAvgConfidence(local.results, dept),
      cloud: deptAvgConfidence(cloud.results, dept),
    };
  }

  const editorLift =
    (departmentConfidence.editor?.cloud ?? 0) - (departmentConfidence.editor?.local ?? 0);
  const pubLift = cloud.publisherReadyCount - local.publisherReadyCount;
  const cost = cloud.estimatedApiCostUsd ?? 0;

  let recommendation = "Stay on local pipeline for batch runs.";
  if (editorLift >= 5 && pubLift >= 3 && cost < 5) {
    recommendation = "Cloud reasoning worth it for Editor-heavy batches — modest cost, measurable publish lift.";
  } else if (editorLift >= 3) {
    recommendation = "Cloud helps Editor quality; evaluate cost per song before full adoption.";
  } else if (pubLift <= 0) {
    recommendation = "Cloud did not improve publish-ready count — focus Collector/Director coaching first.";
  }

  const pool = cloud.results.length ? cloud.results : local.results;

  return {
    generatedAt: new Date().toISOString(),
    local,
    cloud,
    departmentConfidence,
    publisherReady: { local: local.publisherReadyCount, cloud: cloud.publisherReadyCount },
    rendererReady: { local: local.rendererReadyCount, cloud: cloud.rendererReadyCount },
    runtimeMs: { local: local.totalRuntimeMs, cloud: cloud.totalRuntimeMs },
    estimatedApiCostUsd: cloud.estimatedApiCostUsd,
    recommendation,
    strongest: pickSpot(pool, 5, "Highest patron + completeness", (a, b) => scoreSong(b) - scoreSong(a)),
    weakest: pickSpot(pool, 5, "Lowest package completeness", (a, b) => scoreSong(a) - scoreSong(b)),
    mostImproved: improved.slice(0, 5),
    coaching: aggregateCoachingIssues([...local.results, ...cloud.results]),
  };
}

export function formatBatchReport(summary: BatchRunSummary, title: string): string {
  const mins = Math.round(summary.totalRuntimeMs / 60000);
  return `# ${title}

Generated: ${summary.generatedAt}

## Totals

| Metric | Value |
|--------|-------|
| Mode | ${summary.mode} |
| Processed | ${summary.processedCount} / ${summary.targetCount} |
| Completed | ${summary.completedCount} |
| Partial | ${summary.partialCount} |
| Failed | ${summary.failedCount} |
| Retries | ${summary.totalRetries} |
| Total runtime | ${mins} min |
| Avg runtime/song | ${Math.round(summary.avgRuntimeMsPerSong / 1000)}s |
| Avg confidence (Collector) | ${summary.avgConfidence ?? "—"}% |
| Avg Patron Value | ${summary.avgPatronValue ?? "—"} |
| Avg scene count | ${summary.avgSceneCount ?? "—"} |
| Avg words/scene | ${summary.avgWordsPerScene ?? "—"} |
| Avg visual coverage | ${summary.avgVisualCoverage ?? "—"}% |
| Package completeness | ${summary.avgPackageCompleteness ?? "—"}% |
| Publisher ready | ${summary.publisherReadyCount} |
| Renderer ready | ${summary.rendererReadyCount} |
${summary.estimatedApiCostUsd != null ? `| Est. API cost | $${summary.estimatedApiCostUsd} |` : ""}

## Per-song

| Song | RVTR | Status | Patron | Scenes | Completeness | Collector | Editor | Director |
|------|------|--------|--------|--------|--------------|-----------|--------|----------|
${summary.results
  .map(
    (r) =>
      `| ${r.artist} — ${r.title} | ${r.rvtr} | ${r.status} | ${r.patronValue ?? "—"} | ${r.sceneCount ?? "—"} | ${r.packageCompleteness ?? "—"}% | ${r.collector.status} | ${r.editor.status} | ${r.director.status} |`,
  )
  .join("\n")}
`;
}

export function formatLocalVsCloudReport(cmp: LocalVsCloudComparison): string {
  const deptRows = Object.entries(cmp.departmentConfidence)
    .map(
      ([dept, v]) =>
        `| ${dept.charAt(0).toUpperCase()}${dept.slice(1)} | ${v.local ?? "—"}% | ${v.cloud ?? "—"}% |`,
    )
    .join("\n");

  return `# Local vs Cloud — Training Batch

Generated: ${cmp.generatedAt}

## Side-by-side

| Department | Local | Cloud |
|------------|-------|-------|
${deptRows}

| Metric | Local | Cloud |
|--------|-------|-------|
| Publisher ready | ${cmp.publisherReady.local} | ${cmp.publisherReady.cloud} |
| Renderer ready | ${cmp.rendererReady.local} | ${cmp.rendererReady.cloud} |
| Total runtime | ${Math.round(cmp.runtimeMs.local / 60000)} min | ${Math.round(cmp.runtimeMs.cloud / 60000)} min |
| Est. API cost | — | $${cmp.estimatedApiCostUsd ?? 0} |

## Recommendation

${cmp.recommendation}

## Spot review

### Strongest (5)
${cmp.strongest.map((s) => `- [${s.artist} — ${s.title}](${s.studioUrl}) — ${s.reason}`).join("\n")}

### Weakest (5)
${cmp.weakest.map((s) => `- [${s.artist} — ${s.title}](${s.studioUrl}) — ${s.reason}`).join("\n")}

### Most improved cloud vs local (5)
${cmp.mostImproved.length ? cmp.mostImproved.map((s) => `- [${s.artist} — ${s.title}](${s.studioUrl}) — ${s.reason}`).join("\n") : "_Run both batches to compute improvement._"}
`;
}

export function formatDepartmentHealth(cmp: LocalVsCloudComparison): string {
  const top = (dept: string) =>
    cmp.coaching.filter((c) => c.department.toLowerCase().startsWith(dept.toLowerCase())).slice(0, 10);

  return `# Department Health — Training Batch

Generated: ${cmp.generatedAt}

## Confidence (avg)

${Object.entries(cmp.departmentConfidence)
  .map(([d, v]) => `- **${d}**: local ${v.local ?? "—"}% · cloud ${v.cloud ?? "—"}%`)
  .join("\n")}

## Top coaching issues (grouped)

### Collector
${top("Collector").map((i) => `- (${i.count}×) ${i.issue}`).join("\n") || "_None_"}

### Editor
${top("Editor").map((i) => `- (${i.count}×) ${i.issue}`).join("\n") || "_None_"}

### Director
${top("Director").map((i) => `- (${i.count}×) ${i.issue}`).join("\n") || "_None_"}

### Publisher
${top("Publisher").map((i) => `- (${i.count}×) ${i.issue}`).join("\n") || "_None_"}

### Renderer
${top("Renderer").map((i) => `- (${i.count}×) ${i.issue}`).join("\n") || "_None_"}
`;
}

export function formatTrainingSummary(
  selection: { selectedCount: number; targetCount: number; gapNote: string | null },
  cmp: LocalVsCloudComparison,
): string {
  return `# Training Summary — Overnight Run

Generated: ${cmp.generatedAt}

## Is Studio production-ready?

${cmp.cloud.publisherReadyCount >= selection.selectedCount * 0.8 ? "**Likely yes** for pilot-scale batches with cloud Editor." : "**Not yet** — publish-ready rate below 80% on this cohort."}

## Weakest department

${weakestDept(cmp)}

## Is cloud AI worth it?

${cmp.recommendation}

## Showcase candidates

${cmp.strongest.slice(0, 3).map((s) => `- ${s.artist} — ${s.title} (${s.rvtr})`).join("\n")}

## Next week focus

1. Coach ${weakestDept(cmp)} on top recurring issues (see DEPARTMENT_HEALTH.md)
2. ${selection.gapNote ? `Expand song pool — ${selection.gapNote}` : "Maintain 50-song cohort criteria"}
3. Spot-review weakest 5 packages in Training Mode
4. ${cmp.mostImproved.length ? "Compare cloud lift on improved songs before full cloud adoption" : "Re-run cloud batch with OPENAI_API_KEY set"}

## Selection

- Target: ${selection.targetCount} · Selected: ${selection.selectedCount}
${selection.gapNote ? `- Note: ${selection.gapNote}` : ""}
`;
}

function weakestDept(cmp: LocalVsCloudComparison): string {
  const entries = Object.entries(cmp.departmentConfidence);
  let worst = entries[0]?.[0] ?? "editor";
  let worstScore = 100;
  for (const [dept, v] of entries) {
    const score = Math.min(v.local ?? 100, v.cloud ?? 100);
    if (score < worstScore) {
      worstScore = score;
      worst = dept;
    }
  }
  return worst.charAt(0).toUpperCase() + worst.slice(1);
}
