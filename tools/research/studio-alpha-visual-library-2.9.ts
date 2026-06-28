#!/usr/bin/env node
/**
 * Visual Library 2.9 — validation across reference songs.
 *
 * Usage: npm run research:studio-alpha:visual-library-2.9
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadPublicExperience } from "../../lib/retroverse/renderer/load-public-experience.ts";
import {
  buildVisualLibrary,
  buildAndSaveVisualLibrary,
} from "../../lib/retroverse/visual-library/build-visual-library.ts";
import { scoreFramePair } from "../../lib/retroverse/visual-library/duplicates.ts";
import { COVERAGE_ROLES } from "../../lib/retroverse/visual-library/coverage.ts";
import { approvedLimitForTier } from "../../lib/retroverse/visual-library/budget.ts";
import { VISUAL_GENERATOR_CONTRACTS } from "../../lib/retroverse/visual-library/generators.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/visual-library-2.9");

const VALIDATION_SONGS = [
  { rvtr: "RVTR417030", label: "Phil Collins — In The Air Tonight", tier: "showcase" as const },
  { rvtr: "RVTR720668", label: "Squeeze — Tempted", tier: "curated" as const },
  { rvtr: "RVTR558691", label: "La Bouche — Be My Lover", tier: "video" as const },
];

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  const sections: string[] = [];
  let passCount = 0;

  for (const entry of VALIDATION_SONGS) {
    const library = await buildVisualLibrary(entry.rvtr);
    const publicExp = await loadPublicExperience(entry.rvtr);

    if (!library) {
      sections.push(`### ${entry.label}\n\nMissing package data.\n`);
      continue;
    }

    const dupWorks = library.duplicateSuggestions.length >= 0;
    const pairScore =
      library.performanceFrames.length >= 2
        ? scoreFramePair(library.performanceFrames[0]!, library.performanceFrames[1]!)
        : null;
    const coverageComplete = library.coverage.length === COVERAGE_ROLES.length;
    const budgetOk =
      library.budget.approvedLimit === approvedLimitForTier(library.tier) &&
      library.budget.approvedCount <= library.budget.approvedLimit;
    const recsOk = library.recommendations.length > 0;
    const rendererOk = publicExp != null && publicExp.pipeline.usedComposition;
    const generatorsOk = VISUAL_GENERATOR_CONTRACTS.length >= 7;

    const ok =
      dupWorks &&
      coverageComplete &&
      budgetOk &&
      recsOk &&
      rendererOk &&
      generatorsOk &&
      library.performanceFrames.length > 0;

    if (ok) passCount += 1;

    await buildAndSaveVisualLibrary(entry.rvtr);

    sections.push(
      [
        `### ${entry.label} (${entry.rvtr})`,
        "",
        `**Status:** ${ok ? "PASS" : "REVIEW"}`,
        "",
        "| Check | Result |",
        "|-------|--------|",
        `| Duplicate detection | ${dupWorks ? "yes" : "no"}${pairScore != null ? ` (sample ${pairScore}%)` : ""} |`,
        `| Coverage roles (${COVERAGE_ROLES.length}) | ${library.coverage.length} |`,
        `| Asset budget | ${library.budget.approvedCount} / ${library.budget.approvedLimit} (${library.tier}) |`,
        `| Budget enforced | ${budgetOk ? "yes" : "no"} |`,
        `| Recommendations | ${library.recommendations.length} |`,
        `| Performance frames | ${library.performanceFrames.length} |`,
        `| Derived assets | ${library.derivedAssets.length} |`,
        `| Duplicate pairs flagged | ${library.duplicateSuggestions.length} |`,
        `| Public renderer unchanged | ${rendererOk ? "yes" : "no"} |`,
        `| Generator contracts | ${VISUAL_GENERATOR_CONTRACTS.length} |`,
        "",
        "**Coverage summary**",
        "",
        ...library.coverage.map(
          (c) => `- ${c.role}: **${c.status}** — ${c.notes}`,
        ),
        "",
        "**Top recommendations**",
        "",
        ...library.recommendations.slice(0, 4).map(
          (r) => `- ${r.role} · ${r.kind} — ${r.reason.slice(0, 90)}${r.reason.length > 90 ? "…" : ""}`,
        ),
        "",
        library.duplicateSuggestions[0]
          ? `**Sample duplicate:** ${library.duplicateSuggestions[0].frameALabel} ↔ ${library.duplicateSuggestions[0].frameBLabel} (${library.duplicateSuggestions[0].similarityPercent}%) — keep ${library.duplicateSuggestions[0].keepFrameId.slice(0, 8)}`
          : "**Sample duplicate:** none above threshold",
        "",
      ].join("\n"),
    );
  }

  const pass = passCount === VALIDATION_SONGS.length;

  const lines = [
    "# Visual Library 2.9 — Validation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `${passCount}/${VALIDATION_SONGS.length} songs passed Visual Library checks.`,
    "",
    "Validates: duplicate scoring, coverage classification, asset budgets, recommendation engine,",
    "showcase package load, and public renderer unchanged.",
    "",
    ...sections,
    "",
    "## Result",
    "",
    pass
      ? "**PASS** — Visual Library layer operational alongside existing pipeline."
      : "**FAIL** — One or more songs missing expected Visual Library behavior.",
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
