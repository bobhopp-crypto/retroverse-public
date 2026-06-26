import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";

import { collectorPilotReportPath } from "./paths";
import type { CollectorPackage } from "./types";

export async function writeCollectorPilotReport(packages: CollectorPackage[]): Promise<string> {
  const lines: string[] = [
    "# Collector Pilot Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `Songs processed: ${packages.length}`,
    "",
  ];

  for (const pkg of packages) {
    lines.push(`## ${pkg.artist} — ${pkg.title}`);
    lines.push("");
    lines.push(`- **RVTR:** ${pkg.rvtr}`);
    lines.push(`- **Graph linked:** ${pkg.graphLinked ? "yes" : "no (VDJ-only)"}`);
    lines.push(`- **Research quality:** ${pkg.researchQuality}%`);
    lines.push(`- **Visual assets:** ${pkg.visualAssets.extraction.extractedCount} curated frames`);
    lines.push(`- **Status:** ${pkg.status}`);
    lines.push(`- **Output:** \`data/ops/intelligence/research-department/${pkg.rvtr}/collector.json\``);
    lines.push("");
    lines.push("### Stage Summary");
    lines.push("");
    for (const [stageId, result] of Object.entries(pkg.stages)) {
      lines.push(`- **${stageId}:** ${result.summary}`);
    }
    lines.push("");
    lines.push("### Research Summary");
    lines.push("");
    lines.push(pkg.summary.researchSummary);
    lines.push("");
    lines.push("### Missing Areas");
    lines.push("");
    if (pkg.missingAreas.length === 0) {
      lines.push("- None noted");
    } else {
      for (const gap of pkg.missingAreas) {
        lines.push(`- ${gap}`);
      }
    }
    lines.push("");
    lines.push("### Candidate Facts (top 8)");
    lines.push("");
    for (const fact of pkg.candidateFacts.slice(0, 8)) {
      lines.push(`- (${Math.round(fact.confidence * 100)}%) ${fact.text}`);
      lines.push(`  - Source: ${fact.source}`);
    }
    lines.push("");
  }

  const path = collectorPilotReportPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${lines.join("\n")}\n`, "utf8");
  return path;
}
