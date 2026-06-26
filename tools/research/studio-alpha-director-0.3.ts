#!/usr/bin/env node
/**
 * Director Prototype 0.3 — Render Spec validation (same 5 songs).
 *
 * Usage: npm run research:studio-alpha:director-0.3
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

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/director-0.3");

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
  renderReadiness: string;
  renderingConfidence: number;
  patronValue: number | null;
  storyQuality: string | null;
  downgradesApplied: number;
  varietyAdjustments: number;
  templateDiversity: number;
  visualDiversity: number;
  pacingDiversity: number;
  manifestRequired: number;
  manifestOptional: number;
  missingRequired: string[];
  missingOptional: string[];
  downgradeReport: string[];
  varietyReport: string[];
  sceneSummary: Array<{
    n: number;
    template: string;
    preferred: string;
    downgraded: boolean;
    transitionIn: string;
    duration: number;
  }>;
};

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });
  const reports: SongReport[] = [];

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
    if (director.renderSpec) {
      const { writeFile, mkdir } = await import("fs/promises");
      const { dirname } = await import("path");
      const specPath = directorRenderSpecPath(entry.rvtr);
      await mkdir(dirname(specPath), { recursive: true });
      await writeFile(specPath, `${JSON.stringify(director.renderSpec, null, 2)}\n`);
    }

    const spec = director.renderSpec!;
    const review = director.review;
    const plan = director.experiencePlan;

    const allAssets = [
      ...spec.assetManifest.hero,
      ...spec.assetManifest.supportingImages,
      ...spec.assetManifest.performanceImages,
      ...spec.assetManifest.galleryImages,
      ...spec.assetManifest.timelineData,
      ...spec.assetManifest.charts,
      ...spec.assetManifest.quotes,
      ...spec.assetManifest.facts,
    ];

    const missingRequired = allAssets.filter((a) => a.required && !a.url && !a.caption).map((a) => a.id);
    const missingOptional = allAssets.filter((a) => !a.required && !a.url && !a.caption && a.role !== "fact").map((a) => a.id);

    const report: SongReport = {
      rvtr: entry.rvtr,
      label: entry.label,
      scenes: plan.scenes.length,
      runtimeSec: plan.estimatedRuntimeSec,
      readiness: review.readinessLabel,
      renderReadiness: spec.renderReadinessLabel,
      renderingConfidence: spec.estimatedRenderingConfidence,
      patronValue: spec.metadata.patronValue,
      storyQuality: spec.metadata.storyQuality,
      downgradesApplied: spec.templateDowngradesApplied,
      varietyAdjustments: spec.varietyAdjustmentsApplied,
      templateDiversity: review.templateDiversityScore ?? 0,
      visualDiversity: review.visualDiversityScore ?? 0,
      pacingDiversity: review.pacingDiversityScore ?? 0,
      manifestRequired: allAssets.filter((a) => a.required).length,
      manifestOptional: allAssets.filter((a) => !a.required).length,
      missingRequired,
      missingOptional,
      downgradeReport: review.downgradeReport ?? [],
      varietyReport: review.varietyReport ?? [],
      sceneSummary: spec.sceneTimeline.map((s) => ({
        n: s.sceneNumber,
        template: s.templateId,
        preferred: s.preferredTemplateId,
        downgraded: s.templateDowngraded,
        transitionIn: s.transitionIn,
        duration: s.durationSec,
      })),
    };

    reports.push(report);

    await writeFile(
      join(REPORT_DIR, `${entry.rvtr}-render-spec.json`),
      `${JSON.stringify(spec, null, 2)}\n`,
    );
    await writeFile(
      join(REPORT_DIR, `${entry.rvtr}-downgrades.md`),
      `# ${entry.label} — Template Downgrades\n\n${(review.downgradeReport ?? []).map((l) => `- ${l}`).join("\n") || "_None_"}\n`,
    );
    await writeFile(
      join(REPORT_DIR, `${entry.rvtr}-variety.md`),
      `# ${entry.label} — Variety\n\nDiversity: template ${review.templateDiversityScore}% · visual ${review.visualDiversityScore}% · pacing ${review.pacingDiversityScore}%\n\n${(review.varietyReport ?? []).map((l) => `- ${l}`).join("\n") || "_No adjustments_"}\n`,
    );

    console.log(
      `${entry.rvtr} · ${plan.scenes.length} scenes · ${spec.renderReadiness} · confidence ${spec.estimatedRenderingConfidence}%`,
    );
    console.log(`  → ${directorRenderSpecPath(entry.rvtr)}`);
  }

  const readyCount = reports.filter((r) => r.renderReadiness.includes("Ready to Render") || r.renderReadiness.includes("Optional")).length;

  const summary = `# Director 0.3 — Render Spec Validation

Generated: ${new Date().toISOString()}

## Summary

| RVTR | Song | Scenes | Runtime | Render Readiness | Confidence | Downgrades | Variety |
|------|------|--------|---------|------------------|------------|------------|---------|
${reports
  .map(
    (r) =>
      `| ${r.rvtr} | ${r.label} | ${r.scenes} | ${r.runtimeSec}s | ${r.renderReadiness} | ${r.renderingConfidence}% | ${r.downgradesApplied} | ${r.varietyAdjustments} |`,
  )
  .join("\n")}

**${reports.length}/${PROTOTYPE_SONGS.length} specs generated · ${readyCount} render-ready**

## Variety Statistics (aggregate)

| Metric | Avg |
|--------|-----|
| Template diversity | ${Math.round(reports.reduce((s, r) => s + r.templateDiversity, 0) / reports.length)}% |
| Visual diversity | ${Math.round(reports.reduce((s, r) => s + r.visualDiversity, 0) / reports.length)}% |
| Pacing diversity | ${Math.round(reports.reduce((s, r) => s + r.pacingDiversity, 0) / reports.length)}% |

## Asset Manifest Validation

${reports
  .map(
    (r) =>
      `### ${r.label}\n- Required assets: ${r.manifestRequired}\n- Optional assets: ${r.manifestOptional}\n- Missing required: ${r.missingRequired.length ? r.missingRequired.join(", ") : "none"}\n- Missing optional: ${r.missingOptional.length ? r.missingOptional.join(", ") : "none"}`,
  )
  .join("\n\n")}

## Render Readiness

${reports
  .map(
    (r) =>
      `- **${r.label}**: ${r.renderReadiness} (${r.renderingConfidence}%) · Patron Value ${r.patronValue ?? "—"} · Story ${r.storyQuality ?? "—"}`,
  )
  .join("\n")}

## First Renderer Prototype Recommendation

Build a **sequential scene runner** that:

1. Loads \`director-render-spec.json\` only — no Editor or Collector
2. Iterates \`renderingInstructions.sceneOrder\`
3. For each scene, maps \`templateId\` → one React layout component (Hero, Story, Gallery, Timeline, Quote, Performance, Chart, Closing)
4. Applies \`durationSec\` as auto-advance timer when \`respectDurationHints\` is true
5. Uses \`transitionIn\` / \`transitionOut\` as CSS class hints (fade/crossfade) — motion is renderer-owned
6. Resolves assets from \`scene.assets\` inline — never re-fetch manifest separately on first pass
7. Honors \`renderReadiness\` gate: block publish if \`missing_required_assets\`

**Suggested first target:** mobile web portrait, single-column, cream/teal Retroverse tokens from \`globalPresentation\`.

**Do not implement in Director sprint** — this is a separate Renderer 0.1 package consuming the spec file.

## Files

- \`${REPORT_DIR}/\` — per-song render specs, downgrade reports, variety stats
- \`data/ops/intelligence/research-department/{RVTR}/director-render-spec.json\` — canonical output
`;

  await writeFile(join(REPORT_DIR, "DIRECTOR-0.3-SUMMARY.md"), summary);
  await writeFile(join(REPORT_DIR, "validation-report.json"), `${JSON.stringify(reports, null, 2)}\n`);

  console.log(`\nReport: ${join(REPORT_DIR, "DIRECTOR-0.3-SUMMARY.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
