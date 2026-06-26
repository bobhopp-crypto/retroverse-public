#!/usr/bin/env node
/**
 * Sprint A2 — re-distill + rewrite + editorial review on existing Batch 001 packages.
 * Usage: npm run research:studio-alpha:batch-001-a2
 */
require("../finance/preload-server-only.cjs");

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { loadCollectorPackage } from "../../lib/ops/studio/collector/store.ts";
import { distillCollectorPackage } from "../../lib/ops/studio/editor/distill.ts";
import { attachEditorialReview } from "../../lib/ops/studio/editor/editorial-review.ts";
import { rewriteStoryFromAcceptedFacts } from "../../lib/ops/studio/editor/rewrite.ts";
import { saveEditorStory } from "../../lib/ops/studio/editor/store.ts";
import { storyAngleLabel } from "../../lib/ops/studio/editor/editorial-constants.ts";

const BATCH_SONGS = [
  "RVTR843599",
  "RVTR720668",
  "RVTR964817",
  "RVTR016328",
  "RVTR763274",
  "RVTR558691",
  "RVTR164626",
  "RVTR935083",
  "RVTR634395",
  "RVTR665372",
];

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/batch-001-a2");
const BEFORE_PATH = join(process.cwd(), "reports/studio-alpha/batch-001-rerun/results.json");

type Row = {
  rvtr: string;
  artist: string;
  title: string;
  patronValue: number;
  storyQuality: string;
  visualQuality: number;
  performanceQuality: number;
  recommendation: string;
  storyAngle: string;
  performanceTitle: string | null;
};

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });
  const rows: Row[] = [];

  for (const rvtr of BATCH_SONGS) {
    const pkg = await loadCollectorPackage(rvtr);
    if (!pkg) {
      console.error(`Missing collector package: ${rvtr}`);
      continue;
    }
    let story = distillCollectorPackage(pkg);
    story = (await rewriteStoryFromAcceptedFacts(pkg, story)).story;
    story = attachEditorialReview(pkg, story);
    await saveEditorStory(story);

    const review = story.workspace.editorialReview!;
    const perf = pkg.performances?.find((p) => p.id === story.approved.performanceId);
    rows.push({
      rvtr,
      artist: pkg.artist,
      title: pkg.title,
      patronValue: review.patronValue,
      storyQuality: review.storyQuality,
      visualQuality: review.visualQuality,
      performanceQuality: review.performanceQuality,
      recommendation: review.recommendationLabel,
      storyAngle: storyAngleLabel(story.meta.storyAngle, story.meta.storyAngleCustom),
      performanceTitle: perf?.title ?? null,
    });
    console.log(`${rvtr} · Patron ${review.patronValue}/10 · ${review.recommendationLabel}`);
  }

  rows.sort((a, b) => b.patronValue - a.patronValue);

  let beforeRows: Array<{ rvtr: string; storyQuality?: string }> = [];
  try {
    const before = JSON.parse(await readFile(BEFORE_PATH, "utf8")) as {
      results: Array<{ rvtr: string; storyQuality?: string }>;
    };
    beforeRows = before.results;
  } catch {
    /* optional */
  }

  const lines = [
    "# Studio Alpha Batch 001 — Sprint A2 Comparison",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Aggregate",
    "",
    `| Metric | A1 Rerun | A2 |`,
    `|--------|----------|-----|`,
    `| Avg Patron Value | — | ${(rows.reduce((s, r) => s + r.patronValue, 0) / rows.length).toFixed(1)} |`,
    `| Ready for Director | — | ${rows.filter((r) => r.recommendation === "Ready for Director").length}/${rows.length} |`,
    "",
    "## Per song",
    "",
    "| RVTR | Artist | Patron Value | Story Quality | Recommendation | Angle | Performance |",
    "|------|--------|--------------|---------------|----------------|-------|-------------|",
  ];

  for (const r of rows) {
    const before = beforeRows.find((b) => b.rvtr === r.rvtr);
    lines.push(
      `| ${r.rvtr} | ${r.artist} | ${r.patronValue}/10 | ${before?.storyQuality ?? "—"}→${r.storyQuality} | ${r.recommendation} | ${r.storyAngle} | ${r.performanceTitle ?? "—"} |`,
    );
  }

  lines.push("", "## Top 5 stories", "");
  for (const [i, r] of rows.slice(0, 5).entries()) {
    lines.push(`${i + 1}. **${r.artist} — ${r.title}** (${r.rvtr}) — Patron Value **${r.patronValue}/10**`);
  }

  lines.push("", "## Bottom 3 (still weak)", "");
  const bottom = [...rows].sort((a, b) => a.patronValue - b.patronValue).slice(0, 3);
  for (const r of bottom) {
    lines.push(`- **${r.artist} — ${r.title}** (${r.rvtr}) — Patron ${r.patronValue}/10 · ${r.recommendation}`);
  }

  const readyCount = rows.filter((r) => r.recommendation === "Ready for Director").length;
  lines.push(
    "",
    "## Director readiness",
    "",
    readyCount >= 6
      ? "Editorial output is approaching Director-ready on mainstream catalog entries. A limited Director prototype can begin on top 5–6 songs while story rewrite keeps improving edge cases."
      : "Not ready for Director prototype — Patron Value and story recommendations still skew toward *Needs More Story* or *Needs More Research* on too many batch songs.",
  );

  await writeFile(join(REPORT_DIR, "COMPARISON.md"), `${lines.join("\n")}\n`, "utf8");
  await writeFile(join(REPORT_DIR, "results.json"), `${JSON.stringify({ rows }, null, 2)}\n`, "utf8");
  console.log(`\nReport: reports/studio-alpha/batch-001-a2/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
