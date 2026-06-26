#!/usr/bin/env node
/**
 * Retroverse Studio Alpha — Batch 001 production run.
 * Collector → Editor draft for ten songs; writes reports/studio-alpha/batch-001/
 *
 * Usage: npm run research:studio-alpha:batch-001
 */
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";

import { inspectQuery } from "../../lib/inspect/pg.ts";
import type { ResolvedCollectorSong } from "../../lib/ops/studio/collector/pilot-songs.ts";
import { runCollectorForSong } from "../../lib/ops/studio/collector/run-collector.ts";
import { COLLECTOR_STAGE_TOTAL } from "../../lib/ops/studio/collector/types.ts";
import type { CollectorPackage } from "../../lib/ops/studio/collector/package-contract.ts";
import { distillCollectorPackage } from "../../lib/ops/studio/editor/distill.ts";
import { editorOutputPath } from "../../lib/ops/studio/editor/paths.ts";
import { saveEditorStory } from "../../lib/ops/studio/editor/store.ts";
import type { EditorStoryPackage } from "../../lib/ops/studio/editor/types.ts";

import { approvedFactCount, confidenceLabel } from "../../lib/ops/studio/collector/package-finalize.ts";
import { attachEditorialReview } from "../../lib/ops/studio/editor/editorial-review.ts";
import { rewriteStoryFromAcceptedFacts } from "../../lib/ops/studio/editor/rewrite.ts";

const IS_A2 = process.argv.includes("--a2");
const IS_RERUN = process.argv.includes("--rerun") || IS_A2;
const BATCH_ID = IS_A2 ? "batch-001-a2" : IS_RERUN ? "batch-001-rerun" : "batch-001";
const REPORT_DIR = join(process.cwd(), "reports", "studio-alpha", BATCH_ID);
const BEFORE_RESULTS_PATH = join(
  process.cwd(),
  "reports/studio-alpha",
  IS_A2 ? "batch-001-rerun/results.json" : "batch-001/results.json",
);

const BATCH_SONGS: Array<{ rvtr: string; artist: string; title: string }> = [
  { rvtr: "RVTR843599", artist: "Danzig", title: "Mother" },
  { rvtr: "RVTR720668", artist: "Squeeze", title: "Tempted" },
  { rvtr: "RVTR964817", artist: "Erasure", title: "Chains Of Love" },
  { rvtr: "RVTR016328", artist: "ABBA", title: "Mamma Mia" },
  { rvtr: "RVTR763274", artist: "Vanilla Ice", title: "Ice Ice Baby" },
  { rvtr: "RVTR558691", artist: "La Bouche", title: "Be My Lover" },
  { rvtr: "RVTR164626", artist: "Johnny Cash", title: "I Walk the Line" },
  { rvtr: "RVTR935083", artist: "Roger Waters & Sinéad O'Connor", title: "Mother" },
  { rvtr: "RVTR634395", artist: "Adriano Celentano", title: "Prisencolinensinainciusol" },
  { rvtr: "RVTR665372", artist: "Soho", title: "Hippychick" },
];

type Observation = { at: string; rvtr: string; area: string; note: string };

type SongResult = {
  rvtr: string;
  artist: string;
  title: string;
  status: "completed" | "failed";
  error: string | null;
  collectorMs: number;
  editorMs: number;
  researchQuality: number | null;
  storyQuality: string;
  approvedFacts: number;
  approvedFactRatio: number;
  performancesDetected: number;
  performancesWritten: number;
  visualAssets: number;
  missingAreas: string[];
  confidence: string;
  collectorConfidenceOverall: number | null;
  patronValue: number | null;
  storyQualityScore: string | null;
  editorialRecommendation: string | null;
  storyAngle: string | null;
  observations: Observation[];
};

async function loadVdjPathFromReadiness(rvtr: string): Promise<string | null> {
  try {
    const csv = await readFile(
      join(process.cwd(), "reports/package-priority-audit/owned-videos-readiness.csv"),
      "utf8",
    );
    for (const line of csv.trim().split("\n").slice(1)) {
      const [rowRvtr, , , , , , , , , , filePath] = line.split(",");
      if (rowRvtr?.trim().toUpperCase() === rvtr.trim().toUpperCase()) {
        return filePath?.trim() ?? null;
      }
    }
  } catch {
    /* optional */
  }
  return null;
}

