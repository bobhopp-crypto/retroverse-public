#!/usr/bin/env npx tsx
/**
 * Scale test — process 25 songs and write summary report.
 *
 * Usage:
 *   npm run intelligence:scale-test
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadBatchStatus } from "../../lib/ops/intelligence/batch-status.ts";
import { runIntelligenceBatch } from "../../lib/ops/intelligence/batch-runner.ts";

const OUT_DIR = join(process.cwd(), "reports", "intelligence");

async function main() {
  console.log("\nRetroverse Intelligence Scale Test (25 songs)\n");

  const summary = await runIntelligenceBatch({
    limit: 25,
    resume: true,
    force: false,
  });

  const batch = await loadBatchStatus();
  const published = batch.jobs.filter((j) => j.status === "published");

  const totalSources = published.reduce((n, j) => n + (j.sources ?? 0), 0);
  const totalFacts = published.reduce((n, j) => n + (j.facts ?? 0), 0);
  const totalStories = published.reduce((n, j) => n + (j.stories ?? 0), 0);
  const totalArtifacts = published.reduce((n, j) => n + (j.artifacts ?? 0), 0);
  const avgRuntime =
    published.length > 0
      ? Math.round(
          published.reduce((n, j) => n + (j.runtimeMs ?? 0), 0) / published.length / 1000,
        )
      : 0;

  const lines = [
    "# Intelligence Scale Test Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Songs Processed | ${summary.processed} |`,
    `| Songs Published | ${summary.published} |`,
    `| Skipped (resume) | ${summary.skipped} |`,
    `| Failures | ${summary.failed} |`,
    `| Research Sources | ${totalSources} |`,
    `| Facts Extracted | ${totalFacts} |`,
    `| Stories Generated | ${totalStories} |`,
    `| Artifacts Generated | ${totalArtifacts} |`,
    `| Average Runtime | ${avgRuntime}s/song |`,
    "",
    "## Per-song",
    "",
    "| RVTR | Title | Status | Runtime | Sources | Facts | Stories |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const job of batch.jobs.slice(0, 25)) {
    lines.push(
      `| ${job.rvtr} | ${job.title.replace(/\|/g, "/")} | ${job.status} | ${job.runtimeMs ? `${Math.round(job.runtimeMs / 1000)}s` : "—"} | ${job.sources ?? "—"} | ${job.facts ?? "—"} | ${job.stories ?? "—"} |`,
    );
  }

  lines.push(
    "",
    "## Screenshots",
    "",
    "Run `npx tsx tools/intelligence/capture-song-sheets.ts --from-batch` with dev server on port 3000.",
    "",
  );

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "scale-test-report.md");
  const body = `${lines.join("\n")}\n`;
  await writeFile(outPath, body, "utf8");

  console.log(body);
  console.log(`\nWrote ${outPath}`);

  if (summary.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
