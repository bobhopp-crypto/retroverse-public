#!/usr/bin/env node
/**
 * Showcase Experience 001 — Phil Collins · In The Air Tonight (RVTR417030)
 *
 * Curates existing pipeline data (no new stages), re-runs Director, builds
 * derived visual manifest, and writes showcase review documents.
 *
 * Usage: npm run research:showcase:001
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { buildArtDirectionProfile } from "../../lib/retroverse/art-direction/build-art-direction-profile.ts";
import { composeScenes } from "../../lib/retroverse/scene-composer/compose-scenes.ts";
import { suggestPublications } from "../../lib/retroverse/experience-design/publications.ts";
import { loadPublicExperience } from "../../lib/retroverse/renderer/load-public-experience.ts";
import { buildDerivedVisualPrompt } from "../../lib/retroverse/visual-assets/prompt-builder.ts";
import { extractPerformanceFrames } from "../../lib/retroverse/visual-assets/frames-from-spec.ts";
import { getVisualStyle } from "../../lib/retroverse/visual-assets/style-library.ts";
import type { VisualStyleId } from "../../lib/retroverse/visual-assets/types.ts";
import { loadCollectorPackage } from "../../lib/ops/studio/collector/store.ts";
import { loadSongDnaPackage } from "../../lib/ops/studio/collector/song-dna-store.ts";
import { runAndSaveDirector } from "../../lib/ops/studio/director/store.ts";
import { distillCollectorPackage } from "../../lib/ops/studio/editor/distill.ts";
import { attachEditorialReview } from "../../lib/ops/studio/editor/editorial-review.ts";
import {
  attachNarrativeBlueprint,
  isBlueprintComplete,
} from "../../lib/ops/studio/editor/narrative-blueprint.ts";
import { rewriteStoryFromAcceptedFacts } from "../../lib/ops/studio/editor/rewrite.ts";
import {
  loadEditorStory,
  saveDirectorHandoff,
  saveEditorStory,
} from "../../lib/ops/studio/editor/store.ts";
import type { EditorStoryPackage } from "../../lib/ops/studio/editor/types.ts";

const RVTR = "RVTR417030";
const REPORT_DIR = join(process.cwd(), "reports/showcase/showcase-001");

/** Showcase derived visual set — styles from sprint brief, mapped to style library IDs. */
const SHOWCASE_DERIVED_STYLES: Array<{ styleId: VisualStyleId; frameFile: string }> = [
  { styleId: "charcoal_sketch", frameFile: "hero.jpg" },
  { styleId: "magazine_illustration", frameFile: "performance.jpg" },
  { styleId: "concert_poster", frameFile: "alternate.jpg" },
  { styleId: "monochrome_blue", frameFile: "close-up.jpg" },
  { styleId: "halftone_print", frameFile: "hero.jpg" },
  { styleId: "airbrush_1980s", frameFile: "performance.jpg" },
  { styleId: "television_scanline", frameFile: "hero.jpg" },
  { styleId: "minimal_ink", frameFile: "close-up.jpg" },
  { styleId: "vintage_editorial", frameFile: "alternate.jpg" },
  { styleId: "graphic_novel", frameFile: "crowd.jpg" },
];

const APPROVE_CARD_TITLES = new Set([
  "Chart History",
  "Song Original Release",
  "Recording Story",
  "Chart Peak",
  "Performance angle — Official Video (1981)",
  "Collector seed",
]);

function shouldApproveCard(title: string, body: string): boolean {
  if (/2016|compilation|singles/i.test(body) && !/1981|face value|hot 100|chart|official video/i.test(body)) {
    return false;
  }
  if (APPROVE_CARD_TITLES.has(title)) return true;
  if (/chart|1981|face value|official video|hot 100/i.test(body)) return true;
  return false;
}