async function resolveBatchSong(
  entry: (typeof BATCH_SONGS)[number],
): Promise<ResolvedCollectorSong> {
  const rvtr = entry.rvtr.trim().toUpperCase();
  let artist = entry.artist;
  let title = entry.title;
  let graphLinked = true;

  try {
    const rows = await inspectQuery<{
      canonical_artist_name: string;
      canonical_title: string;
    }>(
      `
      SELECT canonical_artist_name, canonical_title
      FROM canonical_track_display
      WHERE upper(trim(track_id)) = $1
      LIMIT 1
      `,
      [rvtr],
    );
    if (rows[0]) {
      artist = rows[0].canonical_artist_name || artist;
      title = rows[0].canonical_title || title;
    }
  } catch {
    graphLinked = false;
  }

  const vdjFilePath = await loadVdjPathFromReadiness(rvtr);

  return {
    rvtr,
    artist,
    title,
    graphLinked,
    vdjFilePath,
    performanceHints: [],
    notes: [`Studio Alpha ${BATCH_ID}`],
  };
}

function editorialConfidence(story: EditorStoryPackage, collector: CollectorPackage): string {
  if (collector.confidence) {
    return confidenceLabel(collector.confidence.overall);
  }
  const facts = story.workspace.candidateFacts.filter((f) => f.status === "accepted").length;
  const storyLen = story.story.fullStory.trim().length;
  if (facts >= 4 && storyLen >= 400) return "Moderate";
  if (facts >= 2 && storyLen >= 200) return "Developing";
  return "Early";
}

function storyQualityLabel(story: EditorStoryPackage, collector: CollectorPackage): string {
  const hook = story.story.hook.trim().length;
  const full = story.story.fullStory.trim().length;
  const ideas = story.workspace.storyIdeas.length;
  const facts = story.workspace.candidateFacts.length;
  if (full >= 500 && hook >= 40 && facts >= 5) return "adequate";
  if (full >= 250 && facts >= 3) return "thin";
  if (collector.researchQuality < 40) return "weak (low research)";
  return "draft-only";
}

function collectObservations(
  rvtr: string,
  collector: CollectorPackage,
  story: EditorStoryPackage,
): Observation[] {
  const at = new Date().toISOString();
  const out: Observation[] = [];

  if (collector.researchQuality < 50) {
    out.push({
      at,
      rvtr,
      area: "collector",
      note: `Research quality ${collector.researchQuality}% — Wikipedia or graph gaps likely limited fact yield.`,
    });
  }

  if ((collector.performances?.length ?? 0) === 0) {
    out.push({
      at,
      rvtr,
      area: "performance_detection",
      note: "No performances written to collector.json.",
    });
  }

  if (approvedFactCount(collector.candidateFacts) === 0) {
    out.push({
      at,
      rvtr,
      area: "fact_promotion",
      note: "Zero approved facts after Collector promotion.",
    });
  }

  if (!collector.storySeed?.whyItMatters) {
    out.push({
      at,
      rvtr,
      area: "story_seed",
      note: "Collector story seed missing.",
    });
  }

  if (story.workspace.candidateFacts.every((f) => f.status === "pending")) {
    out.push({
      at,
      rvtr,
      area: "editor",
      note: "All candidate facts left pending in Editor — Collector promotion may not have reached distill.",
    });
  }

  if (collector.visualAssets.extraction.extractedCount === 0) {
    out.push({
      at,
      rvtr,
      area: "visual_extraction",
      note: collector.visualAssets.extraction.skipReason
        ? `Visual extraction skipped: ${collector.visualAssets.extraction.skipReason}`
        : "Visual extraction produced zero frames.",
    });
  }

  if (story.story.fullStory.trim().length < 200) {
    out.push({
      at,
      rvtr,
      area: "editor",
      note: "Editor fullStory under 200 chars — distill had insufficient approved facts.",
    });
  }

  if (story.workspace.candidateFacts.every((f) => f.status === "pending")) {
    out.push({
      at,
      rvtr,
      area: "editor",
      note: "Editor received zero accepted facts from Collector handoff.",
    });
  }

  if (collector.missingAreas.length >= 4) {
    out.push({
      at,
      rvtr,
      area: "collector",
      note: `Missing areas (${collector.missingAreas.length}): ${collector.missingAreas.slice(0, 3).join("; ")}`,
    });
  }

  return out;
}

