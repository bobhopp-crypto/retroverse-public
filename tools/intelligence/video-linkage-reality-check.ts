#!/usr/bin/env npx tsx
/**
 * VIDEO linkage reality check — multi-bucket identification audit.
 *
 * Usage:
 *   npm run intelligence:linkage-reality
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadVideoUniverse } from "../../lib/ops/intelligence/video-universe.ts";
import { auditVideoIdentification } from "../../lib/ops/intelligence/video-identification.ts";
import {
  computeVideoPriorityScore,
  loadVideoPriorityContext,
} from "../../lib/ops/intelligence/video-priority-score.ts";
import { scanVdjDatabase, vdjDatabasePath } from "../../lib/ops/intelligence/vdj-database.ts";

const OUT = join(process.cwd(), "reports/intelligence");
const TOP_N = 100;

async function main() {
  await mkdir(OUT, { recursive: true });

  const universe = await loadVideoUniverse();
  const { counts, results } = await auditVideoIdentification(universe.videos);
  const vdjByPath = new Map(
    (await scanVdjDatabase()).entries.map((e) => [e.filePathNorm, e]),
  );
  const priorityCtx = await loadVideoPriorityContext();

  const top100 = results.slice(0, TOP_N);
  const top100Stats = {
    directRvtr: top100.filter((r) => r.directRvtr).length,
    identifiable: top100.filter((r) => r.identifiable).length,
    coverMatch: top100.filter((r) => r.coverMatch).length,
    researchReady: top100.filter((r) => r.researchReady).length,
    packageReady: top100.filter((r) => r.packageReady).length,
  };

  const verdict =
    counts.totalIdentifiable > counts.legacyLinkedOnly * 1.5
      ? "**B — Counting/query problem.** The 206-style direct-link metric undercounts Retroverse-identifiable videos."
      : counts.totalIdentifiable <= counts.legacyLinkedOnly * 1.1
        ? "**A — True linkage problem.** Identification paths converge near the direct-link count."
        : "**Mixed.** Some uplift from title/artist and path matching, but linkage remains the main gap.";

  const lines = [
    "# VIDEO Linkage Reality Check",
    "",
    `Generated: ${new Date().toISOString()}`,
    `VDJ source: \`${vdjDatabasePath()}\``,
    `VIDEO files scanned: ${counts.videoFiles.toLocaleString()}`,
    "",
    "## Verdict",
    "",
    verdict,
    "",
    "Prior dashboard metric **Videos with RVTR** counted **direct `media_track_links` path matches only** (plus a 300-song title/artist cap). This audit evaluates **all Retroverse identification paths**.",
    "",
    "## Identification Buckets (VIDEO files)",
    "",
    "| Category | Count | % of VIDEO |",
    "| --- | ---: | ---: |",
    `| Direct RVTR Link (\`media_track_links\`) | ${counts.directRvtr.toLocaleString()} | ${pct(counts.directRvtr, counts.videoFiles)}% |`,
    `| Has \`media_track_links\` (any) | ${counts.hasMediaTrackLink.toLocaleString()} | ${pct(counts.hasMediaTrackLink, counts.videoFiles)}% |`,
    `| Path Match (\`media_assets\`) | ${counts.pathMatch.toLocaleString()} | ${pct(counts.pathMatch, counts.videoFiles)}% |`,
    `| Cover Match | ${counts.coverMatch.toLocaleString()} | ${pct(counts.coverMatch, counts.videoFiles)}% |`,
    `| Title/Artist Match | ${counts.titleArtistMatch.toLocaleString()} | ${pct(counts.titleArtistMatch, counts.videoFiles)}% |`,
    `| **Total Identifiable Videos** | **${counts.totalIdentifiable.toLocaleString()}** | **${pct(counts.totalIdentifiable, counts.videoFiles)}%** |`,
    "",
    "## Pipeline Readiness",
    "",
    "| Stage | Count |",
    "| --- | ---: |",
    `| Research-ready (VDJ artist + title) | ${counts.researchReady.toLocaleString()} |`,
    `| Package-ready (identifiable or cover) | ${counts.packageReady.toLocaleString()} |`,
    `| Unique RVTRs resolved | ${counts.uniqueRvtrs.toLocaleString()} |`,
    `| Legacy linked-only metric | ${counts.legacyLinkedOnly.toLocaleString()} |`,
    "",
    `## Top ${TOP_N} Most-Played VIDEO Tracks`,
    "",
    "| Metric | Count | % of top 100 |",
    "| --- | ---: | ---: |",
    `| Direct RVTR | ${top100Stats.directRvtr} | ${top100Stats.directRvtr}% |`,
    `| Identifiable (any path) | ${top100Stats.identifiable} | ${top100Stats.identifiable}% |`,
    `| Cover | ${top100Stats.coverMatch} | ${top100Stats.coverMatch}% |`,
    `| Research-ready | ${top100Stats.researchReady} | ${top100Stats.researchReady}% |`,
    `| Package-ready | ${top100Stats.packageReady} | ${top100Stats.packageReady}% |`,
    "",
    "## Top 25 by Play Count",
    "",
    "| Plays | Title | Artist | RVTR | Methods | Priority |",
    "| ---: | --- | --- | --- | --- | ---: |",
  ];

  for (const r of top100.slice(0, 25)) {
    const vdj = vdjByPath.get(r.filePathNorm);
    const priority = computeVideoPriorityScore(
      r,
      { playCount: vdj?.playCount ?? r.playCount, lastPlayed: vdj?.lastPlayed ?? null },
      priorityCtx,
    );
    const methods = [
      r.directRvtr ? "RVTR" : null,
      r.pathMatch ? "path" : null,
      r.titleArtistMatch ? "title" : null,
      r.coverMatch ? "cover" : null,
    ]
      .filter(Boolean)
      .join("+") || "—";
    lines.push(
      `| ${r.playCount.toLocaleString()} | ${r.title} | ${r.artist} | ${r.rvtr ?? "—"} | ${methods} | ${priority.score.toLocaleString()} |`,
    );
  }

  lines.push(
    "",
    "## Intelligence Rule",
    "",
    "Research does **not** require RVTR. Any VIDEO with VDJ **Artist + Title** may enter:",
    "",
    "```text",
    "VIDEO → Artist → Title → Research → Candidate Package",
    "```",
    "",
    "RVTR remains preferred for canon. VDJ metadata is captured first (VDJ-first).",
    "",
    "## Recommendation",
    "",
    "1. Use **Total Identifiable** as the planning number, not direct-link only",
    "2. Sort all queues by **Priority Score** (play count + Sunday Nights + workspace + cover)",
    "3. Expand `media_track_links` for high-priority unlinked paths still in `media_assets`",
    "",
  );

  const reportPath = join(OUT, "video-linkage-reality-check.md");
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  await writeFile(
    join(OUT, "video-linkage-reality-check.json"),
    `${JSON.stringify({ counts, top100Stats, top100: top100.slice(0, TOP_N) }, null, 2)}\n`,
    "utf8",
  );

  console.log("\nVIDEO Linkage Reality Check\n");
  console.log(`  VIDEO files:        ${counts.videoFiles.toLocaleString()}`);
  console.log(`  Direct RVTR:        ${counts.directRvtr.toLocaleString()} (legacy metric)`);
  console.log(`  Path match:         ${counts.pathMatch.toLocaleString()}`);
  console.log(`  Title/artist:       ${counts.titleArtistMatch.toLocaleString()}`);
  console.log(`  TOTAL IDENTIFIABLE: ${counts.totalIdentifiable.toLocaleString()}`);
  console.log(`  Research-ready:     ${counts.researchReady.toLocaleString()}`);
  console.log(`\n  Top ${TOP_N} identifiable: ${top100Stats.identifiable}%`);
  console.log(`\nReport: ${reportPath}\n`);
}

function pct(n: number, total: number): string {
  return total > 0 ? String(Math.round((n / total) * 100)) : "0";
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