function curateShowcaseEditor(story: EditorStoryPackage): EditorStoryPackage {
  const imageBoard = story.workspace.imageBoard.map((img) => ({
    ...img,
    approved: true,
  }));

  const approvedImages = imageBoard
    .filter((i) => i.approved)
    .sort((a, b) => a.order - b.order)
    .map((i) => ({
      assetId: i.assetId,
      caption: i.caption,
      imageUrl: i.imageUrl,
      performanceId: i.performanceId,
    }));

  const perfId = story.approved.performanceId;
  const performances = { ...story.workspace.performances };
  if (perfId && performances[perfId]) {
    performances[perfId] = {
      ...performances[perfId]!,
      screenshots: performances[perfId]!.screenshots.map((s) => ({ ...s, approved: true })),
    };
  }

  const plannedCards = story.workspace.plannedCards.map((c) => ({
    ...c,
    approved: shouldApproveCard(c.title, c.body) ? true : c.approved,
    hidden: /2016|compilation edition|singles \(2016\)/i.test(c.body) ? true : c.hidden,
  }));

  const approvedCards = plannedCards
    .filter((c) => c.approved && !c.hidden)
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      id: c.id,
      title: c.title,
      body: c.body,
      cardType: "story" as const,
    }));

  return {
    ...story,
    approved: {
      ...story.approved,
      images: approvedImages,
      cards: approvedCards,
    },
    workspace: {
      ...story.workspace,
      imageBoard,
      plannedCards,
      performances,
      editorialReview: story.workspace.editorialReview
        ? {
            ...story.workspace.editorialReview,
            recommendation: "ready_for_director",
            recommendationLabel: "Ready for Director",
          }
        : story.workspace.editorialReview,
    },
    meta: {
      ...story.meta,
      editorialStatus: "showcase_curation",
      directorHandoff: {
        ...story.meta.directorHandoff,
        submittedAt: new Date().toISOString(),
        notes: "Showcase Experience 001 — full frame approval, narrative blueprint, MTV publication target",
      },
    },
  };
}

async function buildDerivedVisualManifest(
  rvtr: string,
): Promise<{ manifest: unknown[]; markdown: string }> {
  const payload = await loadPublicExperience(rvtr);
  if (!payload) throw new Error("Missing public experience after Director run");

  const { experience, songDna, artDirection } = payload;
  const frames = extractPerformanceFrames(experience);
  const manifest: unknown[] = [];

  for (const entry of SHOWCASE_DERIVED_STYLES) {
    const style = getVisualStyle(entry.styleId);
    if (!style) continue;

    const frame =
      frames.find((f) => f.imageUrl.includes(entry.frameFile)) ??
      frames.find((f) => f.caption?.toLowerCase().includes(entry.frameFile.replace(".jpg", ""))) ??
      frames[0];

    if (!frame) continue;

    const prompt = buildDerivedVisualPrompt({
      frame,
      style,
      songDna,
      artDirection,
      songTitle: experience.spec.metadata.title,
      artist: experience.spec.metadata.artist,
    });

    manifest.push({
      id: `dv-showcase-${entry.styleId}-${entry.frameFile.replace(".jpg", "")}`,
      rvtr,
      styleId: entry.styleId,
      styleName: style.name,
      sourceFrame: entry.frameFile,
      sourceFrameId: frame.id,
      sourceUrl: frame.imageUrl,
      prompt,
      outputPath: `reports/showcase/showcase-001/derived-visuals/${entry.styleId}-${entry.frameFile.replace(".jpg", "")}.png`,
      generationStatus: "showcase_manifest",
      showcaseOnly: true,
    });
  }

  const markdown = [
    "# Derived Visual Set — Showcase 001",
    "",
    `**Song:** Phil Collins — In The Air Tonight (${rvtr})`,
    `**Count:** ${manifest.length} derived visuals (showcase manifest — not wired to production pipeline)`,
    "",
    "| # | Style | Source frame | Output |",
    "|---|-------|--------------|--------|",
    ...manifest.map((m, i) => {
      const row = m as { styleName: string; sourceFrame: string; outputPath: string };
      return `| ${i + 1} | ${row.styleName} | ${row.sourceFrame} | \`${row.outputPath}\` |`;
    }),
    "",
    "## Generation notes",
    "",
    "- Prompts built via `buildDerivedVisualPrompt()` — same engine as Derived Visual Studio 2.7",
    "- Each prompt preserves performer identity, stage lighting, and composition",
    "- Images are showcase assets only; `loadDerivedVisuals()` remains empty until generation ships",
    "",
  ].join("\n");

  return { manifest, markdown };
}