function buildBatchSummary(results: SongResult[]) {
  const completed = results.filter((r) => r.status === "completed");
  const failed = results.filter((r) => r.status === "failed");
  const avgCollector =
    completed.length > 0
      ? Math.round(completed.reduce((s, r) => s + r.collectorMs, 0) / completed.length)
      : 0;
  const avgEditor =
    completed.length > 0
      ? Math.round(completed.reduce((s, r) => s + r.editorMs, 0) / completed.length)
      : 0;

  return {
    batchId: BATCH_ID,
    generatedAt: new Date().toISOString(),
    totalSongs: results.length,
    completed: completed.length,
    failed: failed.length,
    avgCollectorMs: avgCollector,
    avgEditorMs: avgEditor,
    avgCollectorSec: Math.round(avgCollector / 100) / 10,
    avgEditorSec: Math.round(avgEditor / 100) / 10,
  };
}

function mdBatchSummary(summary: ReturnType<typeof buildBatchSummary>): string {
  return `# Studio Alpha Batch 001 — Summary

Generated: ${summary.generatedAt}

| Metric | Value |
|--------|-------|
| Total songs | ${summary.totalSongs} |
| Completed | ${summary.completed} |
| Failed | ${summary.failed} |
| Avg Collector time | ${summary.avgCollectorSec}s |
| Avg Editor generation time | ${summary.avgEditorSec}s |
`;
}

