import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { discoverMarkdownFiles } from "./discover.ts";
import { buildHeuristicRecord } from "./heuristic-index.ts";
import { buildKnowledgeGraph, graphHighlights } from "./graph.ts";
import { enrichRecordWithOllama, synthesizeExecutiveSummary } from "./ollama-enrich.ts";
import { buildTimeline, renderTimelineMarkdown, timelineHighlights } from "./timeline.ts";
import type { MarkdownIndex, MarkdownRecord, ProgressState } from "./types.ts";

const ROOT = join(import.meta.dirname, "../..");
const OUT_DIR = join(ROOT, "docs/knowledge");

function parseArgs(argv: string[]) {
  let ollama = false;
  let ollamaLimit = Infinity;
  let resume = true;
  let phase: "all" | "discover" | "index" | "ollama" | "synthesize" = "all";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--ollama") ollama = true;
    else if (arg === "--no-resume") resume = false;
    else if (arg === "--ollama-limit" && argv[i + 1]) ollamaLimit = Number(argv[++i]);
    else if (arg === "--phase" && argv[i + 1]) phase = argv[++i] as typeof phase;
  }

  return { ollama, ollamaLimit, resume, phase };
}

async function loadProgress(): Promise<ProgressState | null> {
  try {
    return JSON.parse(await readFile(join(OUT_DIR, "progress.json"), "utf8")) as ProgressState;
  } catch {
    return null;
  }
}

async function saveProgress(state: ProgressState) {
  state.updatedAt = new Date().toISOString();
  await writeFile(join(OUT_DIR, "progress.json"), JSON.stringify(state, null, 2));
}

async function loadIndex(): Promise<MarkdownIndex | null> {
  try {
    return JSON.parse(await readFile(join(OUT_DIR, "markdown-index.json"), "utf8")) as MarkdownIndex;
  } catch {
    return null;
  }
}

function projectCounts(records: MarkdownRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of records) counts[r.primaryProject] = (counts[r.primaryProject] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
}

function topTopics(records: MarkdownRecord[]): string[] {
  const freq = new Map<string, number>();
  for (const r of records) {
    for (const t of r.majorTopics) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([t, n]) => `${t} (${n})`);
}

function sampleDecisions(records: MarkdownRecord[]): string[] {
  return records
    .flatMap((r) => r.importantDecisions.map((d) => `[${r.primaryProject}] ${d}`))
    .slice(0, 40);
}

