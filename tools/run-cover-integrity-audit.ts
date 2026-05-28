/**
 * Canonical cover integrity audit (read-only — no artwork writes).
 *
 * Usage:
 *   npm run cover:audit
 *   RETROVERSE_COVER_FS_ROOT=/path/to/public npm run cover:audit
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { runCoverIntegrityAudit } from "../lib/cover-integrity/run-audit";
import { persistTrustRegistry } from "../lib/cover-integrity/trust-registry";

function bandLine(summary: Awaited<ReturnType<typeof runCoverIntegrityAudit>>["summary"]) {
  const d = summary.confidenceDistribution;
  return `HIGH ${d.HIGH} · MEDIUM ${d.MEDIUM} · LOW ${d.LOW} · VERY_SUSPICIOUS ${d.VERY_SUSPICIOUS}`;
}

async function main() {
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports/cover_integrity");

  console.log("Cover integrity audit — read-only\n");
  const { summary, auditCsv, highRiskCsv, reusedCsv, repairQueueCsv, trustRegistry, rows } =
    await runCoverIntegrityAudit();

  await mkdir(outDir, { recursive: true });
  const paths = {
    audit: join(outDir, "cover_audit.csv"),
    highRisk: join(outDir, "high_risk_mismatches.csv"),
    reused: join(outDir, "reused_covers.csv"),
    summary: join(outDir, "summary.json"),
    repairQueue: join(outDir, "repair_queue.csv"),
    trustRegistry: join(outDir, "trust_registry.json"),
  };

  await Promise.all([
    writeFile(paths.audit, auditCsv),
    writeFile(paths.highRisk, highRiskCsv),
    writeFile(paths.reused, reusedCsv),
    writeFile(paths.repairQueue, repairQueueCsv),
    writeFile(paths.summary, JSON.stringify(summary, null, 2)),
    persistTrustRegistry(outDir, trustRegistry),
  ]);

  console.log(`PG albums (RVAL):     ${summary.totalPgAlbumsWithRval}`);
  console.log(`With canonical path:  ${summary.totalWithCanonicalPath}`);
  console.log(`Missing path:         ${summary.totalMissingPath}`);
  console.log(`File missing on disk: ${summary.totalFileMissingOnDisk}`);
  console.log(`Files hashed:         ${summary.totalFilesHashed}`);
  console.log(`Orphan cover files:   ${summary.totalOrphanCoverFiles}`);
  console.log(`Confidence:           ${bandLine(summary)}`);
  console.log(`Assigned VERY_SUSP:  ${summary.suspiciousCount}`);
  console.log(`Missing assignment: ${summary.missingAssignmentCount}`);
  console.log(`Norm drift flags:     ${summary.normalizationDriftCount}`);
  console.log(`Same-artist hash dup: ${summary.sameArtistSubstitutionCount}`);
  console.log(
    `Trust tiers:          TRUSTED ${summary.trustTierCounts.TRUSTED} · REVIEW ${summary.trustTierCounts.REVIEW} · HIGH_RISK ${summary.trustTierCounts.HIGH_RISK} · BROKEN ${summary.trustTierCounts.BROKEN}`,
  );
  console.log(`Repair queue:         ${summary.repairQueueCount}`);
  console.log(`\nTop reused hashes:`);
  for (const h of summary.topReusedHashes.slice(0, 5)) {
    console.log(`  ${h.hash.slice(0, 12)}… → ${h.albumCount} albums (${h.sampleRvals.join(", ")})`);
  }

  const elton = summary.spotChecks;
  console.log(`\nElton John spot check:`);
  if (elton.eltonTooLowForZero) {
    const e = elton.eltonTooLowForZero;
    console.log(
      `  Too Low For Zero (${e.rval}): band=${e.confidenceBand} score=${e.confidenceScore} hash=${e.fileHash?.slice(0, 12) ?? "—"}`,
    );
  }
  if (elton.eltonCaribou) {
    const e = elton.eltonCaribou;
    console.log(
      `  Caribou (${e.rval}): band=${e.confidenceBand} score=${e.confidenceScore} hash=${e.fileHash?.slice(0, 12) ?? "—"}`,
    );
  }
  console.log(`  Shared image hash: ${elton.eltonSharedHash ? "YES" : "no"}`);

  console.log(
    `\nWrote:\n  ${paths.audit}\n  ${paths.highRisk}\n  ${paths.reused}\n  ${paths.repairQueue}\n  ${paths.trustRegistry}\n  ${paths.summary}`,
  );
  console.log(`\nAudit rows: ${rows.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
