#!/usr/bin/env npx tsx
/**
 * Fact extraction audit — before/after promotion for one RVTR.
 *
 * Usage:
 *   npx tsx tools/intelligence/fact-audit.ts RVTR285085
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { buildPackageViewModel, defaultRelationships } from "../../lib/ops/intelligence/package-view-model.ts";
import { promoteVerifiedFacts } from "../../lib/ops/intelligence/promote-verified-facts.ts";
import { loadSongPackage } from "../../lib/ops/intelligence/song-package-store.ts";
import type { CandidateFact, FactCategory } from "../../lib/ops/intelligence/song-package-types.ts";

const CATEGORY_ORDER: FactCategory[] = [
  "trivia",
  "recording",
  "video",
  "chart",
  "album",
  "artist",
  "cultural_impact",
  "performance",
  "quote",
  "tv_film",
];

function countByStatus(facts: CandidateFact[]) {
  const counts: Record<string, number> = {};
  for (const f of facts) {
    counts[f.reviewStatus] = (counts[f.reviewStatus] ?? 0) + 1;
  }
  return counts;
}

function countByMethod(facts: CandidateFact[]) {
  const counts: Record<string, number> = {};
  for (const f of facts) {
    counts[f.extractionMethod] = (counts[f.extractionMethod] ?? 0) + 1;
  }
  return counts;
}

function countByCategory(facts: CandidateFact[], approvedOnly = false) {
  const counts: Record<string, number> = {};
  for (const f of facts) {
    if (approvedOnly && f.reviewStatus !== "approved") continue;
    counts[f.category] = (counts[f.category] ?? 0) + 1;
  }
  return counts;
}

function formatCounts(counts: Record<string, number>): string {
  const keys = Object.keys(counts).sort();
  if (keys.length === 0) return "(none)";
  return keys.map((k) => `${k}: ${counts[k]}`).join(", ");
}

async function main() {
  const rvtr = (process.argv[2] ?? "RVTR285085").trim().toUpperCase();
  const pkg = await loadSongPackage(rvtr);
  if (!pkg) {
    console.error(`Package not found: ${rvtr}`);
    process.exit(1);
  }

  const before = pkg.candidateFacts;
  const after = promoteVerifiedFacts(before);
  const viewBefore = buildPackageViewModel(pkg, defaultRelationships(pkg));
  const viewAfter = buildPackageViewModel(
    { ...pkg, candidateFacts: after },
    defaultRelationships(pkg),
  );

  const lines: string[] = [
    `# Fact Extraction Audit — ${rvtr}`,
    "",
    `**${pkg.metadata.title}** · ${pkg.metadata.artist}`,
    "",
    "## Before",
    "",
    `- Total candidate facts: **${before.length}**`,
    `- Story cards (rank > 0): **${pkg.storyCards.filter((c) => c.rank > 0).length}**`,
    `- Fact coverage score: **${viewBefore.health.factCoverage}%**`,
    `- By status: ${formatCounts(countByStatus(before))}`,
    `- By extraction: ${formatCounts(countByMethod(before))}`,
    `- By category (all): ${formatCounts(countByCategory(before))}`,
    `- By category (approved): ${formatCounts(countByCategory(before, true))}`,
    "",
    "### Diagnosis",
    "",
  ];

  if (before.length === 0 && pkg.storyCards.length > 0) {
    lines.push(
      "- **Root cause:** `candidateFacts` empty on disk but story cards exist — likely v1 migration wipe or cards built without persisting facts.",
      "- **Fix applied:** `backfillFactsFromStoryCards` + `promoteVerifiedFacts` in production pipeline.",
    );
  } else if (before.filter((f) => f.reviewStatus === "pending").length > 0) {
    lines.push(
      "- **Root cause:** Extracted facts remain `pending` — card build only counts `approved` facts.",
      "- **Fix applied:** Lowered auto-approval thresholds in `promoteVerifiedFacts` for pattern/model extracts with anchors.",
    );
  } else {
    lines.push("- Facts present and mostly approved.");
  }

  lines.push(
    "",
    "## After promotion",
    "",
    `- Total facts: **${after.length}**`,
    `- Approved: **${after.filter((f) => f.reviewStatus === "approved").length}**`,
    `- Fact coverage score: **${viewAfter.health.factCoverage}%**`,
    `- By category (approved): ${formatCounts(countByCategory(after, true))}`,
    "",
    "## Fact library by category",
    "",
  );

  for (const cat of CATEGORY_ORDER) {
    const approved = after.filter((f) => f.reviewStatus === "approved" && f.category === cat);
    if (approved.length === 0) continue;
    lines.push(`### ${cat}`, "");
    for (const f of approved.slice(0, 8)) {
      lines.push(`- ${f.factText}`);
    }
    lines.push("");
  }

  const outDir = join(process.cwd(), "reports", "intelligence");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `fact-audit-${rvtr}.md`);
  const body = `${lines.join("\n")}\n`;
  await writeFile(outPath, body, "utf8");

  console.log(body);
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
