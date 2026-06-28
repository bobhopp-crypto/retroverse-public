#!/usr/bin/env node
/**
 * Renderer 0.1 — end-to-end validation for Studio experience route.
 *
 * Usage: npm run research:studio-alpha:renderer-0.1
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
import { directorRenderSpecPath } from "../../lib/ops/studio/director/paths.ts";
import { loadExperienceRenderSpec } from "../../lib/retroverse/renderer/load-render-spec.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/renderer-0.1");
const TARGET_RVTR = "RVTR417030";

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  const editor = await loadEditorStory(TARGET_RVTR);
  if (!editor) {
    console.error(`Missing editor package: ${TARGET_RVTR}`);
    process.exit(1);
  }

  const handoff = buildDirectorHandoffFromEditor(editor);
  await saveDirectorHandoff(handoff);
  const director = runDirectorOnHandoff(handoff);
  await saveDirectorPackage(director);

  if (director.renderSpec) {
    const specPath = directorRenderSpecPath(TARGET_RVTR);
    await writeFile(specPath, `${JSON.stringify(director.renderSpec, null, 2)}\n`);
  }

  const loaded = await loadExperienceRenderSpec(TARGET_RVTR);
  if (!loaded) {
    console.error("Renderer failed to load render spec");
    process.exit(1);
  }

  const spec = loaded.spec;
  const lines = [
    "# Renderer 0.1 — End-to-End Validation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Pipeline",
    "",
    "Collector → Editor → Director → Renderer",
    "",
    "## Target",
    "",
    `- **RVTR:** ${TARGET_RVTR}`,
    `- **Song:** ${spec.metadata.artist} — ${spec.metadata.title}`,
    `- **Scenes:** ${loaded.scenes.length}`,
    `- **Runtime:** ${loaded.totalDurationSec}s`,
    `- **Readiness:** ${spec.renderReadinessLabel}`,
    `- **Confidence:** ${spec.estimatedRenderingConfidence}%`,
    `- **Patron Value:** ${spec.metadata.patronValue ?? "—"}`,
    "",
    "## Scene Timeline",
    "",
    "| # | Template | Duration | Headline |",
    "|---|----------|----------|----------|",
    ...loaded.scenes.map(
      (s) =>
        `| ${s.sceneNumber} | ${s.templateId} | ${s.durationSec}s | ${s.headline.slice(0, 48)} |`,
    ),
    "",
    "## Route",
    "",
    `\`/experience/${TARGET_RVTR}\``,
    "",
    "## Result",
    "",
    loaded.scenes.length > 0 ? "**PASS** — Render spec loads and parses for Renderer." : "**FAIL**",
    "",
  ];

  const reportPath = join(REPORT_DIR, "VALIDATION.md");
  await writeFile(reportPath, lines.join("\n"));
  console.log(lines.join("\n"));
  console.log(`\nReport: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
