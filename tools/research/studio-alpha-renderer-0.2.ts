#!/usr/bin/env node
/**
 * Renderer 0.2 — public experience pipeline validation.
 *
 * Usage: npm run research:studio-alpha:renderer-0.2
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadPublicExperience } from "../../lib/retroverse/renderer/load-public-experience.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/renderer-0.2");

const TARGETS = [
  { rvtr: "RVTR417030", label: "Phil Collins — In The Air Tonight", minComposed: 2 },
  { rvtr: "RVTR720668", label: "Squeeze — Tempted", minComposed: 15 },
  { rvtr: "RVTR558691", label: "La Bouche — Be My Lover", minComposed: 10 },
];

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  const rows: Array<{
    rvtr: string;
    label: string;
    ok: boolean;
    note: string;
    original: number;
    composed: number;
    composition: boolean;
    artDirection: boolean;
    moments: string[];
  }> = [];

  for (const target of TARGETS) {
    const payload = await loadPublicExperience(target.rvtr);
    if (!payload) {
      rows.push({
        rvtr: target.rvtr,
        label: target.label,
        ok: false,
        note: "Missing render spec",
        original: 0,
        composed: 0,
        composition: false,
        artDirection: false,
        moments: [],
      });
      continue;
    }

    const { pipeline, scenes } = payload;
    const ok =
      scenes.length >= target.minComposed &&
      pipeline.usedComposition &&
      scenes.every((s) => s.momentLabel && s.headline);

    rows.push({
      rvtr: target.rvtr,
      label: target.label,
      ok,
      note: ok ? "Pipeline ready" : "Check composition counts",
      original: pipeline.originalSceneCount,
      composed: pipeline.composedSceneCount,
      composition: pipeline.usedComposition,
      artDirection: pipeline.usedArtDirection,
      moments: scenes.map((s) => s.momentLabel),
    });
  }

  const pass = rows.filter((r) => r.ok).length === TARGETS.length;

  const lines = [
    "# Renderer 0.2 — Public Experience Validation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Pipeline",
    "",
    "Director Render Spec → Scene Composer → Art Direction → Performance Companion Renderer",
    "",
    "## Routes",
    "",
    ...TARGETS.map((t) => `- \`/experience/${t.rvtr}\``),
    "",
    "## Summary",
    "",
    "| Song | RVTR | Director → Composed | Composition | Art Direction | Status |",
    "|------|------|---------------------|-------------|---------------|--------|",
    ...rows.map(
      (r) =>
        `| ${r.label} | ${r.rvtr} | ${r.original}→${r.composed} | ${r.composition ? "yes" : "fallback"} | ${r.artDirection ? "yes" : "neutral"} | ${r.ok ? "PASS" : r.note} |`,
    ),
    "",
    "## Composed moments",
    "",
    ...rows.map((r) => `### ${r.label}\n\n${r.moments.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n`),
    "",
    "## Result",
    "",
    pass
      ? "**PASS** — Public routes load composed scenes with art direction."
      : "**FAIL** — One or more routes did not meet Renderer 0.2 criteria.",
    "",
  ];

  const reportPath = join(REPORT_DIR, "VALIDATION.md");
  await writeFile(reportPath, lines.join("\n"));
  console.log(lines.join("\n"));
  console.log(`\nReport: ${reportPath}`);

  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