function mdPerSong(results: SongResult[]): string {
  const lines = ["# Per-Song Summary", ""];
  for (const r of results) {
    lines.push(`## ${r.artist} — ${r.title} (${r.rvtr})`);
    lines.push("");
    lines.push(`- **Status:** ${r.status}${r.error ? ` — ${r.error}` : ""}`);
    lines.push(`- **Collector time:** ${(r.collectorMs / 1000).toFixed(1)}s`);
    lines.push(`- **Editor time:** ${(r.editorMs / 1000).toFixed(1)}s`);
    lines.push(`- **Research quality:** ${r.researchQuality ?? "—"}%`);
    lines.push(`- **Story quality:** ${r.storyQuality}`);
    lines.push(`- **Approved facts (Collector):** ${r.approvedFacts} (${r.approvedFactRatio}%)`);
    lines.push(`- **Performances written:** ${r.performancesWritten} (detected: ${r.performancesDetected})`);
    lines.push(`- **Visual assets:** ${r.visualAssets}`);
    lines.push(`- **Confidence:** ${r.confidence}`);
    lines.push(`- **Collector package:** \`data/ops/intelligence/research-department/${r.rvtr}/collector.json\``);
    lines.push(`- **Editor package:** \`data/ops/intelligence/research-department/${r.rvtr}/editor.json\``);
    lines.push("");
    lines.push("### Missing information");
    lines.push("");
    if (r.missingAreas.length === 0) {
      lines.push("- None noted");
    } else {
      for (const gap of r.missingAreas) lines.push(`- ${gap}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function mdObservations(results: SongResult[]): string {
  const all = results.flatMap((r) => r.observations);
  const lines = [
    "# Studio Observations",
    "",
    "Development notes from Batch 001 — not patron-facing.",
    "",
  ];

  const byArea = new Map<string, Observation[]>();
  for (const obs of all) {
    const list = byArea.get(obs.area) ?? [];
    list.push(obs);
    byArea.set(obs.area, list);
  }

  for (const [area, obs] of byArea) {
    lines.push(`## ${area.replace(/_/g, " ")}`);
    lines.push("");
    for (const o of obs) {
      lines.push(`- **${o.rvtr}:** ${o.note}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function mdWorkflowAnalysis(results: SongResult[]): string {
  const completed = results.filter((r) => r.status === "completed");
  const issues: string[] = [];
  const wins: string[] = [];

  const zeroVisual = completed.filter((r) => r.visualAssets === 0).length;
  if (zeroVisual > 0) {
    issues.push(`Visual extraction empty on ${zeroVisual}/${completed.length} songs — frame pipeline or skip logic needs review.`);
  }

  const zeroPerf = completed.filter((r) => r.performancesDetected === 0).length;
  if (zeroPerf > 0) {
    issues.push(`Performance detection returned zero on ${zeroPerf} songs — live/studio variant grouping may be too strict.`);
  }

  const zeroAccepted = completed.filter((r) => r.approvedFacts === 0).length;
  if (zeroAccepted === completed.length) {
    issues.push("Collector fact promotion produced zero approved facts — Editor has nothing to promote.");
  } else if (zeroAccepted > 0) {
    issues.push(`${zeroAccepted} songs still have zero approved facts after Sprint A1 promotion.`);
  }

  const lowPerf = completed.filter((r) => r.performancesWritten === 0).length;
  if (lowPerf > 0) {
    issues.push(`Performances not written to disk on ${lowPerf} songs.`);
  }

  const thinStories = completed.filter((r) => r.storyQuality.includes("thin") || r.storyQuality.includes("weak")).length;
  if (thinStories > 0) {
    issues.push(`${thinStories} songs produced thin or weak first-draft stories — research-to-narrative gap visible at scale.`);
  }

  const lowResearch = completed.filter((r) => (r.researchQuality ?? 0) < 55).length;
  if (lowResearch > 0) {
    issues.push(`Collector research quality below 55% on ${lowResearch} songs — obscure titles or sparse Wikipedia coverage.`);
  }

  const avgCollector = completed.reduce((s, r) => s + r.collectorMs, 0) / (completed.length || 1);
  if (avgCollector > 120_000) {
    issues.push(`Average Collector runtime ${(avgCollector / 1000).toFixed(0)}s — visual extraction dominates batch throughput.`);
  }

  const goodResearch = completed.filter((r) => (r.researchQuality ?? 0) >= 70).length;
  if (goodResearch > 0) {
    wins.push(`${goodResearch} songs hit ≥70% research quality — graph + Wikipedia pipeline sufficient for mainstream catalog entries.`);
  }

  const withVisual = completed.filter((r) => r.visualAssets >= 4).length;
  if (withVisual > 0) {
    wins.push(`Visual extraction produced ≥4 frames on ${withVisual} songs — image board seeding works when video path resolves.`);
  }

  const fastEditor = completed.every((r) => r.editorMs < 5000);
  if (fastEditor && completed.length > 0) {
    wins.push("Editor distill completes in under 5s per song — editorial draft generation is not the bottleneck.");
  }

  const noFailures = results.every((r) => r.status === "completed");
  if (noFailures) {
    wins.push("Full batch completed without pipeline abort — Collector stages resilient to partial data.");
  }

  const chartSongs = completed.filter((r) => r.researchQuality && r.researchQuality >= 65).length;
  if (chartSongs >= 5) {
    wins.push("Majority of batch had chart-linked graph identity — canonical resolution stable across genres.");
  }

  while (issues.length < 5) issues.push("(See per-song observations for additional issues.)");
  while (wins.length < 5) wins.push("(Partial batch — additional wins pending full run.)");

  return `# Workflow Analysis

## Top workflow issues

${issues.slice(0, 5).map((i, n) => `${n + 1}. ${i}`).join("\n")}

## Top things that worked better than expected

${wins.slice(0, 5).map((w, n) => `${n + 1}. ${w}`).join("\n")}

## Batch 002 recommendation

Prioritize songs with **existing graph chart history + single owned video** to isolate Editor story quality from Collector research gaps. Include at least 2 songs with **multiple VDJ performance cuts** (e.g. Rush Tom Sawyer) to stress-test performance detection and image board. Keep batch size at 10.
`;
}

async function buildComparisonReport(afterResults: SongResult[]): Promise<string> {
  let beforeResults: SongResult[] = [];
  try {
    const raw = JSON.parse(await readFile(BEFORE_RESULTS_PATH, "utf8")) as {
      results: SongResult[];
    };
    beforeResults = raw.results;
  } catch {
    return "# Batch 001 Comparison\n\nBefore results not found at `reports/studio-alpha/batch-001/results.json`.\n";
  }

  const beforeByRvtr = new Map(beforeResults.map((r) => [r.rvtr, r]));
  const lines = [
    "# Studio Alpha Batch 001 — Before / After (Sprint A1)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Aggregate comparison",
    "",
    "| Metric | Before | After | Delta |",
    "|--------|--------|-------|-------|",
  ];

  function avgAfter(key: keyof SongResult): number {
    const vals = afterResults
      .filter((r) => r.status === "completed")
      .map((r) => r[key])
      .filter((v): v is number => typeof v === "number");
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  function avgBefore(key: keyof SongResult): number {
    const vals = beforeResults
      .filter((r) => r.status === "completed")
      .map((r) => r[key])
      .filter((v): v is number => typeof v === "number");
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  const metrics: Array<[string, keyof SongResult]> = [
    ["Avg approved facts", "approvedFacts"],
    ["Avg approved fact %", "approvedFactRatio"],
    ["Avg performances written", "performancesWritten"],
    ["Avg visual assets", "visualAssets"],
    ["Avg research quality", "researchQuality"],
    ...(afterResults[0]?.patronValue != null
      ? ([["Avg Patron Value", "patronValue"]] as Array<[string, keyof SongResult]>)
      : []),
  ];

  for (const [label, key] of metrics) {
    const b = avgBefore(key);
    const a = avgAfter(key);
    lines.push(`| ${label} | ${b} | ${a} | ${a - b >= 0 ? "+" : ""}${a - b} |`);
  }

  const beforeLowConf = beforeResults.filter((r) => r.confidence === "low").length;
  const afterEarly = afterResults.filter((r) => r.confidence === "Early").length;
  lines.push(`| Weakest confidence bucket | ${beforeLowConf} (low) | ${afterEarly} (Early) | — |`);
  lines.push("");
  lines.push("## Per-song comparison");
  lines.push("");
  lines.push("| RVTR | Artist | Patron Value | Story | Recommendation | Angle |");
  lines.push("|------|--------|--------------|-------|----------------|-------|");

  for (const after of afterResults) {
    const before = beforeByRvtr.get(after.rvtr);
    const pvBefore = "—";
    const pvAfter = after.patronValue != null ? String(after.patronValue) : "—";
    lines.push(
      `| ${after.rvtr} | ${after.artist} | ${pvBefore}→${pvAfter} | ${before?.storyQuality ?? "—"}→${after.storyQuality} | ${after.editorialRecommendation ?? "—"} | ${after.storyAngle ?? "—"} |`,
    );
  }

  lines.push("");
  lines.push("## Regressions");
  lines.push("");
  const regressions: string[] = [];
  for (const after of afterResults) {
    const before = beforeByRvtr.get(after.rvtr);
    if (!before) continue;
    if ((after.visualAssets ?? 0) < (before.visualAssets ?? 0)) {
      regressions.push(`${after.rvtr}: visual assets ${before.visualAssets} → ${after.visualAssets}`);
    }
  }
  lines.push(regressions.length ? regressions.map((r) => `- ${r}`).join("\n") : "- None observed");

  lines.push("");
  lines.push("## Improvements");
  lines.push("");
  const improvements: string[] = [];
  for (const after of afterResults) {
    const before = beforeByRvtr.get(after.rvtr);
    if (!before) continue;
    if (after.performancesWritten > (before.performancesDetected ?? 0)) {
      improvements.push(`${after.rvtr}: performances written (${after.performancesWritten})`);
    }
    if (after.approvedFacts > ((before as SongResult & { acceptedFacts?: number }).acceptedFacts ?? 0)) {
      improvements.push(`${after.rvtr}: approved facts → ${after.approvedFacts}`);
    }
  }
  lines.push(improvements.length ? improvements.map((i) => `- ${i}`).join("\n") : "- See aggregate table");

  return lines.join("\n");
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });
  const results: SongResult[] = [];
  const allObservations: Observation[] = [];

  console.log(`\n[Studio Alpha] ${BATCH_ID} — ${BATCH_SONGS.length} songs\n`);

  for (let i = 0; i < BATCH_SONGS.length; i++) {
    const entry = BATCH_SONGS[i]!;
    const resolved = await resolveBatchSong(entry);
    const songObs: Observation[] = [];

    console.log(`\n[${i + 1}/${BATCH_SONGS.length}] ${resolved.artist} — ${resolved.title}`);
    console.log(`  RVTR: ${resolved.rvtr}`);

    let collectorPkg: CollectorPackage | null = null;
    let editorStory: EditorStoryPackage | null = null;
    let collectorMs = 0;
    let editorMs = 0;

    try {
      const cStart = Date.now();
      collectorPkg = await runCollectorForSong(resolved, {
        onStage: (stageId, label, stageIndex) => {
          console.log(`  [Collector ${stageIndex}/${COLLECTOR_STAGE_TOTAL}] ${label}`);
        },
      });
      collectorMs = Date.now() - cStart;
      console.log(`  ✓ Collector ${collectorPkg.researchQuality}% · ${collectorMs}ms`);

      // Fresh editor draft (overwrite any prior)
      try {
        await rm(editorOutputPath(resolved.rvtr), { force: true });
      } catch {
        /* ignore */
      }

      const eStart = Date.now();
      editorStory = distillCollectorPackage(collectorPkg);
      if (IS_A2) {
        const rewritten = await rewriteStoryFromAcceptedFacts(collectorPkg, editorStory);
        editorStory = rewritten.story;
      }
      editorStory = attachEditorialReview(collectorPkg, editorStory);
      await saveEditorStory(editorStory);
      editorMs = Date.now() - eStart;
      console.log(`  ✓ Editor draft${IS_A2 ? " + rewrite" : ""} · ${editorMs}ms`);

      songObs.push(...collectObservations(resolved.rvtr, collectorPkg, editorStory));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Failed: ${message}`);
      songObs.push({
        at: new Date().toISOString(),
        rvtr: resolved.rvtr,
        area: "pipeline",
        note: `Pipeline failed: ${message}`,
      });
      results.push({
        rvtr: resolved.rvtr,
        artist: resolved.artist,
        title: resolved.title,
        status: "failed",
        error: message,
        collectorMs,
        editorMs,
        researchQuality: collectorPkg?.researchQuality ?? null,
        storyQuality: "—",
        approvedFacts: 0,
        approvedFactRatio: 0,
        performancesDetected: collectorPkg?.videoPerformance?.items?.length ?? 0,
        performancesWritten: collectorPkg?.performances?.length ?? 0,
        visualAssets: collectorPkg?.visualAssets.extraction.extractedCount ?? 0,
        missingAreas: collectorPkg?.missingAreas ?? [],
        confidence: "—",
        collectorConfidenceOverall: collectorPkg?.confidence?.overall ?? null,
        observations: songObs,
      });
      allObservations.push(...songObs);
      continue;
    }

    const collectorApproved = approvedFactCount(collectorPkg!.candidateFacts);
    const editorAccepted = editorStory!.workspace.candidateFacts.filter(
      (f) => f.status === "accepted",
    ).length;
    const perfWritten = collectorPkg!.performances?.length ?? 0;

    const review = editorStory!.workspace.editorialReview;

    results.push({
      rvtr: resolved.rvtr,
      artist: resolved.artist,
      title: resolved.title,
      status: "completed",
      error: null,
      collectorMs,
      editorMs,
      researchQuality: collectorPkg!.researchQuality,
      storyQuality: review?.storyQuality ?? storyQualityLabel(editorStory!, collectorPkg!),
      approvedFacts: collectorApproved,
      approvedFactRatio:
        collectorPkg!.candidateFacts.length > 0
          ? Math.round((collectorApproved / collectorPkg!.candidateFacts.length) * 100)
          : 0,
      performancesDetected: collectorPkg!.videoPerformance?.items?.filter((i) => i.isVideo).length ?? 0,
      performancesWritten: perfWritten,
      visualAssets: collectorPkg!.visualAssets.extraction.extractedCount,
      missingAreas: collectorPkg!.missingAreas,
      confidence: editorialConfidence(editorStory!, collectorPkg!),
      collectorConfidenceOverall: collectorPkg!.confidence?.overall ?? null,
      patronValue: review?.patronValue ?? null,
      storyQualityScore: review?.storyQuality ?? null,
      editorialRecommendation: review?.recommendationLabel ?? null,
      storyAngle: editorStory!.meta.storyAngle,
      observations: songObs,
    });
    allObservations.push(...songObs);
  }

  const summary = buildBatchSummary(results);
  const summaryMd = mdBatchSummary(summary);
  const perSongMd = mdPerSong(results);
  const observationsMd = mdObservations(results);
  const analysisMd = mdWorkflowAnalysis(results);

  await writeFile(join(REPORT_DIR, "BATCH-SUMMARY.md"), summaryMd, "utf8");
  await writeFile(join(REPORT_DIR, "PER-SONG.md"), perSongMd, "utf8");
  await writeFile(join(REPORT_DIR, "OBSERVATIONS.md"), observationsMd, "utf8");
  await writeFile(join(REPORT_DIR, "WORKFLOW-ANALYSIS.md"), analysisMd, "utf8");
  await writeFile(
    join(REPORT_DIR, "results.json"),
    `${JSON.stringify({ summary, results, observations: allObservations }, null, 2)}\n`,
    "utf8",
  );

  if (IS_RERUN || IS_A2) {
    const comparisonMd = await buildComparisonReport(results);
    await writeFile(join(REPORT_DIR, "COMPARISON.md"), comparisonMd, "utf8");
  }

  console.log(`\n[Studio Alpha] ${BATCH_ID} complete`);
  console.log(`  Completed: ${summary.completed}/${summary.totalSongs}`);
  console.log(`  Failed: ${summary.failed}`);
  console.log(`  Report: reports/studio-alpha/${BATCH_ID}/`);
}

main().catch((err) => {
  console.error("[Studio Alpha] Batch failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
