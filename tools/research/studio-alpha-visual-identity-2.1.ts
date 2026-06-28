#!/usr/bin/env node
/**
 * Collector Visual Identity 2.1 — profile extraction validation.
 *
 * Usage: npm run research:studio-alpha:visual-identity-2.1
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadCollectorPackage } from "../../lib/ops/studio/collector/store.ts";
import { buildVisualIdentityPackage } from "../../lib/ops/studio/collector/visual-identity.ts";
import { saveVisualIdentityPackage } from "../../lib/ops/studio/collector/visual-identity-store.ts";
import type { VisualIdentityProfile } from "../../lib/ops/studio/collector/visual-identity-types.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/visual-identity-2.1");

/** Target songs from phase prompt + diverse available packages with visual assets. */
const VALIDATION_SONGS = [
  { rvtr: "RVTR417030", label: "Phil Collins — In The Air Tonight" },
  { rvtr: "RVTR817112", label: "Thomas Dolby — She Blinded Me With Science" },
  { rvtr: "RVTR763274", label: "Vanilla Ice — Ice Ice Baby" },
  { rvtr: "RVTR164626", label: "Johnny Cash — I Walk The Line" },
];

function profileSummary(profile: VisualIdentityProfile): string {
  return `${profile.lighting} · ${profile.mood} · ${profile.primaryColor}`;
}

function profilesDistinct(profiles: VisualIdentityProfile[]): boolean {
  if (profiles.length < 2) return false;
  const keys = profiles.map(
    (p) =>
      `${p.lighting}|${p.mood}|${p.primaryColor}|${p.energy}|${p.texture}|${p.typography}`,
  );
  return new Set(keys).size === keys.length;
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  const rows: Array<{
    rvtr: string;
    label: string;
    ok: boolean;
    summary: string;
    profile: VisualIdentityProfile | null;
  }> = [];

  for (const entry of VALIDATION_SONGS) {
    const collector = await loadCollectorPackage(entry.rvtr);
    if (!collector) {
      rows.push({
        rvtr: entry.rvtr,
        label: entry.label,
        ok: false,
        summary: "Missing collector.json",
        profile: null,
      });
      continue;
    }

    const identity = await buildVisualIdentityPackage(collector);
    await saveVisualIdentityPackage(identity);
    const profile = identity.profile;

    rows.push({
      rvtr: entry.rvtr,
      label: entry.label,
      ok: Boolean(profile),
      summary: profile ? profileSummary(profile) : identity.performances[0]?.skipReason ?? "No profile",
      profile,
    });
  }

  const profiles = rows.map((r) => r.profile).filter((p): p is VisualIdentityProfile => Boolean(p));
  const distinct = profilesDistinct(profiles);

  const lines = [
    "# Visual Identity 2.1 — Validation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    "| Song | RVTR | Profile | Confidence |",
    "|------|------|---------|------------|",
    ...rows.map(
      (r) =>
        `| ${r.label} | ${r.rvtr} | ${r.ok ? r.summary : "—"} | ${r.profile?.confidence ?? "—"} |`,
    ),
    "",
    "## Primary Profiles",
    "",
    ...rows
      .filter((r) => r.profile)
      .map(
        (r) =>
          `### ${r.label}\n\n\`\`\`json\n${JSON.stringify(
            {
              primaryColor: r.profile!.primaryColor,
              secondaryColor: r.profile!.secondaryColor,
              accentColor: r.profile!.accentColor,
              mood: r.profile!.mood,
              lighting: r.profile!.lighting,
              energy: r.profile!.energy,
              texture: r.profile!.texture,
              typography: r.profile!.typography,
              confidence: r.profile!.confidence,
            },
            null,
            2,
          )}\n\`\`\``,
      ),
    "",
    "## Distinctiveness",
    "",
    distinct
      ? "**PASS** — Profiles differ across songs before any Renderer changes."
      : "**PARTIAL** — Some profiles overlap; re-run after more performance imagery is collected.",
    "",
    "## Artifact",
    "",
    "`visual-identity.json` written alongside `collector.json` for each validated RVTR.",
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
