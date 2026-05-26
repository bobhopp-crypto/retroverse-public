/**
 * Album-link recovery preview (no writes).
 * Usage: npm run track:audit-album-links
 *        npm run track:audit-album-links -- RVTR430551
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { auditTrackAlbumLinks } from "../lib/track/album-link-recovery/audit-track";
import { runAlbumLinkRecoveryAudit } from "../lib/track/album-link-recovery/audit-missing-links";
import {
  formatRecoverySummary,
  formatTrackAudit,
} from "../lib/track/album-link-recovery/format-report";

async function main() {
  const singleRvtr = process.argv[2]?.trim().toUpperCase();
  const root = join(import.meta.dirname, "..");

  let markdown: string;
  let json: unknown;

  if (singleRvtr) {
    const audit = await auditTrackAlbumLinks(singleRvtr);
    if (!audit) {
      console.error(`Track not found: ${singleRvtr}`);
      process.exit(1);
    }
    markdown = formatTrackAudit(audit);
    json = audit;
  } else {
    const report = await runAlbumLinkRecoveryAudit({
      sampleCount: 5,
      fixedRvtrs: ["RVTR430551", "RVTR336241"],
    });
    markdown = formatRecoverySummary(report);
    json = report;
  }

  const outDir = join(root, "tools/out");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "album-link-recovery-report.json");
  await writeFile(outPath, JSON.stringify(json, null, 2));

  console.log(markdown);
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
