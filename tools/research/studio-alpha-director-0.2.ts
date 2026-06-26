#!/usr/bin/env node
/**
 * Director Prototype 0.2 — Scene Template validation (same 5 songs).
 *
 * Usage: npm run research:studio-alpha:director-0.2
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

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/director-0.2");

const PROTOTYPE_SONGS = [
  { rvtr: "RVTR665372", label: "Soho — Hippychick" },
  { rvtr: "RVTR964817", label: "Erasure — Chains Of Love" },
  { rvtr: "RVTR558691", label: "La Bouche — Be My Lover" },
  { rvtr: "RVTR634395", label: "Celentano — Prisencolinensinainciusol" },
  { rvtr: "RVTR720668", label: "Squeeze — Tempted" },
];

type SongReport = {
  rvtr: string;
  label: string;
  scenes: number;
  runtimeSec: number;
  readiness: string;
  templateCoveragePct: number;
  layoutReadinessPct: number;
  visualVarietyScore: number;
  templateUsage: string;
  missingLayout: string[];
  varietyWarnings: string[];
  sceneTemplates: Array<{
    n: number;
    title: string;
    template: string;
    confidence: number;
    layout: string;
  }>;
};

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });
  const reports: SongReport[] = [];
  const globalTemplateCounts = new Map<string, number>();

  for (const entry of PROTOTYPE_SONGS) {
    const editor = await loadEditorStory(entry.rvtr);
    if (!editor) {
      console.error(`Missing editor: ${entry.rvtr}`);
      continue;
    }

    const handoff = buildDirectorHandoffFromEditor(editor);
    await saveDirectorHandoff(handoff);
    const director = runDirectorOnHandoff(handoff);
    await saveDirectorPackage(director);

    const plan = director.experiencePlan;
    const review = director.review;

    const sceneTemplates = plan.scenes.map((s) => ({
      n: s.sceneNumber,
      title: s.title,
      template: s.recommendedTemplate?.displayName ?? "—",
      confidence: s.recommendedTemplate?.confidence ?? 0,
      layout: s.layoutReadinessLabel ?? "—",
    }));

    for (const s of plan.scenes) {
      const t = s.recommendedTemplate?.templateId ?? "story";
      globalTemplateCounts.set(t, (globalTemplateCounts.get(t) ?? 0) + 1);
    }

    reports.push({
      rvtr: entry.rvtr,
      label: entry.label,
      scenes: plan.scenes.length,
      runtimeSec: plan.estimatedRuntimeSec,
      readiness: review.readinessLabel,
      templateCoveragePct: review.templateCoveragePct ?? 0,
      layoutReadinessPct: review.layoutReadinessPct ?? 0,
      visualVarietyScore: review.visualVarietyScore ?? 0,
      templateUsage: (review.templateUsage ?? []).map((u) => `${u.displayName}×${u.count}`).join(", "),
      missingLayout: review.missingAssets.filter((a) => a.startsWith("Scene")),
      varietyWarnings: [
        ...(review.duplicateTemplateWarnings ?? []),
        ...(review.varietyRecommendations ?? []),
      ],
      sceneTemplates,
    });

    console.log(
      `${entry.rvtr} · ${plan.scenes.length} scenes · templates ${review.templateUsage?.length ?? 0} types · layout ${review.layoutReadinessPct}% ready`,
    );
  }

  const totalScenes = reports.reduce((s, r) => s + r.scenes, 0);
  const templateStats = [...globalTemplateCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => `- **${id}:** ${count} (${Math.round((count / totalScenes) * 100)}%)`);

  const assignmentTables = reports.map(
    (r) =>
      [
        `### ${r.label}`,
        "",
        "| # | Scene | Template | Conf | Layout |",
        "|---|-------|----------|------|--------|",
        ...r.sceneTemplates.map(
          (s) => `| ${s.n} | ${s.title.slice(0, 28)} | ${s.template} | ${s.confidence}% | ${s.layout} |`,
        ),
        "",
        `- Runtime: ${r.runtimeSec}s · Variety: ${r.visualVarietyScore}% · Readiness: ${r.readiness}`,
        r.missingLayout.length ? `- Layout gaps: ${r.missingLayout.join("; ")}` : "- Layout: all scenes ready",
        "",
      ].join("\n"),
  );

  const md = [
    "# Director Prototype 0.2 — Scene Template Validation",
    "",
    `**Songs:** ${reports.length}/5 · **Total scenes:** ${totalScenes}`,
    "",
    "## Summary",
    "",
    "| Song | Scenes | Runtime | Templates | Layout Ready | Variety | Readiness |",
    "|------|--------|---------|-----------|--------------|---------|-----------|",
    ...reports.map(
      (r) =>
        `| ${r.label.split("—")[0]?.trim()} | ${r.scenes} | ${r.runtimeSec}s | ${r.templateUsage} | ${r.layoutReadinessPct}% | ${r.visualVarietyScore}% | ${r.readiness} |`,
    ),
    "",
    "## Template Usage Statistics (all songs)",
    "",
    ...templateStats,
    "",
    "## Template Assignment Tables",
    "",
    ...assignmentTables,
    "",
    "## Variety Analysis",
    "",
    ...reports.flatMap((r) =>
      r.varietyWarnings.length
        ? [`**${r.label}:**`, ...r.varietyWarnings.map((w) => `- ${w}`), ""]
        : [`**${r.label}:** Good template spread`, ""],
    ),
    "",
    "## Asset Readiness",
    "",
    ...reports.map((r) =>
      r.missingLayout.length
        ? `- **${r.label}:** ${r.missingLayout.length} scene(s) need assets`
        : `- **${r.label}:** All scenes layout-ready`,
    ),
    "",
    "## Gaps Before Rendering",
    "",
    "1. Renderer must map each `recommendedTemplate.templateId` to a layout component",
    "2. Scenes with non-Ready layout need Editor asset pass or template downgrade rules",
    "3. Consecutive same-template runs should trigger alternate template in 0.3 auto-variation",
    "4. Gallery and Fact Stack templates rarely selected — need richer multi-fact / multi-image handoffs",
    "",
    "## Recommendations for Director 0.3",
    "",
    "1. **Auto-variation pass** — rewrite template when 3+ consecutive duplicates detected",
    "2. **Template downgrade** — if layout not ready, pick next-best template with assets",
    "3. **Scene transition hints** — planning-only fade/cut labels (still no animation engine)",
    "4. **Renderer contract JSON** — export `director-render-spec.json` sibling to director.json",
    "5. **Quote extraction** — Editor should flag quote-ready facts for Quote template",
    "",
  ].join("\n");

  await writeFile(join(REPORT_DIR, "VALIDATION.md"), `${md}\n`, "utf8");
  await writeFile(join(REPORT_DIR, "results.json"), `${JSON.stringify(reports, null, 2)}\n`, "utf8");

  console.log(`\nReport: ${REPORT_DIR}/VALIDATION.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
