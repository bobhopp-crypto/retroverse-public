import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { inspectExecute, inspectPing, inspectQuery } from "@/lib/inspect/pg";

import {
  buildFeatCorruptionRepairPlans,
  type FeatCorruptionRepairResult,
} from "./repair-feat-corruption";
import { FEAT_CORRUPTION_SQL, runGraphIntegrityAudit } from "./graph-integrity-audit";

export type Hot100KeyRepairPlan = {
  rvtr: string;
  identitySource: string;
  artist: string;
  beforeCanonicalTitle: string;
  afterCanonicalTitle: string;
  beforeNormalizedTitleKey: string;
  afterNormalizedTitleKey: string;
  graphTitle: string;
  peakHot100: number | null;
};

export type Hot100KeyRepairResult = {
  scannedAt: string;
  backupPath: string;
  candidateCount: number;
  planned: Hot100KeyRepairPlan[];
  repaired: number;
  skipped: Array<{ rvtr: string; reason: string }>;
  validation: {
    remainingHot100KeyMismatch: number;
    remainingHot100FeatCorruption: number;
  };
};

/** Same normalization used by phase-1 repair validation. */
export function normalizedTitleKeyFromGraphTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keyMatchesGraphTitle(graphTitle: string, normalizedTitleKey: string): boolean {
  return normalizedTitleKeyFromGraphTitle(graphTitle) === normalizedTitleKey.trim().toLowerCase();
}

export function buildHot100KeyRepairPlans(
  rows: Awaited<ReturnType<typeof runGraphIntegrityAudit>>["allCorruptRows"],
  skipped: FeatCorruptionRepairResult["skipped"],
): { plans: Hot100KeyRepairPlan[]; skipped: Hot100KeyRepairResult["skipped"] } {
  const skipByRvtr = new Map(skipped.map((s) => [s.rvtr, s.reason]));
  const plans: Hot100KeyRepairPlan[] = [];
  const skippedOut: Hot100KeyRepairResult["skipped"] = [];

  for (const row of rows) {
    const reason = skipByRvtr.get(row.rvtr);
    if (reason !== "normalized_key_mismatch") continue;

    if (row.identitySource !== "hot100") {
      skippedOut.push({ rvtr: row.rvtr, reason: "not_hot100_identity" });
      continue;
    }

    const graph = row.graphTitle?.trim();
    if (!graph) {
      skippedOut.push({ rvtr: row.rvtr, reason: "no_graph_title" });
      continue;
    }
    if (/\bFeat\b/i.test(graph)) {
      skippedOut.push({ rvtr: row.rvtr, reason: "graph_title_corrupt" });
      continue;
    }
    if (graph === row.canonicalTitle && keyMatchesGraphTitle(graph, row.normalizedTitleKey)) {
      skippedOut.push({ rvtr: row.rvtr, reason: "already_clean" });
      continue;
    }

    const afterKey = normalizedTitleKeyFromGraphTitle(graph);
    if (!afterKey) {
      skippedOut.push({ rvtr: row.rvtr, reason: "empty_normalized_key_from_graph" });
      continue;
    }

    plans.push({
      rvtr: row.rvtr,
      identitySource: row.identitySource,
      artist: row.artist,
      beforeCanonicalTitle: row.canonicalTitle,
      afterCanonicalTitle: graph,
      beforeNormalizedTitleKey: row.normalizedTitleKey,
      afterNormalizedTitleKey: afterKey,
      graphTitle: graph,
      peakHot100: row.peakHot100,
    });
  }

  return { plans, skipped: skippedOut };
}

async function countRemainingHot100KeyMismatch(): Promise<number> {
  const audit = await runGraphIntegrityAudit();
  const { skipped } = buildFeatCorruptionRepairPlans(audit.allCorruptRows);
  return skipped.filter(
    (s) =>
      s.reason === "normalized_key_mismatch" &&
      audit.allCorruptRows.some((r) => r.rvtr === s.rvtr && r.identitySource === "hot100"),
  ).length;
}

async function countRemainingHot100FeatCorruption(): Promise<number> {
  const rows = await inspectQuery<{ n: number }>(
    `
    SELECT count(*)::int AS n
    FROM canonical_track_display ctd
    WHERE ${FEAT_CORRUPTION_SQL}
      AND ctd.identity_source = 'hot100'
    `,
    [],
  );
  return rows[0]?.n ?? 0;
}

