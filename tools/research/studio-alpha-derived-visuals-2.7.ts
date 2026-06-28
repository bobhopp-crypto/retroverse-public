#!/usr/bin/env node
/**
 * Derived Visuals 2.7 — validation across reference songs.
 *
 * Usage: npm run research:studio-alpha:derived-visuals-2.7
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { buildArtDirectionProfile } from "../../lib/retroverse/art-direction/build-art-direction-profile.ts";
import { loadSongDnaPackage } from "../../lib/ops/studio/collector/song-dna-store.ts";
import { buildDerivedVisualPreview } from "../../lib/retroverse/visual-assets/preview-builder.ts";
import { loadExperienceRenderSpec } from "../../lib/retroverse/renderer/load-render-spec.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/derived-visuals-2.7");

const VALIDATION_SONGS = [
  { rvtr: "RVTR417030", label: "Phil Collins — In The Air Tonight" },
  { rvtr: "RVTR720668", label: "Squeeze — Tempted" },
  { rvtr: "RVTR558691", label: "La Bouche — Be My Lover" },
];

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  const sections: string[] = [];
  let passCount = 0;

  for (const entry of VALIDATION_SONGS) {
    const experience = await loadExperienceRenderSpec(entry.rvtr);
    const songDna = await loadSongDnaPackage(entry.rvtr);

    if (!experience) {
      sections.push(`### ${entry.label}\n\nMissing render spec.\n`);
      continue;
    }

    const artDirection = buildArtDirectionProfile({
      songDna,
      experience,
      layoutId: "performance",
      rvtr: entry.rvtr,
    });

    const preview = buildDerivedVisualPreview({
      rvtr: entry.rvtr,
      experience,
      songDna,
      artDirection,
    });

    const ok =
      preview.suggestions.length >= 3 &&
      preview.derivedVisual.prompt.includes("Preserve") &&
      preview.preferredSceneTypes.length > 0;

    if (ok) passCount += 1;

    sections.push(
      [
        `### ${entry.label} (${entry.rvtr})`,
        "",
        `**Status:** ${ok ? "PASS" : "REVIEW"}`,
        "",
        "**Suggested styles**",
        "",
        ...preview.suggestions.map(
          (s, i) => `${i + 1}. **${s.style.name}** (score ${s.score}) — ${s.reason}`,
        ),
        "",
        "**Top prompt excerpt**",
        "",
        "```",
        preview.derivedVisual.prompt.split("\n").slice(0, 14).join("\n"),
        "...",
        "```",
        "",
        "**Preferred scene types**",
        "",
        preview.preferredSceneTypes.map((t) => `- ${t.replace(/_/g, " ")}`).join("\n"),
        "",
        "**Selection reason**",
        "",
        preview.selectionReason,
        "",
        "**Song DNA palette**",
        "",
        preview.derivedVisual.palette.length
          ? preview.derivedVisual.palette.join(", ")
          : "— (no Song DNA palette)",
        "",
      ].join("\n"),
    );
  }

  const pass = passCount === VALIDATION_SONGS.length;

  const lines = [
    "# Derived Visuals 2.7 — Validation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `${passCount}/${VALIDATION_SONGS.length} songs produced style suggestions, prompts, and scene-type mappings.`,
    "",
    ...sections,
    "",
    "## Result",
    "",
    pass
      ? "**PASS** — Visual Asset Studio framework produces DNA-grounded derived visual previews."
      : "**FAIL** — One or more songs missing expected derived visual metadata.",
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
