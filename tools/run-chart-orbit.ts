/**
 * Chart Orbit analysis — chart-neighbor proof of concept (ops only).
 *
 * Usage:
 *   npm run ops:chart-orbit -- RVTR123456
 *   npm run ops:chart-orbit -- "When Doves Cry"
 *   npm run ops:chart-orbit -- --demo
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { analyzeChartOrbit } from "../lib/ops/chart-orbit/analyze";
import {
  chartOrbitCompanionAnalysisCsv,
  chartOrbitFateReportCsv,
  chartOrbitNeighborsCsv,
  chartOrbitPlaylistCsv,
  chartOrbitSummaryCsv,
  chartOrbitWeeksCsv,
  formatChartOrbitReport,
} from "../lib/ops/chart-orbit/format";
import { resolveChartOrbitTrack } from "../lib/ops/chart-orbit/resolve-track";
import { CHART_ORBIT_DEMO_TRACKS } from "../lib/ops/chart-orbit/types";
import { inspectPing } from "../lib/inspect/pg";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function runOne(input: string, artistHint?: string): Promise<void> {
  const focus = await resolveChartOrbitTrack(input, { artistHint });
  if (!focus) {
    console.error(`Track not found: ${input}`);
    process.exitCode = 1;
    return;
  }

  const report = await analyzeChartOrbit(focus);
  console.log(formatChartOrbitReport(report));

  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports", "chart_orbit");
  await mkdir(outDir, { recursive: true });

  const base = slugify(focus.rvtr ?? focus.title);
  const summaryPath = join(outDir, `${base}-summary.csv`);
  const neighborsPath = join(outDir, `${base}-neighbors.csv`);
  const weeksPath = join(outDir, `${base}-weeks.csv`);
  const jsonPath = join(outDir, `${base}.json`);

  const playlistPath = join(outDir, `${base}-orbit-playlist.csv`);
  const companionPath = join(outDir, `${base}-companion-analysis.csv`);
  const fatePath = join(outDir, `${base}-fate-report.csv`);

  await Promise.all([
    writeFile(summaryPath, chartOrbitSummaryCsv(report)),
    writeFile(neighborsPath, chartOrbitNeighborsCsv(report)),
    writeFile(weeksPath, chartOrbitWeeksCsv(report)),
    writeFile(playlistPath, chartOrbitPlaylistCsv(report)),
    writeFile(companionPath, chartOrbitCompanionAnalysisCsv(report)),
    writeFile(fatePath, chartOrbitFateReportCsv(report)),
    writeFile(jsonPath, JSON.stringify(report, null, 2)),
  ]);

  console.log(
    `\nWrote:\n  ${summaryPath}\n  ${neighborsPath}\n  ${weeksPath}\n  ${playlistPath}\n  ${companionPath}\n  ${fatePath}\n  ${jsonPath}`,
  );
}

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error(`Postgres unavailable: ${ping.error ?? "unknown error"}`);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`Usage:
  npm run ops:chart-orbit -- RVTR123456
  npm run ops:chart-orbit -- 12345
  npm run ops:chart-orbit -- "When Doves Cry"
  npm run ops:chart-orbit -- --demo`);
    return;
  }

  if (args[0] === "--demo") {
    for (const track of CHART_ORBIT_DEMO_TRACKS) {
      console.log(`\n${"=".repeat(72)}\nDEMO: ${track.label}\n${"=".repeat(72)}\n`);
      await runOne(track.query, "artistHint" in track ? track.artistHint : undefined);
    }
    return;
  }

  await runOne(args.join(" "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