function buildExecutiveSummaryHeuristic(
  records: MarkdownRecord[],
  events: ReturnType<typeof buildTimeline>,
  graph: ReturnType<typeof buildKnowledgeGraph>,
): string {
  const projects = projectCounts(records);
  const lines = [
    "# Retroverse Knowledge Department — Executive Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Documentary outline of the repository knowledge base (Phase 1 bootstrap).",
    "",
    "## Major Projects Discovered",
    "",
  ];

  for (const [project, count] of Object.entries(projects).slice(0, 20)) {
    lines.push(`- **${project}** — ${count} markdown documents`);
  }

  lines.push("", "## Recurring Themes", "");
  for (const t of topTopics(records).slice(0, 15)) lines.push(`- ${t}`);

  lines.push("", "## Architectural Evolution", "");
  const archDocs = records.filter(
    (r) =>
      /architecture|brain|roadmap|canon|rvtr|studio/i.test(r.relativePath) ||
      r.majorTopics.some((t) => /architecture|kernel|department|queue/i.test(t)),
  );
  for (const r of archDocs.slice(0, 12)) {
    lines.push(`- \`${r.relativePath}\` — ${r.summary.slice(0, 120)}`);
  }

  lines.push("", "## Abandoned or Paused Ideas", "");
  const paused = records.filter(
    (r) =>
      /retirement|deprecated|abandon|paused|legacy|old dk|migration/i.test(r.title + r.summary) ||
      r.openQuestions.some((q) => /migrate|retire|replace/i.test(q)),
  );
  for (const r of paused.slice(0, 10)) {
    lines.push(`- **${r.title}** (\`${r.relativePath}\`)`);
  }
  if (!paused.length) lines.push("- _(None clearly flagged — review DK Retirement and legacy audits)_");

  lines.push("", "## Recurring Problems", "");
  const problems = records.filter(
    (r) =>
      /audit|integrity|missing|gap|coverage|conflict|broken/i.test(r.relativePath) ||
      r.title.match(/audit|integrity|missing|gap/i),
  );
  const problemThemes = new Map<string, number>();
  for (const r of problems) {
    problemThemes.set(r.primaryProject, (problemThemes.get(r.primaryProject) ?? 0) + 1);
  }
  for (const [p, n] of [...problemThemes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    lines.push(`- **${p}** — ${n} audit/gap documents`);
  }

  lines.push("", "## Recurring Successes", "");
  const successes = records.filter(
    (r) =>
      /implementation|deliverable|validation|complete|phase.*report|sprint/i.test(r.relativePath) &&
      !/audit/i.test(r.relativePath),
  );
  for (const r of successes.slice(0, 12)) {
    lines.push(`- ${r.title} (\`${r.relativePath}\`)`);
  }

  lines.push("", "## Interesting Observations", "");
  lines.push(`- **${records.length}** markdown files indexed across the repository`);
  lines.push(`- **${events.length}** timeline events with evidence`);
  lines.push(`- **${graph.nodes.length}** knowledge graph nodes, **${graph.edges.length}** edges`);
  lines.push(
    `- Largest project clusters: ${Object.entries(projects)
      .slice(0, 5)
      .map(([p, c]) => `${p} (${c})`)
      .join(", ")}`,
  );
  const ollamaCount = records.filter((r) => r.enrichedByOllama).length;
  lines.push(`- Ollama-enriched records: ${ollamaCount}/${records.length}`);

  return lines.join("\n");
}

async function synthesizeDeliverables(records: MarkdownRecord[]) {
  const events = buildTimeline(records);
  const graph = buildKnowledgeGraph(records);
  const timelineMd = renderTimelineMarkdown(events);

  await writeFile(join(OUT_DIR, "timeline.md"), timelineMd);
  await writeFile(join(OUT_DIR, "knowledge-graph.json"), JSON.stringify(graph, null, 2));

  let execSummary = buildExecutiveSummaryHeuristic(records, events, graph);

  const ollamaSummary = await synthesizeExecutiveSummary({
    projectCounts: projectCounts(records),
    topTopics: topTopics(records),
    sampleDecisions: sampleDecisions(records),
    timelineHighlights: timelineHighlights(events),
    graphHighlights: graphHighlights(graph),
  });

  if (ollamaSummary.trim()) {
    execSummary += "\n\n---\n\n## Ollama Synthesis\n\n" + ollamaSummary;
  }

  await writeFile(join(OUT_DIR, "executive-summary.md"), execSummary);

  const inventory = records.map((r) => ({
    path: r.relativePath,
    title: r.title,
    project: r.primaryProject,
    modified: r.modifiedAt,
    words: r.wordCount,
    ollama: r.enrichedByOllama,
  }));
  await writeFile(join(OUT_DIR, "inventory.md"), [
    "# Markdown Inventory",
    "",
    `**Total:** ${records.length} files`,
    "",
    "| Path | Title | Project | Modified | Words | Ollama |",
    "|------|-------|---------|----------|-------|--------|",
    ...inventory.map(
      (i) =>
        `| \`${i.path}\` | ${i.title.replace(/\|/g, "/")} | ${i.project} | ${i.modified?.slice(0, 10) ?? "—"} | ${i.words} | ${i.ollama ? "✓" : ""} |`,
    ),
  ].join("\n"));
}

async function main() {
  const startMs = Date.now();
  const opts = parseArgs(process.argv.slice(2));

  await mkdir(OUT_DIR, { recursive: true });

  let progress: ProgressState = (opts.resume ? await loadProgress() : null) ?? {
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phase: "discover",
    discoveredPaths: [],
    indexedPaths: [],
    ollamaEnrichedPaths: [],
    skippedPaths: [],
    errors: [],
  };

  console.log("\nRetroverse Knowledge Department — Bootstrap");
  console.log(`  ollama=${opts.ollama} limit=${opts.ollamaLimit === Infinity ? "ALL" : opts.ollamaLimit}`);
  console.log(`  resume=${opts.resume} phase=${opts.phase}`);
  console.log("");

  // Phase 1 — Discover
  if (opts.phase === "all" || opts.phase === "discover" || progress.discoveredPaths.length === 0) {
    progress.phase = "discover";
    progress.discoveredPaths = await discoverMarkdownFiles(ROOT);
    await saveProgress(progress);
    console.log(`Phase 1 — Discovered ${progress.discoveredPaths.length} markdown files`);
  }

  const allPaths = new Set(progress.discoveredPaths);
  let records: MarkdownRecord[] = [];

  // Phase 2 — Heuristic Index
  if (opts.phase === "all" || opts.phase === "index" || opts.phase === "ollama") {
    progress.phase = "index";
    const existing = opts.resume ? await loadIndex() : null;
    const recordMap = new Map<string, MarkdownRecord>(
      (existing?.records ?? []).map((r) => [r.relativePath, r]),
    );

    let indexed = 0;
    for (const relPath of progress.discoveredPaths) {
      if (recordMap.has(relPath) && recordMap.get(relPath)!.wordCount > 0) {
        indexed++;
        continue;
      }
      try {
        const record = await buildHeuristicRecord(ROOT, relPath, allPaths);
        recordMap.set(relPath, record);
        if (!progress.indexedPaths.includes(relPath)) progress.indexedPaths.push(relPath);
        indexed++;
        if (indexed % 25 === 0) {
          console.log(`  indexed ${indexed}/${progress.discoveredPaths.length}...`);
          await writeFile(
            join(OUT_DIR, "markdown-index.json"),
            JSON.stringify(
              {
                generatedAt: new Date().toISOString(),
                schemaVersion: 1,
                totalFiles: progress.discoveredPaths.length,
                processedFiles: recordMap.size,
                ollamaEnriched: [...recordMap.values()].filter((r) => r.enrichedByOllama).length,
                skippedFiles: [...recordMap.values()]
                  .filter((r) => r.skippedReason)
                  .map((r) => r.relativePath),
                records: [...recordMap.values()].sort((a, b) =>
                  a.relativePath.localeCompare(b.relativePath),
                ),
              } satisfies MarkdownIndex,
              null,
              2,
            ),
          );
          await saveProgress(progress);
        }
      } catch (err) {
        progress.errors.push({
          path: relPath,
          error: err instanceof Error ? err.message : String(err),
          at: new Date().toISOString(),
        });
      }
    }

    records = [...recordMap.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    progress.indexedPaths = records.map((r) => r.relativePath);
    await saveProgress(progress);
    console.log(`Phase 2 — Indexed ${records.length} files (heuristic)`);
  } else {
    const idx = await loadIndex();
    records = idx?.records ?? [];
  }

  // Phase 2b — Ollama enrichment
  if (opts.ollama && (opts.phase === "all" || opts.phase === "ollama")) {
    progress.phase = "ollama";
    const toEnrich = records.filter((r) => !r.enrichedByOllama && !r.skippedReason);
    let done = 0;
    const limit = opts.ollamaLimit;

    for (const record of toEnrich) {
      if (done >= limit) break;
      process.stdout.write(`  ollama: ${record.relativePath.slice(0, 60)}... `);
      try {
        const enriched = await enrichRecordWithOllama(ROOT, record);
        const idx = records.findIndex((r) => r.relativePath === record.relativePath);
        if (idx >= 0) records[idx] = enriched;
        if (enriched.enrichedByOllama) {
          progress.ollamaEnrichedPaths.push(record.relativePath);
          console.log("ok");
        } else {
          console.log("skip");
        }
      } catch (err) {
        console.log("fail");
        progress.errors.push({
          path: record.relativePath,
          error: err instanceof Error ? err.message : String(err),
          at: new Date().toISOString(),
        });
      }
      done++;
      if (done % 5 === 0) {
        await writeFile(
          join(OUT_DIR, "markdown-index.json"),
          JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              schemaVersion: 1,
              totalFiles: progress.discoveredPaths.length,
              processedFiles: records.length,
              ollamaEnriched: records.filter((r) => r.enrichedByOllama).length,
              skippedFiles: records.filter((r) => r.skippedReason).map((r) => r.relativePath),
              records,
            } satisfies MarkdownIndex,
            null,
            2,
          ),
        );
        await saveProgress(progress);
      }
    }
    console.log(`Phase 2b — Ollama enriched ${progress.ollamaEnrichedPaths.length} files`);
  }

  // Persist index
  const index: MarkdownIndex = {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    totalFiles: progress.discoveredPaths.length,
    processedFiles: records.length,
    ollamaEnriched: records.filter((r) => r.enrichedByOllama).length,
    skippedFiles: records.filter((r) => r.skippedReason).map((r) => r.relativePath),
    records,
  };
  await writeFile(join(OUT_DIR, "markdown-index.json"), JSON.stringify(index, null, 2));

  // Phases 3-5 — Synthesize (also after ollama pass so summaries stay current)
  if (opts.phase === "all" || opts.phase === "synthesize" || (opts.ollama && opts.phase === "ollama")) {
    progress.phase = "timeline";
    await synthesizeDeliverables(records);
    progress.phase = "complete";
    await saveProgress(progress);
    console.log("Phases 3-5 — timeline, graph, executive summary written");
  }

  const elapsed = Math.round((Date.now() - startMs) / 1000);
  const report = {
    markdownFilesProcessed: records.length,
    timeRequiredSeconds: elapsed,
    outputsCreated: [
      "docs/knowledge/markdown-index.json",
      "docs/knowledge/inventory.md",
      "docs/knowledge/timeline.md",
      "docs/knowledge/knowledge-graph.json",
      "docs/knowledge/executive-summary.md",
      "docs/knowledge/progress.json",
    ],
    skippedFiles: index.skippedFiles,
    ollamaEnriched: index.ollamaEnriched,
    errors: progress.errors.length,
  };

  await writeFile(join(OUT_DIR, "completion-report.json"), JSON.stringify(report, null, 2));

  console.log("\n--- Completion ---");
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nOutputs in docs/knowledge/ (${elapsed}s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
