/**
 * Post-audit catalog verification (read-only).
 * Usage: npm run cover:verify
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { runCoverIntegrityAudit } from "../lib/cover-integrity/run-audit";
import { verifyCatalogSlices } from "../lib/cover-integrity/verify-catalog";

async function main() {
  const root = join(import.meta.dirname, "..");
  const { rows } = await runCoverIntegrityAudit();
  const report = verifyCatalogSlices(rows);

  const elton = rows.filter((r) => r.artist.toLowerCase().includes("elton john"));
  const eltonHighRisk = elton.filter((r) => r.trustTier === "HIGH_RISK" || r.trustTier === "BROKEN");
  const trustedUnchanged = rows.filter((r) => r.trustTier === "TRUSTED").length;

  let registryTrusted = 0;
  try {
    const reg = JSON.parse(
      await readFile(join(root, "reports/cover_integrity/trust_registry.json"), "utf8"),
    ) as { tierCounts?: { TRUSTED?: number } };
    registryTrusted = reg.tierCounts?.TRUSTED ?? 0;
  } catch {
    // optional if audit not written yet
  }

  console.log("Cover repair verification\n");
  console.log(`TRUSTED (in-memory):  ${trustedUnchanged}`);
  if (registryTrusted) console.log(`TRUSTED (registry):   ${registryTrusted}`);
  console.log(`Elton HIGH_RISK/BROKEN: ${eltonHighRisk.length} / ${elton.length} albums\n`);

  for (const a of report.artists) {
    console.log(
      `${a.slug}: ${a.albumCount} albums · TRUSTED ${a.trusted} · REVIEW ${a.review} · HIGH_RISK ${a.highRisk} · BROKEN ${a.broken} · same-artist dup ${a.sameArtistSubstitutions}`,
    );
  }

  console.log(
    `\nCompilations/live/greatest-hits slice: ${report.compilations.total} albums · HIGH_RISK ${report.compilations.highRisk} · REVIEW ${report.compilations.review}`,
  );
  console.log("\nNo covers were modified.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
