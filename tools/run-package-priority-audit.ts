/**
 * Package Prioritization Audit (Phase 5D) — owned VIDEO tracks readiness.
 *
 * Usage: npm run ops:package-priority-audit
 */
require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { inspectPing } from "../lib/inspect/pg";

function csvEscape(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error(`Postgres unavailable: ${ping.error ?? "unknown"}`);
    process.exit(1);
  }

  const { auditPackagePriority } = await import("../lib/ops/package-priority-audit");
  const audit = await auditPackagePriority();

  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports", "package-priority-audit");
  await mkdir(outDir, { recursive: true });

  const summaryMd = `# Package Priority Audit

**Scanned:** ${audit.scannedAt}

Owned VIDEO tracks with RVTR labels — readiness for package work.

## Summary

| Metric | Count | % |
|--------|------:|--:|
| Owned VIDEO + RVTR | ${audit.ownedVideoCount} | 100% |
| Package | ${audit.withPackage} | ${audit.packagePct}% |
| Cover | ${audit.withCover} | ${audit.coverPct}% |
| Chart history (Hot 100) | ${audit.withChartHistory} | ${audit.chartPct}% |
| Artist data | ${audit.withArtistData} | ${audit.artistPct}% |
| Playback link | ${audit.withPlaybackLink} | ${audit.playbackPct}% |
| Fully ready (all + artifacts) | ${audit.fullyReady} | ${audit.readyPct}% |

## Recommendation

Prioritize **owned videos first** — ${audit.ownedVideoCount - audit.withPackage} tracks still need packages; ${audit.ownedVideoCount - audit.withCover} need covers.

## Outputs

- \`summary.json\`
- \`owned-videos-readiness.csv\`
`;

  const csvHeader = [
    "rvtr",
    "artist",
    "title",
    "playCount",
    "hasPackage",
    "hasCover",
    "hasChartHistory",
    "hasArtistData",
    "hasPlaybackLink",
    "packageStatus",
    "filePath",
  ].join(",");

  const csvLines = audit.rows.map((row) =>
    [
      row.rvtr,
      row.artist,
      row.title,
      row.playCount,
      row.hasPackage ? "yes" : "no",
      row.hasCover ? "yes" : "no",
      row.hasChartHistory ? "yes" : "no",
      row.hasArtistData ? "yes" : "no",
      row.hasPlaybackLink ? "yes" : "no",
      row.packageStatus,
      row.filePath,
    ]
      .map(csvEscape)
      .join(","),
  );

  await Promise.all([
    writeFile(join(outDir, "AUDIT.md"), summaryMd, "utf8"),
    writeFile(join(outDir, "summary.json"), JSON.stringify(audit, null, 2), "utf8"),
    writeFile(join(outDir, "owned-videos-readiness.csv"), [csvHeader, ...csvLines].join("\n"), "utf8"),
  ]);

  console.log("Package Priority Audit");
  console.log(`  Owned VIDEO + RVTR: ${audit.ownedVideoCount}`);
  console.log(`  Package:            ${audit.withPackage} (${audit.packagePct}%)`);
  console.log(`  Cover:              ${audit.withCover} (${audit.coverPct}%)`);
  console.log(`  Chart history:      ${audit.withChartHistory} (${audit.chartPct}%)`);
  console.log(`  Artist data:        ${audit.withArtistData} (${audit.artistPct}%)`);
  console.log(`  Playback link:      ${audit.withPlaybackLink} (${audit.playbackPct}%)`);
  console.log(`  Fully ready:        ${audit.fullyReady} (${audit.readyPct}%)`);
  console.log(`\nWrote: ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
