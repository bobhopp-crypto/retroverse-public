#!/usr/bin/env node
/**
 * Director Prototype 0.1 — five-song validation.
 *
 * Pipeline: editor.json → director-handoff.json → director.json
 * Director reads handoff only — never Collector.
 *
 * Usage: npm run research:studio-alpha:director-0.1
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { buildDirectorHandoffFromEditor } from "../../lib/ops/studio/editor/director-package.ts";
import { loadEditorStory } from "../../lib/ops/studio/editor/store.ts";
import { runDirectorOnHandoff } from "../../lib/ops/studio/director/run-director.ts";
import {
  saveDirectorHandoff,
  saveDirectorPackage,
} from "../../lib/ops/studio/director/store.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/director-0.1");

const PROTOTYPE_SONGS: Array<{ rvtr: string; artist: string; title: string }> = [
  { rvtr: "RVTR665372", artist: "Soho", title: "Hippychick" },
  { rvtr: "RVTR964817", artist: "Erasure", title: "Chains Of Love" },
  { rvtr: "RVTR558691", artist: "La Bouche", title: "Be My Lover" },
  { rvtr: "RVTR634395", artist: "Adriano Celentano", title: "Prisencolinensinainciusol" },
  { rvtr: "RVTR720668", artist: "Squeeze", title: "Tempted" },
];

type ResultRow = {
  rvtr: string;
  artist: string;
  title: string;
  scenes: number;
  runtimeSec: number;
  readiness: string;
  style: string;
  rhythm: string;
  performance: string;
  imageCoveragePct: number;
  factCoveragePct: number;
  missingAssets: string[];
  warnings: number;
};

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });
  const rows: ResultRow[] = [];
  const planSummaries: string[] = [];

  for (const entry of PROTOTYPE_SONGS) {
    const editor = await loadEditorStory(entry.rvtr);
    if (!editor) {
      console.error(`Missing editor.json: ${entry.rvtr}`);
      continue;
    }

    const handoff = buildDirectorHandoffFromEditor(editor);
    await saveDirectorHandoff(handoff);

    const director = runDirectorOnHandoff(handoff);
    await saveDirectorPackage(director);

    const plan = director.experiencePlan;
    const review = director.review;

    rows.push({
      rvtr: entry.rvtr,
      artist: director.artist,
      title: director.title,
      scenes: plan.scenes.length,
      runtimeSec: plan.estimatedRuntimeSec,
      readiness: review.readinessLabel,
      style: plan.presentationStyle,
      rhythm: plan.visualRhythm,
      performance: plan.primaryPerformance.title,
      imageCoveragePct: review.imageCoveragePct,
      factCoveragePct: review.factCoveragePct,
      missingAssets: review.missingAssets,
      warnings: review.warnings.length,
    });

    planSummaries.push(
      [
        `### ${director.artist} — ${director.title}`,
        "",
        `**RVTR:** ${entry.rvtr} · **Readiness:** ${review.readinessLabel}`,
        "",
        `- Scenes: ${plan.scenes.length} · Runtime: ${plan.estimatedRuntimeSec}s`,
        `- Style: ${plan.presentationStyle} · Rhythm: ${plan.visualRhythm}`,
        `- Performance: ${plan.primaryPerformance.title}`,
        "",
        "**Scene list:**",
        "",
        ...plan.scenes.map(
          (s) =>
            `${s.sceneNumber}. [${s.sceneType}] ${s.title} — ${s.estimatedDurationSec}s · images: ${s.linkedImageAssetIds.length} · facts: ${s.linkedFactIds.length}`,
        ),
        "",
      ].join("\n"),
    );

    console.log(
      `${entry.rvtr} · ${plan.scenes.length} scenes · ${plan.estimatedRuntimeSec}s · ${review.readinessLabel}`,
    );
  }

  const readyCount = rows.filter((r) => r.readiness === "Ready for Production").length;
  const avgRuntime = Math.round(rows.reduce((s, r) => s + r.runtimeSec, 0) / rows.length);
  const avgScenes = (rows.reduce((s, r) => s + r.scenes, 0) / rows.length).toFixed(1);

  const md = [
    "# Director Prototype 0.1 — Validation Report",
    "",
    `**Songs processed:** ${rows.length}/5`,
    `**Ready for Production:** ${readyCount}/${rows.length}`,
    `**Average runtime:** ${avgRuntime}s (target 60–120s)`,
    `**Average scenes:** ${avgScenes}`,
    "",
    "## Summary Table",
    "",
    "| RVTR | Artist | Scenes | Runtime | Style | Readiness |",
    "|------|--------|--------|---------|-------|-----------|",
    ...rows.map(
      (r) =>
        `| ${r.rvtr} | ${r.artist} | ${r.scenes} | ${r.runtimeSec}s | ${r.style} | ${r.readiness} |`,
    ),
    "",
    "## Runtime Comparison",
    "",
    ...rows.map((r) => `- **${r.title}:** ${r.runtimeSec}s (${r.scenes} scenes)`),
    "",
    "## Readiness",
    "",
    ...rows.map(
      (r) =>
        `- **${r.artist}** — ${r.readiness}${r.missingAssets.length ? ` · gaps: ${r.missingAssets.join(", ")}` : ""}${r.warnings ? ` · ${r.warnings} warning(s)` : ""}`,
    ),
    "",
    "## Experience Plans",
    "",
    ...planSummaries,
    "",
    "## Missing Data Patterns",
    "",
    ...(rows.some((r) => r.missingAssets.length)
      ? rows.flatMap((r) =>
          r.missingAssets.map((g) => `- ${r.rvtr}: ${g}`),
        )
      : ["- None blocking across prototype set"]),
    "",
    "## Recommendations before Director 0.2",
    "",
    "1. **Rendering layer** — consume `director.json` scenes as a timeline spec (still no animations in 0.2 planning phase optional)",
    "2. **Scene type → layout mapping** — Hero, Performance, Chart each get a layout template",
    "3. **Handoff artist/title** — store explicitly on Editor meta to avoid subtitle parsing",
    "4. **Key moment deduplication** — tighten overlap detection when beats already cover chart/performance",
    "5. **Runtime tuning** — per-scene duration flags surfaced in Editor review before Director run",
    "",
    "## Output files",
    "",
    "Per song under `data/ops/intelligence/research-department/{RVTR}/`:",
    "",
    "- `director-handoff.json` — Editor → Director input",
    "- `director.json` — Experience Plan + Director Review",
    "",
  ].join("\n");

  await writeFile(join(REPORT_DIR, "VALIDATION.md"), `${md}\n`, "utf8");
  await writeFile(join(REPORT_DIR, "results.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");

  console.log(`\nReport: ${REPORT_DIR}/VALIDATION.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
