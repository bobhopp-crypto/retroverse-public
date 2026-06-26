/**
 * Match Engine Simulation — entire VIDEO library.
 * Usage: npm run ops:match-engine-simulation
 */
require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports/match-engine-simulation");
  await mkdir(outDir, { recursive: true });

  const {
    runMatchEngineSimulation,
    formatMatchEngineSimulationMarkdown,
    reassignmentOpportunitiesToCsv,
  } = await import("../lib/ops/match-engine-simulation.ts");

  console.log("Loading VIDEO library and catalog…");
  const report = await runMatchEngineSimulation();
  const md = formatMatchEngineSimulationMarkdown(report);

  await Promise.all([
    writeFile(join(outDir, "SIMULATION.md"), md, "utf8"),
    writeFile(join(outDir, "simulation-summary.json"), JSON.stringify(report, null, 2), "utf8"),
    writeFile(
      join(outDir, "reassignment-opportunities.csv"),
      reassignmentOpportunitiesToCsv(report.allReassignments),
      "utf8",
    ),
  ]);

  console.log("Match Engine Simulation");
  console.log(
    JSON.stringify(
      {
        inventory: report.inventory,
        impact: report.impact,
        currentBuckets: report.currentBuckets,
        simulatedBuckets: report.simulatedBuckets,
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote: ${join(outDir, "SIMULATION.md")}`);
  console.log(`Reassignments: ${report.allReassignments.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
