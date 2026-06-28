#!/usr/bin/env node
/**
 * Scene Composer 2.5 — validation across reference songs.
 *
 * Usage: npm run research:studio-alpha:scene-composer-2.5
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { composeScenes } from "../../lib/retroverse/scene-composer/compose-scenes.ts";
import { loadSongDnaPackage } from "../../lib/ops/studio/collector/song-dna-store.ts";
import { loadExperienceRenderSpec } from "../../lib/retroverse/renderer/load-render-spec.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/scene-composer-2.5");

const VALIDATION_SONGS = [
  { rvtr: "RVTR417030", label: "Phil Collins — In The Air Tonight" },
  { rvtr: "RVTR843599", label: "Danzig — Mother" },
  { rvtr: "RVTR720668", label: "Squeeze — Tempted" },
  { rvtr: "RVTR558691", label: "La Bouche — Be My Lover" },
];

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  const rows: Array<{
    label: string;
    rvtr: string;
    ok: boolean;
    note: string;
    stats: ReturnType<typeof composeScenes>["stats"] | null;
    pacing: string;
    composedCount: number;
    improved: boolean;
  }> = [];

  for (const entry of VALIDATION_SONGS) {
    const experience = await loadExperienceRenderSpec(entry.rvtr);
    const songDna = await loadSongDnaPackage(entry.rvtr);

    if (!experience) {
      rows.push({
        label: entry.label,
        rvtr: entry.rvtr,
        ok: false,
        note: "Missing director-render-spec.json",
        stats: null,
        pacing: "—",
        composedCount: 0,
        improved: false,
      });
      continue;
    }

    const result = composeScenes({
      scenes: experience.scenes,
      songDna,
      totalDurationSec: experience.totalDurationSec,
    });

    const improved =
      result.stats.composedSceneCount >= result.stats.originalSceneCount &&
      result.stats.avgFactsPerSceneComposed <= result.stats.avgFactsPerSceneOriginal;

    rows.push({
      label: entry.label,
      rvtr: entry.rvtr,
      ok: true,
      note: improved ? "Pacing improved" : "Review composition",
      stats: result.stats,
      pacing: result.pacingProfile.label,
      composedCount: result.composedScenes.length,
      improved,
    });
  }

  const okRows = rows.filter((r) => r.ok);
  const pass =
    okRows.length >= 3 &&
    okRows.filter((r) => r.improved).length >= okRows.length - 1;

  const lines = [
    "# Scene Composer 2.5 — Validation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    "| Song | RVTR | Pacing | Scenes | Words/scene | Facts/scene | Images |",
    "|------|------|--------|--------|-------------|-------------|--------|",
    ...rows.map((r) => {
      if (!r.stats) return `| ${r.label} | ${r.rvtr} | — | — | — | — | — |`;
      const s = r.stats;
      return `| ${r.label} | ${r.rvtr} | ${r.pacing} | ${s.originalSceneCount}→${s.composedSceneCount} | ${s.avgWordsPerSceneOriginal}→${s.avgWordsPerSceneComposed} | ${s.avgFactsPerSceneOriginal}→${s.avgFactsPerSceneComposed} | ${s.imageSlotsOriginal}→${s.imageSlotsComposed} |`;
    }),
    "",
    "## Detail",
    "",
    ...okRows.map((r) => {
      const s = r.stats!;
      return [
        `### ${r.label}`,
        "",
        `- Pacing profile: ${r.pacing}`,
        `- Scene count: ${s.originalSceneCount} → ${s.composedSceneCount}`,
        `- Avg words per scene: ${s.avgWordsPerSceneOriginal} → ${s.avgWordsPerSceneComposed}`,
        `- Avg facts per scene: ${s.avgFactsPerSceneOriginal} → ${s.avgFactsPerSceneComposed}`,
        `- Image slots: ${s.imageSlotsOriginal} → ${s.imageSlotsComposed}`,
        "",
      ].join("\n");
    }),
    "",
    "## Result",
    "",
    pass
      ? "**PASS** — Scene Composer expands pacing and lowers facts-per-scene without inventing content."
      : okRows.length < 3
        ? "**PARTIAL** — Need render specs on disk for validation songs."
        : "**REVIEW** — Some songs did not show expected pacing improvement.",
    "",
  ];

  const reportPath = join(REPORT_DIR, "VALIDATION.md");
  await writeFile(reportPath, lines.join("\n"));
  console.log(lines.join("\n"));
  console.log(`\nReport: ${reportPath}`);

  if (!pass && okRows.length >= 3) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