export async function repairHot100NormalizedTitleKeys(options: {
  outDir: string;
  dryRun?: boolean;
}): Promise<Hot100KeyRepairResult> {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error("Postgres unavailable");

  await mkdir(options.outDir, { recursive: true });
  const audit = await runGraphIntegrityAudit();
  const { skipped } = buildFeatCorruptionRepairPlans(audit.allCorruptRows);
  const { plans, skipped: planSkipped } = buildHot100KeyRepairPlans(audit.allCorruptRows, skipped);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(options.outDir, `hot100-key-repair-backup-${stamp}.json`);
  await writeFile(
    backupPath,
    JSON.stringify(
      {
        scannedAt: new Date().toISOString(),
        plans,
        skipped: planSkipped,
        sourceRows: audit.allCorruptRows.filter((r) =>
          plans.some((p) => p.rvtr === r.rvtr),
        ),
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
      candidateCount: skipped.filter((s) => s.reason === "normalized_key_mismatch").length,
      planned: plans,
      repaired: 0,
      skipped: planSkipped,
      validation: {
        remainingHot100KeyMismatch: await countRemainingHot100KeyMismatch(),
        remainingHot100FeatCorruption: await countRemainingHot100FeatCorruption(),
      },
    };
  }

  let repaired = 0;
  for (const plan of plans) {
    const ct = await inspectExecute(
      `
      UPDATE canonical_tracks
      SET canonical_title = $1,
          normalized_title_key = $2,
          updated_at = now()
      WHERE upper(trim(coalesce(retroverse_track_id, track_id::text))) = $3
      `,
      [plan.afterCanonicalTitle, plan.afterNormalizedTitleKey, plan.rvtr],
    );
    const st = await inspectExecute(
      `
      UPDATE staging_canonical_track_imports
      SET canonical_title = $1,
          normalized_title_key = $2
      WHERE upper(trim(coalesce(retroverse_track_id, track_id::text))) = $3
      `,
      [plan.afterCanonicalTitle, plan.afterNormalizedTitleKey, plan.rvtr],
    );
    if (ct > 0 || st > 0) repaired += 1;
  }

  await writeFile(
    join(options.outDir, `hot100-key-repair-${stamp}.json`),
    JSON.stringify({ plans, repaired, skipped: planSkipped }, null, 2),
    "utf8",
  );

  return {
    scannedAt: new Date().toISOString(),
    backupPath,
    candidateCount: skipped.filter((s) => s.reason === "normalized_key_mismatch").length,
    planned: plans,
    repaired,
    skipped: planSkipped,
    validation: {
      remainingHot100KeyMismatch: await countRemainingHot100KeyMismatch(),
      remainingHot100FeatCorruption: await countRemainingHot100FeatCorruption(),
    },
  };
}

export function formatHot100KeyRepairMarkdown(result: Hot100KeyRepairResult): string {
  const examples = result.planned.slice(0, 20);
  return `# Canonical Title Repair — Phase 2

**Executed:** ${result.scannedAt}  
Repairs **hot100** \`normalized_key_mismatch\` rows only. No VDJ identities touched. No label or matching changes.

---

## Summary

| Metric | Count |
|--------|------:|
| Key-mismatch candidates (hot100) | ${result.candidateCount} |
| Repair plans | ${result.planned.length} |
| **Rows repaired** | **${result.repaired}** |
| Skipped during planning | ${result.skipped.length} |

---

## Validation

| Check | Count |
|-------|------:|
| Remaining hot100 \`normalized_key_mismatch\` | **${result.validation.remainingHot100KeyMismatch}** |
| Remaining hot100 feat-corruption RVTRs | **${result.validation.remainingHot100FeatCorruption}** |

${result.validation.remainingHot100KeyMismatch === 0 ? "✓ No remaining hot100 normalized_key_mismatch rows." : "⚠ Remaining hot100 key mismatches detected."}

---

## Before / After examples

| RVTR | Artist | Before canonical | After canonical | Before key | After key |
|------|--------|------------------|-----------------|------------|-----------|
${examples
  .map(
    (p) =>
      `| \`${p.rvtr}\` | ${p.artist.replace(/\|/g, "\\|")} | ${p.beforeCanonicalTitle.replace(/\|/g, "\\|")} | ${p.afterCanonicalTitle.replace(/\|/g, "\\|")} | ${p.beforeNormalizedTitleKey.replace(/\|/g, "\\|")} | ${p.afterNormalizedTitleKey.replace(/\|/g, "\\|")} |`,
  )
  .join("\n")}

${result.planned.length > examples.length ? `\n_Showing ${examples.length} of ${result.planned.length} repaired rows._\n` : ""}

---

## Source of truth

- \`tracks.title\` (primary graph track) → \`canonical_title\`
- Same title → rebuilt \`normalized_title_key\`

Backup: \`${result.backupPath}\`

---

## Outputs

- \`AUDIT.md\`
- \`repair-result.json\`
- \`repair-plans.csv\`
`;
}

export function repairPlansToCsv(plans: Hot100KeyRepairPlan[]): string {
  const header = [
    "rvtr",
    "identitySource",
    "artist",
    "beforeCanonicalTitle",
    "afterCanonicalTitle",
    "beforeNormalizedTitleKey",
    "afterNormalizedTitleKey",
    "graphTitle",
    "peakHot100",
  ].join(",");
  const esc = (v: string | number | null | undefined) => {
    const raw = v == null ? "" : String(v);
    return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  };
  return [
    header,
    ...plans.map((p) =>
      [
        p.rvtr,
        p.identitySource,
        p.artist,
        p.beforeCanonicalTitle,
        p.afterCanonicalTitle,
        p.beforeNormalizedTitleKey,
        p.afterNormalizedTitleKey,
        p.graphTitle,
        p.peakHot100,
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}
