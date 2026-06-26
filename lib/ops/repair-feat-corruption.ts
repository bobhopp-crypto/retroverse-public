import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { inspectExecute, inspectPing, inspectQuery } from "@/lib/inspect/pg";

import {
  FEAT_CORRUPTION_SQL,
  runGraphIntegrityAudit,
  type FeatCorruptionRow,
} from "./graph-integrity-audit";

export type FeatCorruptionRepairPlan = {
  rvtr: string;
  beforeTitle: string;
  afterTitle: string;
  source: "graph_title";
  graphTitle: string;
  normalizedTitleKey: string;
  identitySource: string;
};

export type FeatCorruptionRepairResult = {
  scannedAt: string;
  backupPath: string;
  totalCorrupt: number;
  planned: FeatCorruptionRepairPlan[];
  repaired: number;
  skipped: Array<{ rvtr: string; reason: string; canonicalTitle: string; graphTitle: string | null }>;
};

function normalizedKeyFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleValidatesNormalizedKey(title: string, normalizedTitleKey: string): boolean {
  const key = normalizedTitleKey.trim().toLowerCase();
  if (!key) return false;
  return normalizedKeyFromTitle(title) === key;
}

export function buildFeatCorruptionRepairPlans(rows: FeatCorruptionRow[]): {
  plans: FeatCorruptionRepairPlan[];
  skipped: FeatCorruptionRepairResult["skipped"];
} {
  const plans: FeatCorruptionRepairPlan[] = [];
  const skipped: FeatCorruptionRepairResult["skipped"] = [];

  for (const row of rows) {
    const graph = row.graphTitle?.trim() || null;
    if (!graph) {
      skipped.push({
        rvtr: row.rvtr,
        reason: "no_graph_title",
        canonicalTitle: row.canonicalTitle,
        graphTitle: null,
      });
      continue;
    }
    if (/\bFeat\b/i.test(graph)) {
      skipped.push({
        rvtr: row.rvtr,
        reason: "graph_title_also_corrupt",
        canonicalTitle: row.canonicalTitle,
        graphTitle: graph,
      });
      continue;
    }
    if (!titleValidatesNormalizedKey(graph, row.normalizedTitleKey)) {
      skipped.push({
        rvtr: row.rvtr,
        reason: "normalized_key_mismatch",
        canonicalTitle: row.canonicalTitle,
        graphTitle: graph,
      });
      continue;
    }
    if (graph === row.canonicalTitle) {
      skipped.push({
        rvtr: row.rvtr,
        reason: "already_clean",
        canonicalTitle: row.canonicalTitle,
        graphTitle: graph,
      });
      continue;
    }

    plans.push({
      rvtr: row.rvtr,
      beforeTitle: row.canonicalTitle,
      afterTitle: graph,
      source: "graph_title",
      graphTitle: graph,
      normalizedTitleKey: row.normalizedTitleKey,
      identitySource: row.identitySource,
    });
  }

  return { plans, skipped };
}

export async function repairFeatCorruption(options: {
  outDir: string;
  dryRun?: boolean;
}): Promise<FeatCorruptionRepairResult> {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error("Postgres unavailable");

  await mkdir(options.outDir, { recursive: true });
  const audit = await runGraphIntegrityAudit();
  const { plans, skipped } = buildFeatCorruptionRepairPlans(audit.allCorruptRows);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(options.outDir, `canonical-title-backup-${stamp}.json`);
  await writeFile(
    backupPath,
    JSON.stringify(
      {
        scannedAt: new Date().toISOString(),
        totalCorrupt: audit.affectedRvtrCount,
        rows: audit.allCorruptRows,
      },
      null,
      2,
    ),
    "utf8",
  );

  if (options.dryRun || plans.length === 0) {
    return {
      scannedAt: new Date().toISOString(),
      backupPath,
      totalCorrupt: audit.affectedRvtrCount,
      planned: plans,
      repaired: 0,
      skipped,
    };
  }

  let repaired = 0;
  for (const plan of plans) {
    const ct = await inspectExecute(
      `
      UPDATE canonical_tracks
      SET canonical_title = $1, updated_at = now()
      WHERE upper(trim(coalesce(retroverse_track_id, track_id::text))) = $2
      `,
      [plan.afterTitle, plan.rvtr],
    );
    const st = await inspectExecute(
      `
      UPDATE staging_canonical_track_imports
      SET canonical_title = $1
      WHERE upper(trim(coalesce(retroverse_track_id, track_id::text))) = $2
      `,
      [plan.afterTitle, plan.rvtr],
    );
    if (ct > 0 || st > 0) repaired += 1;
  }

  const remaining = await inspectQuery<{ n: number }>(
    `SELECT count(*)::int AS n FROM canonical_track_display ctd WHERE ${FEAT_CORRUPTION_SQL}`,
    [],
  );

  await writeFile(
    join(options.outDir, `feat-corruption-repair-${stamp}.json`),
    JSON.stringify({ plans, skipped, repaired, remainingCorrupt: remaining[0]?.n ?? null }, null, 2),
    "utf8",
  );

  return {
    scannedAt: new Date().toISOString(),
    backupPath,
    totalCorrupt: audit.affectedRvtrCount,
    planned: plans,
    repaired,
    skipped,
  };
}
