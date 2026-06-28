#!/usr/bin/env node
/**
 * Song DNA 2.2 — validation across reference songs.
 *
 * Usage: npm run research:studio-alpha:song-dna-2.2
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { buildSongDnaPackage } from "../../lib/ops/studio/collector/build-song-dna.ts";
import { loadCollectorPackage } from "../../lib/ops/studio/collector/store.ts";
import { buildVisualIdentityPackage } from "../../lib/ops/studio/collector/visual-identity.ts";
import { saveSongDnaPackage } from "../../lib/ops/studio/collector/song-dna-store.ts";
import type { CollectorSongDna } from "../../lib/ops/studio/collector/song-dna-types.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/song-dna-2.2");

const VALIDATION_SONGS = [
  { rvtr: "RVTR417030", label: "Phil Collins — In The Air Tonight" },
  { rvtr: "RVTR285085", label: "Paul Simon — You Can Call Me Al" },
  { rvtr: "RVTR843599", label: "Danzig — Mother" },
  { rvtr: "RVTR558691", label: "La Bouche — Be My Lover" },
  { rvtr: "RVTR720668", label: "Squeeze — Tempted" },
];

function fingerprint(dna: CollectorSongDna): string {
  return [
    dna.visual?.lightingStyle ?? "no-visual",
    dna.musical?.energy.label ?? "no-energy",
    dna.musical?.valence.label ?? "no-valence",
    dna.story.primaryTheme,
    dna.experience.overallMood,
    dna.experience.recommendedColorFamily,
  ].join("|");
}

function summary(dna: CollectorSongDna): string {
  const parts = [
    dna.visual?.lightingStyle?.replace(/_/g, " ") ?? "—",
    dna.musical ? `${dna.musical.energy.label}/${dna.musical.valence.label}` : "—",
    dna.story.primaryTheme,
  ];
  return parts.join(" · ");
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  const rows: Array<{
    rvtr: string;
    label: string;
    ok: boolean;
    summary: string;
    fingerprint: string;
    dna: CollectorSongDna | null;
  }> = [];

  for (const entry of VALIDATION_SONGS) {
    const collector = await loadCollectorPackage(entry.rvtr);
    if (!collector) {
      rows.push({
        rvtr: entry.rvtr,
        label: entry.label,
        ok: false,
        summary: "Missing collector.json",
        fingerprint: "",
        dna: null,
      });
      continue;
    }

    const visualIdentity = await buildVisualIdentityPackage(collector);
    const dna = await buildSongDnaPackage(collector, visualIdentity);
    await saveSongDnaPackage(dna);

    rows.push({
      rvtr: entry.rvtr,
      label: entry.label,
      ok: true,
      summary: summary(dna),
      fingerprint: fingerprint(dna),
      dna,
    });
  }

  const okRows = rows.filter((r) => r.dna);
  const distinct =
    okRows.length >= 2
      ? new Set(okRows.map((r) => r.fingerprint)).size === okRows.length
      : false;

  const lines = [
    "# Song DNA 2.2 — Validation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    "| Song | RVTR | Profile |",
    "|------|------|---------|",
    ...rows.map((r) => `| ${r.label} | ${r.rvtr} | ${r.ok ? r.summary : r.summary} |`),
    "",
    "## Experience Fingerprints",
    "",
    ...okRows.map(
      (r) =>
        `### ${r.label}\n\n- Mood: ${r.dna!.experience.overallMood}\n- Visual: ${r.dna!.visual?.lightingStyle ?? "—"}\n- Musical: ${r.dna!.musical?.energy.label ?? "—"} energy · ${r.dna!.musical?.valence.label ?? "—"} valence\n- Story: ${r.dna!.story.primaryTheme} / ${r.dna!.story.emotionalArc}\n- Layout: ${r.dna!.experience.preferredLayoutStyle}\n`,
    ),
    "",
    "## Distinctiveness",
    "",
    distinct
      ? "**PASS** — Each collected song received a distinct Song DNA profile."
      : okRows.length < 2
        ? "**PARTIAL** — Need more Collector packages on disk."
        : "**PARTIAL** — Some profiles overlap; review missing visual or acoustic inputs.",
    "",
    "## Artifact",
    "",
    "`song-dna.json` written alongside `collector.json` and `visual-identity.json`.",
    "",
  ];

  const reportPath = join(REPORT_DIR, "VALIDATION.md");
  await writeFile(reportPath, lines.join("\n"));
  console.log(lines.join("\n"));
  console.log(`\nReport: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
