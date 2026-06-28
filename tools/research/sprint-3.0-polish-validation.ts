#!/usr/bin/env node
/**
 * Sprint 3.0 — Experience polish validation (RVTR417030).
 *
 * Usage: npm run research:sprint:3.0-polish
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { composeScenes } from "../../lib/retroverse/scene-composer/compose-scenes.ts";
import { loadSongDnaPackage } from "../../lib/ops/studio/collector/song-dna-store.ts";
import { loadPublicExperience } from "../../lib/retroverse/renderer/load-public-experience.ts";
import { loadExperienceRenderSpec } from "../../lib/retroverse/renderer/load-render-spec.ts";
import { polishScenesForPresentation } from "../../lib/retroverse/renderer/scene-presentation.ts";
import { IMAGE_TREATMENT_CYCLE } from "../../lib/retroverse/renderer/scene-presentation.ts";

const RVTR = "RVTR417030";
const REPORT_DIR = join(process.cwd(), "reports/sprint-3.0");

function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function sceneWords(scene: { headline: string; supportingCopy: string; assets: { factTexts: string[] } }): number {
  return (
    wordCount(scene.headline) +
    wordCount(scene.supportingCopy) +
    scene.assets.factTexts.reduce((s, f) => s + wordCount(f), 0)
  );
}

function consecutiveSameImage(scenes: { assets: { imageUrls: string[] } }[]): number {
  let count = 0;
  for (let i = 1; i < scenes.length; i++) {
    const a = scenes[i - 1]!.assets.imageUrls[0];
    const b = scenes[i]!.assets.imageUrls[0];
    if (a && b && a === b) count += 1;
  }
  return count;
}

function layoutVariety(scenes: { presentationLayout?: string }[]): number {
  return new Set(scenes.map((s) => s.presentationLayout)).size;
}

function treatmentVariety(scenes: { imageTreatment?: string }[]): number {
  return new Set(scenes.map((s) => s.imageTreatment)).size;
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  const experience = await loadExperienceRenderSpec(RVTR);
  const songDna = await loadSongDnaPackage(RVTR);
  if (!experience) throw new Error("Missing render spec");

  const beforeCompose = composeScenes({
    scenes: experience.scenes,
    songDna,
    totalDurationSec: experience.totalDurationSec,
  });

  const beforePolish = beforeCompose.composedScenes;
  const afterPayload = await loadPublicExperience(RVTR);
  if (!afterPayload) throw new Error("loadPublicExperience failed");

  const afterScenes = afterPayload.scenes;

  const before = {
    scenes: beforePolish.length,
    runtime: beforePolish.reduce((s, x) => s + x.durationSec, 0),
    avgWords: Math.round(
      beforePolish.reduce((s, x) => s + sceneWords(x), 0) / Math.max(1, beforePolish.length),
    ),
    timelineNoImage: beforePolish.filter(
      (s) => s.momentType === "timeline_beat" && s.assets.imageUrls.length === 0,
    ).length,
    chartMoments: beforePolish.filter((s) => s.momentType === "chart_milestone").length,
    sameImageAdjacent: consecutiveSameImage(beforePolish),
    layouts: 1,
    treatments: 1,
  };

  const after = {
    scenes: afterScenes.length,
    runtime: afterScenes.reduce((s, x) => s + x.durationSec, 0),
    avgWords: Math.round(
      afterScenes.reduce((s, x) => s + sceneWords(x), 0) / Math.max(1, afterScenes.length),
    ),
    timelineNoImage: afterScenes.filter(
      (s) => s.momentType === "timeline_beat" && s.assets.imageUrls.length === 0,
    ).length,
    chartMoments: afterScenes.filter((s) => s.momentType === "chart_milestone").length,
    sameImageAdjacent: consecutiveSameImage(afterScenes),
    layouts: layoutVariety(afterScenes),
    treatments: treatmentVariety(afterScenes),
  };

  const pass =
    after.scenes <= before.scenes &&
    after.avgWords <= before.avgWords &&
    after.sameImageAdjacent < before.sameImageAdjacent &&
    after.timelineNoImage <= before.timelineNoImage &&
    after.layouts >= 3 &&
    after.treatments >= 3;

  const lines = [
    "# Sprint 3.0 — Experience Polish Validation",
    "",
    `**Song:** Phil Collins — In The Air Tonight · \`${RVTR}\``,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Before → After",
    "",
    "| Metric | Before | After |",
    "|--------|--------|-------|",
    `| Composed scenes | ${before.scenes} | ${after.scenes} |`,
    `| Runtime (sec) | ${before.runtime} | ${after.runtime} |`,
    `| Avg words/scene | ${before.avgWords} | ${after.avgWords} |`,
    `| Imageless timeline beats | ${before.timelineNoImage} | ${after.timelineNoImage} |`,
    `| Chart milestone screens | ${before.chartMoments} | ${after.chartMoments} |`,
    `| Adjacent same image | ${before.sameImageAdjacent} | ${after.sameImageAdjacent} |`,
    `| Layout variants | ${before.layouts} | ${after.layouts} |`,
    `| Image treatments | ${before.treatments} | ${after.treatments} (${IMAGE_TREATMENT_CYCLE.join(", ")}) |`,
    "",
    "## Swipe-faster moments addressed",
    "",
    "- Empty \"1981\" timeline beats — pruned when no image and recycled copy",
    "- Duplicate chart milestones — deduplicated",
    "- Encyclopedia closing quote — trimmed or demoted to visual/chart",
    "- Repeated hero/performance image — rotated across frame pool",
    "- Same layout every screen — layout rhythm via presentation modes",
    "- Same visual treatment — CSS cycle: original → scanline → monochrome → halftone → poster",
    "",
    "## Scene order (after)",
    "",
    ...afterScenes.map(
      (s, i) =>
        `${i + 1}. **${s.momentLabel}** · ${s.presentationLayout} · ${s.imageTreatment} · ~${sceneWords(s)} words`,
    ),
    "",
    "## Result",
    "",
    pass
      ? "**PASS** — Fewer weak scenes, less repetition, better presentation rhythm."
      : "**REVIEW** — Some metrics did not improve; inspect table above.",
    "",
    "**Checkpoint:** Open `/experience/RVTR417030` — expect tighter pacing, varied images, minimal text.",
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
