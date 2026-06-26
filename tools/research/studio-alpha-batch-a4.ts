#!/usr/bin/env node
/**
 * Sprint A4 — Narrative Blueprint pass on Batch 001 Editor packages.
 * Re-distill + rewrite + blueprint from existing Collector packages (no Collector changes).
 *
 * Usage: npm run research:studio-alpha:batch-a4
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadCollectorPackage } from "../../lib/ops/studio/collector/store.ts";
import { distillCollectorPackage } from "../../lib/ops/studio/editor/distill.ts";
import { attachEditorialReview } from "../../lib/ops/studio/editor/editorial-review.ts";
import { storyAngleLabel } from "../../lib/ops/studio/editor/editorial-constants.ts";
import {
  attachNarrativeBlueprint,
  isBlueprintComplete,
} from "../../lib/ops/studio/editor/narrative-blueprint.ts";
import { rewriteStoryFromAcceptedFacts } from "../../lib/ops/studio/editor/rewrite.ts";
import { saveEditorStory } from "../../lib/ops/studio/editor/store.ts";

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

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/batch-001-a4");

type Row = {
  rvtr: string;
  artist: string;
  title: string;
  complete: boolean;
  beats: number;
  keyMoments: number;
  emotionalArc: string;
  pace: string;
  primaryTheme: string;
  performanceTitle: string;
  endingStyle: string;
  patronValue: number;
  storyAngle: string;
};

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });
  const rows: Row[] = [];

  for (const rvtr of BATCH_SONGS) {
    const pkg = await loadCollectorPackage(rvtr);
    if (!pkg) {
      console.error(`Missing collector: ${rvtr}`);
      continue;
    }

    let story = distillCollectorPackage(pkg);
    story = (await rewriteStoryFromAcceptedFacts(pkg, story)).story;
    story = attachNarrativeBlueprint(pkg, story);
    await saveEditorStory(story);

    const bp = story.narrativeBlueprint!;
    const review = story.workspace.editorialReview!;
    const complete = isBlueprintComplete(bp);

    rows.push({
      rvtr,
      artist: pkg.artist,
      title: pkg.title,
      complete,
      beats: bp.storyBeats.length,
      keyMoments: bp.keyMoments.length,
      emotionalArc: bp.emotionalArc,
      pace: bp.recommendedPace,
      primaryTheme: bp.primaryTheme,
      performanceTitle: bp.recommendedPerformance.title,
      endingStyle: bp.recommendedEnding.style,
      patronValue: review.patronValue,
      storyAngle: storyAngleLabel(story.meta.storyAngle, story.meta.storyAngleCustom),
    });

    console.log(
      `${rvtr} · Blueprint ${complete ? "complete" : "INCOMPLETE"} · ${bp.storyBeats.length} beats · ${bp.keyMoments.length} moments`,
    );
  }

  const completeCount = rows.filter((r) => r.complete).length;
  const md = [
    "# Studio Alpha Sprint A4 — Narrative Blueprint Validation",
    "",
    `**Batch:** Studio Alpha 001 (${rows.length} songs)`,
    `**Blueprint complete:** ${completeCount}/${rows.length}`,
    "",
    "| RVTR | Artist | Beats | Moments | Arc | Pace | Theme | Performance | Complete |",
    "|------|--------|-------|---------|-----|------|-------|-------------|----------|",
    ...rows.map(
      (r) =>
        `| ${r.rvtr} | ${r.artist} | ${r.beats} | ${r.keyMoments} | ${r.emotionalArc} | ${r.pace} | ${r.primaryTheme} | ${r.performanceTitle.slice(0, 28)} | ${r.complete ? "✓" : "—"} |`,
    ),
    "",
    "## Deliverables",
    "",
    "1. Schema — `lib/ops/studio/editor/types.ts` (`NarrativeBlueprint`, beats, moments)",
    "2. Generator — `lib/ops/studio/editor/narrative-blueprint.ts`",
    "3. Editor package — `narrativeBlueprint` on `EditorStoryPackage`",
    "4. Director handoff — `DirectorEditorialPackage` v2 includes blueprint",
    "5. Distill + rewrite wired — blueprint generated after editorial review",
    "",
    "## Director contract",
    "",
    "Director receives: Story, Approved Facts, Approved Images, Approved Performance, **Narrative Blueprint**.",
    "No paragraph parsing required.",
    "",
    "## Notes",
    "",
    "- Collector unchanged",
    "- Patron Value / story quality scoring unchanged (A2 editorial review)",
    "- Blueprint is a creative plan, not duplicate prose",
    "",
  ].join("\n");

  await writeFile(join(REPORT_DIR, "VALIDATION.md"), `${md}\n`, "utf8");
  await writeFile(join(REPORT_DIR, "results.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");

  console.log(`\n${completeCount}/${rows.length} blueprints complete`);
  console.log(`Report: ${REPORT_DIR}/VALIDATION.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
