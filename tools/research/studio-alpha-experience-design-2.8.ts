#!/usr/bin/env node
/**
 * Experience Design Studio 2.8 — validation.
 *
 * Usage: npm run research:studio-alpha:experience-design-2.8
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { buildArtDirectionProfile } from "../../lib/retroverse/art-direction/build-art-direction-profile.ts";
import { loadSongDnaPackage } from "../../lib/ops/studio/collector/song-dna-store.ts";
import { composeScenes } from "../../lib/retroverse/scene-composer/compose-scenes.ts";
import { buildPublicationTheme } from "../../lib/retroverse/experience-design/publication-theme.ts";
import {
  PUBLICATION_LIBRARY,
  suggestPublications,
} from "../../lib/retroverse/experience-design/publications.ts";
import {
  defaultSceneOrder,
  defaultSceneOverrides,
  simulateScenes,
} from "../../lib/retroverse/experience-design/scene-simulation.ts";
import { buildDerivedVisualPreview } from "../../lib/retroverse/visual-assets/preview-builder.ts";
import { suggestVisualStyles } from "../../lib/retroverse/visual-assets/derived-visual.ts";
import { loadExperienceRenderSpec } from "../../lib/retroverse/renderer/load-render-spec.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/experience-design-2.8");

const SONGS = [
  { rvtr: "RVTR417030", label: "In The Air Tonight" },
  { rvtr: "RVTR720668", label: "Tempted" },
  { rvtr: "RVTR558691", label: "Be My Lover" },
];

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  const sections: string[] = [];
  let pass = 0;

  for (const song of SONGS) {
    const experience = await loadExperienceRenderSpec(song.rvtr);
    const songDna = await loadSongDnaPackage(song.rvtr);
    if (!experience) {
      sections.push(`### ${song.label}\n\nMissing render spec.\n`);
      continue;
    }

    const composition = composeScenes({ scenes: experience.scenes, songDna });
    const pub = suggestPublications(songDna, 1)[0] ?? PUBLICATION_LIBRARY[0]!;
    const artDirection = buildArtDirectionProfile({
      songDna,
      experience,
      layoutId: pub.preferredLayout,
      rvtr: song.rvtr,
    });
    const pubTheme = buildPublicationTheme(pub.id, artDirection);
    const derived = buildDerivedVisualPreview({
      rvtr: song.rvtr,
      experience,
      songDna,
      artDirection,
    });
    const styles = suggestVisualStyles(songDna, 3);
    const simulated = simulateScenes(
      composition.composedScenes,
      defaultSceneOrder(composition.composedScenes.length),
      defaultSceneOverrides(composition.composedScenes),
    );

    const ok =
      PUBLICATION_LIBRARY.length >= 11 &&
      pubTheme.themeVars["--elab-bg"] &&
      derived.suggestions.length >= 3 &&
      simulated.length >= composition.composedScenes.length;

    if (ok) pass += 1;

    sections.push(
      [
        `### ${song.label} (${song.rvtr})`,
        "",
        `**Status:** ${ok ? "PASS" : "REVIEW"}`,
        "",
        `- Publication: ${pub.name}`,
        `- Derived styles (top 3): ${styles.map((s) => s.style.name).join(", ")}`,
        `- Composed → simulated screens: ${composition.composedScenes.length} → ${simulated.length}`,
        `- Prompt excerpt: ${derived.derivedVisual.prompt.split("\n")[0]}`,
        "",
      ].join("\n"),
    );
  }

  const lines = [
    "# Experience Design Studio 2.8 — Validation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Publication families: ${PUBLICATION_LIBRARY.length}`,
    "",
    ...sections,
    "",
    "## Result",
    "",
    pass === SONGS.length
      ? "**PASS** — Design Studio framework ready for all validation songs."
      : "**FAIL** — One or more songs missing design studio outputs.",
    "",
  ];

  const reportPath = join(REPORT_DIR, "VALIDATION.md");
  await writeFile(reportPath, lines.join("\n"));
  console.log(lines.join("\n"));
  console.log(`\nReport: ${reportPath}`);

  if (pass !== SONGS.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
