require("../finance/preload-server-only.cjs");

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";

import { loadLivingStudioSnapshot } from "../../lib/ops/studio/living/load-living-studio";

async function main() {
  const t0 = Date.now();
  const snapshot = await loadLivingStudioSnapshot();
  const ms = Date.now() - t0;
  const dash = snapshot.dashboard;
  if (!dash) throw new Error("dashboard missing from snapshot");

  const outDir = join(process.cwd(), "reports");
  mkdirSync(outDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    loadMs: ms,
    counts: dash.counts,
    eraProgress: dash.eraProgress,
    backlogRun: dash.backlogRun,
    reconciliation: {
      stageSum:
        dash.counts.needsEditor +
        dash.counts.needsDirector +
        dash.counts.needsCreativeReview +
        dash.counts.needsPublisher +
        dash.counts.published,
      collectorComplete: dash.counts.collectorComplete,
      matches: null as boolean | null,
    },
  };
  report.reconciliation.matches =
    report.reconciliation.stageSum === report.reconciliation.collectorComplete;

  writeFileSync(
    join(outDir, "sprint-3.43-mission-control-verification.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
