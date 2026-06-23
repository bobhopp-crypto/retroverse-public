#!/usr/bin/env npx tsx
/**
 * Canonical Retroverse Year Intelligence Builder.
 *
 * Generates existing Song Packages from VDJ VIDEO entries for one VDJ year.
 *
 * Usage:
 *   npm run intelligence -- 1965
 *   npm run intelligence -- 1965 --dry-run
 *   npm run intelligence -- 1965 --limit 25
 *   npm run intelligence -- 1965 --force
 *   npm run intelligence -- 1965 --min-playcount 5
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadCoverInfoForRvtrs } from "../../lib/ops/intelligence/load-rvtr-covers.ts";
import { processSong } from "../../lib/ops/intelligence/process-song.ts";
import {
  loadSongPackage,
  loadSongPackageIndex,
} from "../../lib/ops/intelligence/song-package-store.ts";
import type { SongPackageStatus } from "../../lib/ops/intelligence/song-package-types.ts";
import {
  scanVdjDatabase,
  type VdjLibraryEntry,
} from "../../lib/ops/intelligence/vdj-database.ts";
import { resolveRvtrsForVdjLibrary } from "../../lib/ops/intelligence/vdj-rvtr-resolve.ts";
import { filterIntelligenceVideos } from "../../lib/ops/intelligence/video-universe.ts";

const OUT_DIR = join(process.cwd(), "reports", "intelligence");
const DEFAULT_RUNTIME_MS = 42_000;

type Args = {
  year: number;
  dryRun: boolean;
  force: boolean;
  limit: number | null;
  minPlayCount: number | null;
};

type ResolvedVideoRow = {
  entry: VdjLibraryEntry;
  rvtr: string;
  canonicalArtist: string;
  canonicalTitle: string;
  method: string;
};

type PackageRow = {
  rvtr: string;
  artist: string;
  title: string;
  videoCount: number;
  maxPlayCount: number;
  coverPresent: boolean;
  coverSource: string | null;
  coverUrl: string | null;
  hadExistingPackage: boolean;
  existingStatus: SongPackageStatus | null;
  action: "existing_skipped" | "dry_run" | "not_selected" | "generated" | "failed";
  runtimeMs: number | null;
  error: string | null;
};

type RunSummary = {
  generatedAt: string;
  year: number;
  dryRun: boolean;
  force: boolean;
  limit: number | null;
  minPlayCount: number | null;
  scanPath: string;
  scanParseMs: number;
  totalVideoTracks: number;
  resolvedVideoTracks: number;
  unresolvedVideoTracks: number;
  uniqueResolvedRvtrs: number;
  coverPresent: number;
  coverMissing: number;
  packagesExisting: number;
  packagesGenerated: number;
  packagesFailed: number;
  packagesWouldGenerate: number;
  runtimeMs: number;
  estimatedCompletionMinutes: number;
  reportPaths: {
    summary: string;
    inventory: string;
    unresolved: string;
  };
};

function parseArgs(argv: string[]): Args {
  let year: number | null = null;
  let dryRun = false;
  let force = false;
  let limit: number | null = null;
  let minPlayCount: number | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--force") force = true;
    else if (arg === "--limit" && argv[i + 1]) limit = Number(argv[++i]);
    else if (arg === "--min-playcount" && argv[i + 1]) minPlayCount = Number(argv[++i]);
    else if (!arg.startsWith("--") && year == null) year = Number(arg);
  }

  if (!Number.isInteger(year) || year == null || year < 1900 || year > 2100) {
    console.error("Usage: npm run intelligence -- <year> [--dry-run] [--force] [--limit N] [--min-playcount N]");
    process.exit(1);
  }
  if (limit != null && (!Number.isFinite(limit) || limit < 1)) {
    console.error("--limit must be a positive number");
    process.exit(1);
  }
  if (minPlayCount != null && (!Number.isFinite(minPlayCount) || minPlayCount < 0)) {
    console.error("--min-playcount must be zero or greater");
    process.exit(1);
  }

  return { year, dryRun, force, limit, minPlayCount };
}

function playCount(entry: VdjLibraryEntry): number {
  return entry.playCount ?? 0;
}

function sortVideos(a: VdjLibraryEntry, b: VdjLibraryEntry): number {
  return (
    playCount(b) - playCount(a) ||
    a.artist.localeCompare(b.artist) ||
    a.title.localeCompare(b.title) ||
    a.filePath.localeCompare(b.filePath)
  );
}

function packageSort(a: PackageRow, b: PackageRow): number {
  return b.maxPlayCount - a.maxPlayCount || a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
}

function reportPath(year: number, kind: "summary" | "inventory" | "unresolved"): string {
  const ext = kind === "unresolved" ? "json" : "md";
  return join(OUT_DIR, `year-${year}-${kind}.${ext}`);
}

function unresolvedRow(entry: VdjLibraryEntry) {
  return {
    artist: entry.artist,
    title: entry.title,
    album: entry.album,
    year: entry.year,
    playCount: entry.playCount,
    filePath: entry.filePath,
    user1: entry.user1,
    user2: entry.user2,
  };
}

function fmtMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 1000)}s`;
}

function pct(n: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

function statusCounts(rows: PackageRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = row.existingStatus ?? "none";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function mdTable(rows: string[][]): string {
  if (rows.length === 0) return "";
  const [head, ...body] = rows;
  return [
    `| ${head!.join(" | ")} |`,
    `| ${head!.map(() => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function buildSummaryMarkdown(summary: RunSummary, packageRows: PackageRow[]): string {
  const status = statusCounts(packageRows);
  const statusLines = Object.entries(status)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `| ${k} | ${v} |`);

  return `# Year Intelligence Builder — ${summary.year}

Generated: ${summary.generatedAt}

Mode: ${summary.dryRun ? "**DRY RUN**" : "**GENERATE**"}  
Force rebuild: ${summary.force ? "yes" : "no"}  
Limit: ${summary.limit ?? "none"}  
Minimum play count: ${summary.minPlayCount ?? "none"}

## Summary

| Metric | Count |
| --- | ---: |
| Total VIDEO tracks found | **${summary.totalVideoTracks}** |
| RVTR resolved video rows | **${summary.resolvedVideoTracks}** |
| RVTR unresolved video rows | **${summary.unresolvedVideoTracks}** |
| Unique resolved RVTRs | **${summary.uniqueResolvedRvtrs}** |
| Cover present | **${summary.coverPresent}** |
| Cover missing | **${summary.coverMissing}** |
| Packages already existing | **${summary.packagesExisting}** |
| Packages generated | **${summary.packagesGenerated}** |
| Packages that would generate | **${summary.packagesWouldGenerate}** |
| Failures | **${summary.packagesFailed}** |
| Runtime | **${fmtMs(summary.runtimeMs)}** |
| Estimated completion time | **~${summary.estimatedCompletionMinutes} min** |

## Package Status Counts

| Status | Count |
| --- | ---: |
${statusLines.join("\n") || "| none | 0 |"}

## Cover Status

Cover status is informational only. It does **not** block package creation.

| Status | Count | Rate |
| --- | ---: | ---: |
| Cover present | ${summary.coverPresent} | ${pct(summary.coverPresent, summary.uniqueResolvedRvtrs)} |
| Cover missing | ${summary.coverMissing} | ${pct(summary.coverMissing, summary.uniqueResolvedRvtrs)} |

## Reports

- Summary: \`${summary.reportPaths.summary}\`
- Inventory: \`${summary.reportPaths.inventory}\`
- Unresolved: \`${summary.reportPaths.unresolved}\`
`;
}

function buildInventoryMarkdown(summary: RunSummary, videos: VdjLibraryEntry[], packageRows: PackageRow[]): string {
  const topRows = videos.slice(0, 25).map((entry) => [
    String(entry.playCount ?? 0),
    entry.artist || "—",
    entry.title || "—",
    entry.album || "—",
    entry.year == null ? "—" : String(entry.year),
    entry.filePath,
  ]);

  const generatedRows = packageRows
    .filter((row) => row.action === "generated")
    .sort(packageSort)
    .map((row) => [
      row.rvtr,
      row.artist,
      row.title,
      String(row.maxPlayCount),
      row.coverPresent ? "yes" : "no",
      fmtMs(row.runtimeMs),
    ]);

  const packageRowsMd = packageRows
    .sort(packageSort)
    .map((row) => [
      row.rvtr,
      row.artist,
      row.title,
      String(row.videoCount),
      String(row.maxPlayCount),
      row.coverPresent ? "present" : "missing",
      row.existingStatus ?? "none",
      row.action,
      row.error ?? "—",
    ]);

  return `# Year Intelligence Inventory — ${summary.year}

Generated: ${summary.generatedAt}

## Top 25 By Play Count

${mdTable([["Plays", "Artist", "Title", "Album", "Year", "File"], ...topRows])}

## Package Status Counts

${mdTable([["Status", "Count"], ...Object.entries(statusCounts(packageRows)).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)])])}

## Generated Packages

${generatedRows.length ? mdTable([["RVTR", "Artist", "Title", "Max Plays", "Cover", "Runtime"], ...generatedRows]) : "_None in this run._"}

## Resolved RVTR Inventory

${packageRowsMd.length ? mdTable([["RVTR", "Artist", "Title", "Videos", "Max Plays", "Cover", "Existing Package", "Action", "Error"], ...packageRowsMd]) : "_No resolved RVTRs._"}
`;
}

async function writeReports(summary: RunSummary, videos: VdjLibraryEntry[], packageRows: PackageRow[], unresolved: VdjLibraryEntry[]) {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(summary.reportPaths.summary, buildSummaryMarkdown(summary, packageRows), "utf8");
  await writeFile(summary.reportPaths.inventory, buildInventoryMarkdown(summary, videos, packageRows), "utf8");
  await writeFile(
    summary.reportPaths.unresolved,
    `${JSON.stringify({
      generatedAt: summary.generatedAt,
      year: summary.year,
      total: unresolved.length,
      tracks: unresolved.map(unresolvedRow),
    }, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const started = Date.now();

  console.log(`\nRetroverse Year Intelligence Builder — ${args.year}`);
  console.log(`  dryRun=${args.dryRun} force=${args.force} limit=${args.limit ?? "none"} minPlayCount=${args.minPlayCount ?? "none"}`);
  console.log("  source=VirtualDJ VIDEO · packageFormat=existing Song Package · cover=informational\n");

  const scan = await scanVdjDatabase();
  const videos = filterIntelligenceVideos(scan.entries)
    .filter((entry) => entry.year === args.year)
    .filter((entry) => args.minPlayCount == null || playCount(entry) >= args.minPlayCount)
    .sort(sortVideos);

  const mapping = await resolveRvtrsForVdjLibrary(videos);
  const resolvedRows: ResolvedVideoRow[] = [];
  const unresolved: VdjLibraryEntry[] = [];

  for (const entry of videos) {
    const hit = mapping.get(entry.filePathNorm);
    if (!hit) {
      unresolved.push(entry);
      continue;
    }
    resolvedRows.push({
      entry,
      rvtr: hit.rvtr,
      canonicalArtist: hit.artist,
      canonicalTitle: hit.title,
      method: hit.method,
    });
  }

  const byRvtr = new Map<string, ResolvedVideoRow[]>();
  for (const row of resolvedRows) {
    byRvtr.set(row.rvtr, [...(byRvtr.get(row.rvtr) ?? []), row]);
  }
  const rvtrs = [...byRvtr.keys()];
  const coverMap = await loadCoverInfoForRvtrs(rvtrs);

  const packageRows: PackageRow[] = [];
  for (const rvtr of rvtrs) {
    const rows = byRvtr.get(rvtr)!;
    const sorted = [...rows].sort((a, b) => sortVideos(a.entry, b.entry));
    const primary = sorted[0]!;
    const cover = coverMap.get(rvtr);
    const existing = await loadSongPackage(rvtr);
    packageRows.push({
      rvtr,
      artist: primary.canonicalArtist || primary.entry.artist,
      title: primary.canonicalTitle || primary.entry.title,
      videoCount: rows.length,
      maxPlayCount: Math.max(...rows.map((row) => playCount(row.entry))),
      coverPresent: Boolean(cover?.coverUrl),
      coverSource: cover?.coverSource ?? null,
      coverUrl: cover?.coverUrl ?? null,
      hadExistingPackage: Boolean(existing),
      existingStatus: existing?.status ?? null,
      action: existing && !args.force ? "existing_skipped" : args.dryRun ? "dry_run" : "generated",
      runtimeMs: null,
      error: null,
    });
  }

  const candidates = packageRows
    .filter((row) => args.force || !row.existingStatus)
    .sort(packageSort);
  const selected = candidates.slice(0, args.limit ?? candidates.length);
  const selectedSet = new Set(selected.map((row) => row.rvtr));

  for (const row of packageRows) {
    if (!selectedSet.has(row.rvtr) && (args.force || !row.existingStatus)) {
      row.action = args.dryRun ? "dry_run" : "not_selected";
    }
  }

  if (!args.dryRun) {
    for (const row of selected) {
      const t0 = Date.now();
      console.log(`  · ${row.rvtr} ${row.artist} — ${row.title}${row.coverPresent ? "" : " (no cover)"}`);
      const result = await processSong(row.rvtr);
      row.runtimeMs = Date.now() - t0;
      if (result.ok) {
        row.action = "generated";
        row.existingStatus = result.package.status;
      } else {
        row.action = "failed";
        row.error = result.error ?? "process_failed";
      }
    }
  }

  const generated = packageRows.filter((row) => row.action === "generated" && !row.error).length;
  const failed = packageRows.filter((row) => row.action === "failed").length;
  const existing = packageRows.filter((row) => row.hadExistingPackage).length;
  const generatedRuntimes = packageRows
    .map((row) => row.runtimeMs)
    .filter((ms): ms is number => ms != null && ms > 0);
  const avgRuntime = generatedRuntimes.length
    ? Math.round(generatedRuntimes.reduce((n, ms) => n + ms, 0) / generatedRuntimes.length)
    : DEFAULT_RUNTIME_MS;
  const remainingAfterRun = Math.max(0, candidates.length - (args.dryRun ? 0 : selected.length));
  const reportPaths = {
    summary: reportPath(args.year, "summary"),
    inventory: reportPath(args.year, "inventory"),
    unresolved: reportPath(args.year, "unresolved"),
  };
  const summary: RunSummary = {
    generatedAt: new Date().toISOString(),
    year: args.year,
    dryRun: args.dryRun,
    force: args.force,
    limit: args.limit,
    minPlayCount: args.minPlayCount,
    scanPath: scan.path,
    scanParseMs: scan.parseMs,
    totalVideoTracks: videos.length,
    resolvedVideoTracks: resolvedRows.length,
    unresolvedVideoTracks: unresolved.length,
    uniqueResolvedRvtrs: rvtrs.length,
    coverPresent: packageRows.filter((row) => row.coverPresent).length,
    coverMissing: packageRows.filter((row) => !row.coverPresent).length,
    packagesExisting: existing,
    packagesGenerated: generated,
    packagesFailed: failed,
    packagesWouldGenerate: args.dryRun ? selected.length : 0,
    runtimeMs: Date.now() - started,
    estimatedCompletionMinutes: Math.round((remainingAfterRun * avgRuntime) / 60_000),
    reportPaths,
  };

  await writeReports(summary, videos, packageRows, unresolved);
  const index = await loadSongPackageIndex();

  console.log("");
  console.log(`Total VIDEO tracks found: ${summary.totalVideoTracks}`);
  console.log(`Resolved RVTR rows:       ${summary.resolvedVideoTracks}`);
  console.log(`Unresolved rows:          ${summary.unresolvedVideoTracks}`);
  console.log(`Unique RVTRs:             ${summary.uniqueResolvedRvtrs}`);
  console.log(`Existing packages:        ${summary.packagesExisting}`);
  console.log(`Generated packages:       ${summary.packagesGenerated}`);
  if (args.dryRun) console.log(`Would generate:           ${summary.packagesWouldGenerate}`);
  console.log(`Failures:                 ${summary.packagesFailed}`);
  console.log(`Cover present/missing:    ${summary.coverPresent}/${summary.coverMissing}`);
  console.log(`Package index entries:    ${index.packages.length}`);
  console.log(`Runtime:                  ${fmtMs(summary.runtimeMs)}`);
  console.log(`Estimated remaining:      ~${summary.estimatedCompletionMinutes} min`);
  console.log("");
  console.log(`Summary:    ${summary.reportPaths.summary}`);
  console.log(`Inventory:  ${summary.reportPaths.inventory}`);
  console.log(`Unresolved: ${summary.reportPaths.unresolved}`);

  if (summary.packagesFailed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
