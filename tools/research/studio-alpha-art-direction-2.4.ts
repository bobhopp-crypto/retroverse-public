#!/usr/bin/env node
/**
 * Art Direction Engine 2.4 — validation across reference songs.
 *
 * Usage: npm run research:studio-alpha:art-direction-2.4
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  artDirectionFingerprint,
  buildArtDirectionProfile,
} from "../../lib/retroverse/art-direction/build-art-direction-profile.ts";
import { loadSongDnaPackage } from "../../lib/ops/studio/collector/song-dna-store.ts";
import { LAB_LAYOUTS } from "../../lib/retroverse/experience-lab/types.ts";
import { loadExperienceRenderSpec } from "../../lib/retroverse/renderer/load-render-spec.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/art-direction-2.4");

const VALIDATION_SONGS = [
  { rvtr: "RVTR417030", label: "Phil Collins — In The Air Tonight" },
  { rvtr: "RVTR843599", label: "Danzig — Mother" },
  { rvtr: "RVTR720668", label: "Squeeze — Tempted" },
  { rvtr: "RVTR558691", label: "La Bouche — Be My Lover" },
];

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  type Row = {
    rvtr: string;
    label: string;
    ok: boolean;
    hasDna: boolean;
    hasRenderSpec: boolean;
    profiles: Record<string, string>;
    magazineSummary: string;
  };

  const rows: Row[] = [];

  for (const entry of VALIDATION_SONGS) {
    const songDna = await loadSongDnaPackage(entry.rvtr);
    const experience = await loadExperienceRenderSpec(entry.rvtr);
    const profiles: Record<string, string> = {};
    let magazineSummary = "—";

    if (!songDna) {
      rows.push({
        rvtr: entry.rvtr,
        label: entry.label,
        ok: false,
        hasDna: false,
        hasRenderSpec: !!experience,
        profiles,
        magazineSummary: "Missing song-dna.json",
      });
      continue;
    }

    for (const layout of LAB_LAYOUTS) {
      const profile = buildArtDirectionProfile({
        songDna,
        experience,
        layoutId: layout.id,
        rvtr: entry.rvtr,
      });
      profiles[layout.id] = artDirectionFingerprint(profile);
      if (layout.id === "magazine") {
        magazineSummary = [
          profile.colorSystem.background.label,
          profile.typography.characteristic.label,
          profile.composition.whiteSpace.label,
          profile.motion.profile.label,
        ].join(" · ");
      }
    }

    rows.push({
      rvtr: entry.rvtr,
      label: entry.label,
      ok: true,
      hasDna: true,
      hasRenderSpec: !!experience,
      profiles,
      magazineSummary,
    });
  }

  const okRows = rows.filter((r) => r.ok);
  const layoutResults = LAB_LAYOUTS.map((layout) => {
    const fps = okRows.map((r) => r.profiles[layout.id] ?? "");
    const distinct = new Set(fps).size === fps.length && fps.every(Boolean);
    return { layout: layout.label, distinct, count: fps.length };
  });

  const allDistinct = layoutResults.every((r) => r.distinct) && okRows.length >= 4;

  const lines = [
    "# Art Direction Engine 2.4 — Validation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Magazine layout profiles",
    "",
    "| Song | RVTR | Art Direction summary |",
    "|------|------|------------------------|",
    ...rows.map((r) => `| ${r.label} | ${r.rvtr} | ${r.magazineSummary} |`),
    "",
    "## Distinctiveness (all six layouts)",
    "",
    ...layoutResults.map(
      (r) =>
        `- **${r.layout}**: ${r.distinct ? "PASS — 4 distinct profiles" : "FAIL — profiles overlap"}`,
    ),
    "",
    "## Data availability",
    "",
    ...rows.map(
      (r) =>
        `- ${r.label}: DNA ${r.hasDna ? "yes" : "no"}, render spec ${r.hasRenderSpec ? "yes" : "no"}`,
    ),
    "",
    "## Result",
    "",
    allDistinct
      ? "**PASS** — Each song received a distinct Art Direction Profile across all six layouts."
      : okRows.length < 4
        ? "**PARTIAL** — Missing Song DNA for one or more songs."
        : "**FAIL** — Some layout profiles overlap between songs; review DNA differentiation.",
    "",
  ];

  const reportPath = join(REPORT_DIR, "VALIDATION.md");
  await writeFile(reportPath, lines.join("\n"));
  console.log(lines.join("\n"));
  console.log(`\nReport: ${reportPath}`);

  if (!allDistinct && okRows.length >= 4) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
