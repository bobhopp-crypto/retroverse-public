#!/usr/bin/env npx tsx
/**
 * Sprint 3.18 — verify queue counts and package totals agree across Studio pages.
 * Run: NODE_OPTIONS='--require ./tools/finance/preload-server-only.cjs' npx tsx tools/ops/studio-state-audit.ts
 */

import { loadAllDepartmentLiveStatuses } from "@/lib/ops/studio/department-status";
import { buildPipelineHealthSnapshot } from "@/lib/ops/studio/pipeline-snapshot";
import { loadDepartmentLivingSnapshotLite } from "@/lib/ops/studio/living/load-living-studio";

async function main() {
  const [statuses, health, collectorLiving, editorLiving, directorLiving, publisherLiving] =
    await Promise.all([
      loadAllDepartmentLiveStatuses(),
      buildPipelineHealthSnapshot(),
      loadDepartmentLivingSnapshotLite("collector"),
      loadDepartmentLivingSnapshotLite("editor"),
      loadDepartmentLivingSnapshotLite("director"),
      loadDepartmentLivingSnapshotLite("publisher"),
    ]);

  const checks: Array<{ label: string; pass: boolean; detail: string }> = [];

  function compare(label: string, a: number, b: number) {
    checks.push({
      label,
      pass: a === b,
      detail: `${a} vs ${b}`,
    });
  }

  compare(
    "Collector queue — live status vs pipeline health",
    statuses.collector.queueRemaining,
    health.collector.waiting,
  );
  compare(
    "Editor queue — live status vs pipeline health",
    statuses.editor.queueRemaining,
    health.editor.waiting,
  );
  compare(
    "Director queue — live status vs pipeline health",
    statuses.director.queueRemaining,
    health.director.waiting,
  );
  compare(
    "Publisher queue — live status vs pipeline health",
    statuses.publisher.queueRemaining,
    health.publisher.waiting,
  );
  compare(
    "Published total — queue index vs pipeline health",
    statuses.publisher.publishedCount ?? 0,
    health.publishedTotal,
  );

  compare("Collector queue — live vs living chrome", statuses.collector.queueRemaining, collectorLiving.queueCount);
  compare("Editor queue — live vs living chrome", statuses.editor.queueRemaining, editorLiving.queueCount);
  compare("Director queue — live vs living chrome", statuses.director.queueRemaining, directorLiving.queueCount);
  compare("Publisher queue — live vs living chrome", statuses.publisher.queueRemaining, publisherLiving.queueCount);

  const failed = checks.filter((c) => !c.pass);

  console.log("# Studio State Consistency Audit\n");
  for (const check of checks) {
    console.log(`${check.pass ? "PASS" : "FAIL"} — ${check.label}: ${check.detail}`);
  }

  console.log(`\nSummary: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