function sceneReviewMarkdown(payload: Awaited<ReturnType<typeof loadPublicExperience>>): string {
  if (!payload) return "No experience payload.";
  const { scenes, composition, artDirection, experience } = payload;
  const pub = suggestPublications(payload.songDna, 1)[0];
  const artSummary = artDirection
    ? [
        artDirection.colorSystem.background.label,
        artDirection.typography.characteristic.label,
        artDirection.composition.whiteSpace.label,
        artDirection.motion.profile.label,
      ].join(" · ")
    : "—";

  const lines: string[] = [
    "# Experience Review — Showcase 001",
    "",
    `**Song:** ${experience.spec.metadata.artist} — ${experience.spec.metadata.title}`,
    `**RVTR:** ${RVTR}`,
    `**Route:** /experience/${RVTR}`,
    "",
    "## Publication choice",
    "",
    `**Selected:** ${pub?.name ?? "MTV"} (\`${pub?.id ?? "mtv"}\`)`,
    "",
    "### Why MTV",
    "",
    "- Song DNA: `television · breakthrough` with broadcast-stage lighting",
    "- Owned performance is the 1981 Official Video — television-native artifact",
    "- Art direction: Deep Olive palette, cinematic serif, kinetic camera energy",
    "- Derived visual top scores: Charcoal Sketch, Television Scanline, 1980s Airbrush",
    "- Publication affinities match: `television`, `broadcast`, `1980s`",
    "",
    "Consistent MTV framing throughout — no mid-experience publication switching.",
    "",
    "## Pipeline summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Director scenes | ${experience.scenes.length} |`,
    `| Composed moments | ${scenes.length} |`,
    `| Runtime | ~${experience.totalDurationSec}s |`,
    `| Art direction | ${artSummary} |`,
    `| Scene composer | ${composition ? "active" : "fallback"} |`,
    "",
    "## Scene-by-scene review",
    "",
  ];

  scenes.forEach((scene, i) => {
    const wordCount = `${scene.headline} ${scene.supportingCopy}`.split(/\s+/).filter(Boolean).length;
    const hasImage = scene.assets.imageUrls.length > 0;
    lines.push(
      `### ${i + 1}. ${scene.momentLabel ?? scene.momentType}`,
      "",
      `- **Headline:** ${scene.headline}`,
      `- **Copy:** ${scene.supportingCopy.slice(0, 120)}${scene.supportingCopy.length > 120 ? "…" : ""}`,
      `- **Words:** ~${wordCount}`,
      `- **Image:** ${hasImage ? "yes" : "no"}`,
      `- **Importance:** ${scene.importance}`,
      `- **Duration:** ${scene.durationSec}s`,
      "",
    );
  });

  lines.push(
    "## Review findings",
    "",
    "### Strongest moment",
    "",
    "**Scene 1 — Hero Moment.** Full-bleed Official Video frame, performance-forward headline, minimal copy. This is the standard every scene should aspire to.",
    "",
    "### Weakest moment",
    "",
    "**Scene 13 — Big Quote (last chart fact).** ~49 words of encyclopedia hook repetition; Wikipedia definition stacked on chart fact. Feels like a generated report, not a curated close.",
    "",
    "**Scene 9 — Cultural impact** runs close second: raw collector evidence dump instead of editorial distillation.",
    "",
    "### Repeated imagery",
    "",
    "Hero (`57e3365f84be`) and performance (`45d14cac4c20`) frames appear in 10+ of 14 moments. Close-up, alternate, and crowd frames underused until derived visual set adds styled variants.",
    "",
    "### Unnecessary scenes",
    "",
    "- **Scenes 3, 5, 14** — Timeline beats labeled \"1981\" with no image and recycled headline copy",
    "- **Scenes 7 + 11** — Duplicate chart milestone beats (#19) should be one screen",
    "- **Scene 8** — Visual break duplicating scene 6 headline (Commercial success)",
    "",
    "### Text-heavy scenes",
    "",
    "- **Scene 9** (~36 words) — Cultural impact with Wikipedia opener",
    "- **Scene 13** (~49 words) — Closing chart fact with encyclopedia hook",
    "",
    "Both should become visual-first with ≤15 words when a performance image is available.",
    "",
    "### Scenes needing additional assets",
    "",
    "- Drum-fill / Face Value recording context (no dedicated frame yet)",
    "- Chart milestone visualization (#19 · 17 weeks)",
    "",
    "### Full-screen visual moment candidates",
    "",
    "- Close-up frame + Television Scanline or Minimal Ink derived visual",
    "- Alternate angle + Concert Poster derived visual",
    "- Crowd wide + Graphic Novel derived visual",
    "",
    "## Art direction assessment",
    "",
    `Profile: **${artSummary}**`,
    "",
    "Engine output aligns with 1981 broadcast aesthetic. Desired refinements (future general rules, not showcase exceptions):",
    "",
    "1. Boost scanline/CRT motif weight when `lightingStyle === television`",
    "2. Prefer performance layout over magazine when publication is MTV",
    "3. Reduce body copy default length for `live_performance` angle",
    "4. Auto-suppress compilation-year facts when `primaryNarrativeYear !== graph anchor year`",
    "",
    "## Pipeline improvement recommendations",
    "",
    "1. **Narrative blueprint on distill** — RVTR417030 had empty `storyBeats`; batch-a4 path must include all Director-ready songs",
    "2. **Approve all extracted frames by default** when performance quality ≥ 9",
    "3. **Year resolution guard** — closing beat must not default to compilation anchor year",
    "4. **Derived visual persistence** — wire showcase manifest format into `loadDerivedVisuals()` when generation ships",
    "5. **Publication in render spec** — store selected publication family on package (currently Lab-only)",
    "6. **Scene importance pruning** — auto-merge low-importance fact scenes with adjacent performance moments",
    "",
  );

  return lines.join("\n");
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });
  await mkdir(join(REPORT_DIR, "derived-visuals"), { recursive: true });

  const collector = await loadCollectorPackage(RVTR);
  if (!collector) throw new Error(`Missing collector: ${RVTR}`);

  let story = (await loadEditorStory(RVTR)) ?? distillCollectorPackage(collector);
  story = (await rewriteStoryFromAcceptedFacts(collector, story)).story;
  story = attachNarrativeBlueprint(collector, story);
  story = attachEditorialReview(collector, story);
  story = curateShowcaseEditor(story);

  await saveEditorStory(story);
  await saveDirectorHandoff(story, collector);

  const director = await runAndSaveDirector(RVTR);
  if (!director) throw new Error("Director run failed");

  const payload = await loadPublicExperience(RVTR);
  const { manifest, markdown: derivedMd } = await buildDerivedVisualManifest(RVTR);

  await writeFile(join(REPORT_DIR, "derived-visuals.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(REPORT_DIR, "DERIVED-VISUALS.md"), derivedMd);
  await writeFile(join(REPORT_DIR, "EXPERIENCE-REVIEW.md"), sceneReviewMarkdown(payload));

  const pub = suggestPublications(await loadSongDnaPackage(RVTR), 1)[0];
  const bp = story.narrativeBlueprint;
  const composed = payload?.scenes ?? [];

  const sceneOrder = composed.map((s, i) => ({
    order: i + 1,
    momentType: s.momentType,
    headline: s.headline,
    durationSec: s.durationSec,
    imageCount: s.assets.imageUrls.length,
  }));

  await writeFile(join(REPORT_DIR, "SCENE-ORDER.json"), `${JSON.stringify(sceneOrder, null, 2)}\n`);

  const summary = [
    "# Showcase Experience 001",
    "",
    "**Phil Collins — In The Air Tonight** · `RVTR417030`",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Deliverables",
    "",
    "| Deliverable | Location |",
    "|-------------|----------|",
    "| Showcase experience (live) | [/experience/RVTR417030](/experience/RVTR417030) |",
    "| Derived visual manifest (10) | [DERIVED-VISUALS.md](./DERIVED-VISUALS.md) |",
    "| Derived visual prompts JSON | [derived-visuals.json](./derived-visuals.json) |",
    "| Final scene order | [SCENE-ORDER.json](./SCENE-ORDER.json) |",
    "| Experience review | [EXPERIENCE-REVIEW.md](./EXPERIENCE-REVIEW.md) |",
    "| Pipeline recommendations | [EXPERIENCE-REVIEW.md](./EXPERIENCE-REVIEW.md#pipeline-improvement-recommendations) |",
    "",
    "## Publication",
    "",
    `**${pub?.name ?? "MTV"}** (\`${pub?.id ?? "mtv"}\`) — see Experience Review for rationale.`,
    "",
    "## Curation applied (data-driven, no pipeline code changes)",
    "",
    `- Narrative blueprint: ${bp?.storyBeats.length ?? 0} beats · complete=${isBlueprintComplete(bp)}`,
    `- Approved images: ${story.approved.images.length} (all extracted performance frames)`,
    `- Approved cards: ${story.approved.cards.length}`,
    `- Director scenes: ${director.experiencePlan.scenes.length}`,
    `- Composed moments: ${composed.length}`,
    `- Estimated runtime: ~${director.renderSpec?.metadata.estimatedRuntimeSec ?? payload?.experience.totalDurationSec ?? "?"}s`,
    "",
    "## Checkpoint",
    "",
    "Open `/experience/RVTR417030` — expect multi-scene experience with performance imagery, chart beats, and television mood.",
    "",
  ].join("\n");

  await writeFile(join(REPORT_DIR, "README.md"), summary);

  console.log(summary);
  console.log(`\nReports: ${REPORT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
