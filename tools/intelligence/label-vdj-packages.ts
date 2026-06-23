#!/usr/bin/env npx tsx
import { copyFile, mkdir, readFile, readdir, writeFile } from "fs/promises";
import { basename, join } from "path";

import { loadDeckIndex } from "../../lib/ops/intelligence/deck-index.ts";
import { normVdjPath, scanVdjDatabase, vdjDatabasePath } from "../../lib/ops/intelligence/vdj-database.ts";
import { loadVdjIdentityCoverage } from "../../lib/ops/intelligence/vdj-identity-coverage.ts";
import { songPackageIndexPath, songPackagesDir } from "../../lib/ops/intelligence/paths.ts";

const RVTR_RE = /^RVTR\d{6}$/;
const RETROVERSE_LABEL_RE = /^(RV_PACKAGE|PK_|DK_|RVTR\d{6}$)/;

type RetroverseLabel = {
  rvtr: string;
  kind: "RVTR" | "PK" | "DK";
  label: string;
};

function decodeXmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function encodeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normPackageRvtr(value: string): string | null {
  const rvtr = value.trim().toUpperCase();
  return RVTR_RE.test(rvtr) ? rvtr : null;
}

async function loadPackageRvtrs(): Promise<Set<string>> {
  const rvtrs = new Set<string>();

  try {
    const raw = await readFile(songPackageIndexPath(), "utf8");
    const parsed = JSON.parse(raw) as { packages?: Array<{ rvtr?: string }> };
    for (const entry of parsed.packages ?? []) {
      const rvtr = normPackageRvtr(entry.rvtr ?? "");
      if (rvtr) rvtrs.add(rvtr);
    }
  } catch {
    // Package files are the fallback source of truth below.
  }

  try {
    for (const file of await readdir(songPackagesDir())) {
      const rvtr = normPackageRvtr(basename(file, ".json"));
      if (rvtr) rvtrs.add(rvtr);
    }
  } catch {
    // No package directory means no packages to label.
  }

  return rvtrs;
}

async function loadDeckRvtrs(): Promise<Set<string>> {
  const index = await loadDeckIndex();
  return new Set(index.decks.map((entry) => entry.rvtr));
}

async function loadRetroverseLabels(identityRvtrs: Set<string>): Promise<Map<string, RetroverseLabel>> {
  const [packageRvtrs, deckRvtrs] = await Promise.all([loadPackageRvtrs(), loadDeckRvtrs()]);
  const out = new Map<string, RetroverseLabel>();

  for (const rvtr of identityRvtrs) {
    if (!packageRvtrs.has(rvtr)) {
      out.set(rvtr, {
        rvtr,
        kind: "RVTR",
        label: rvtr,
      });
      continue;
    }

    const kind = deckRvtrs.has(rvtr) ? "DK" : "PK";
    out.set(rvtr, {
      rvtr,
      kind,
      label: `${kind}_${rvtr}`,
    });
  }

  return out;
}

function readSongPath(songBlock: string): string | null {
  const match = songBlock.match(/<Song\s+FilePath="([^"]*)"/);
  return match?.[1] ? decodeXmlAttr(match[1]) : null;
}

function readTagsLabel(tags: string): string | null {
  const labelMatch = tags.match(/\sLabel="([^"]*)"/);
  return labelMatch ? decodeXmlAttr(labelMatch[1] ?? "") : null;
}

function canWriteLabel(label: string | null): boolean {
  if (label == null) return true;
  const trimmed = label.trim();
  return trimmed === "" || trimmed === "test" || trimmed === "RV_PACKAGE" || RETROVERSE_LABEL_RE.test(trimmed);
}

function setTagsLabel(
  tags: string,
  nextLabel: string | null,
): { next: string; changed: boolean; skipped: boolean; cleared: boolean } {
  const currentLabel = readTagsLabel(tags);
  const labelMatch = tags.match(/\sLabel="([^"]*)"/);

  if (!canWriteLabel(currentLabel)) {
    return { next: tags, changed: false, skipped: true, cleared: false };
  }

  if (!nextLabel) {
    if (!labelMatch) return { next: tags, changed: false, skipped: false, cleared: false };
    return {
      next: tags.replace(/\sLabel="[^"]*"/, ""),
      changed: true,
      skipped: false,
      cleared: true,
    };
  }

  if (labelMatch) {
    if (currentLabel === nextLabel) {
      return { next: tags, changed: false, skipped: false, cleared: false };
    }
    return {
      next: tags.replace(/\sLabel="[^"]*"/, ` Label="${encodeXmlAttr(nextLabel)}"`),
      changed: true,
      skipped: false,
      cleared: false,
    };
  }

  return {
    next: tags.replace(/(\s*\/?>)$/, ` Label="${encodeXmlAttr(nextLabel)}"$1`),
    changed: true,
    skipped: false,
    cleared: false,
  };
}

function updateSongBlockLabel(
  songBlock: string,
  nextLabel: string | null,
): { next: string; changed: boolean; skipped: boolean; cleared: boolean } {
  const tagsMatch = songBlock.match(/<Tags\b[^>]*\/?>/);
  if (!tagsMatch?.[0]) return { next: songBlock, changed: false, skipped: false, cleared: false };

  const { next, changed, skipped, cleared } = setTagsLabel(tagsMatch[0], nextLabel);
  if (!changed) return { next: songBlock, changed: false, skipped, cleared };
  return { next: songBlock.replace(tagsMatch[0], next), changed: true, skipped, cleared };
}

async function main() {
  const checkOnly = process.argv.includes("--check") || process.argv.includes("--dry-run");
  const vdjPath = vdjDatabasePath();
  const scan = await scanVdjDatabase({ force: true });
  const coverage = await loadVdjIdentityCoverage({ force: true });
  const identityRvtrs = new Set(coverage.matches.map((match) => match.rvtr));
  const retroverseLabels = await loadRetroverseLabels(identityRvtrs);

  const labelsByPath = new Map<string, RetroverseLabel>();
  const matchedRvtrs = new Set<string>();
  const matchedVdjTracks: Array<{
    rvtr: string;
    label: string;
    kind: "RVTR" | "PK" | "DK";
    artist: string;
    title: string;
    filePath: string;
    source: string | null;
    isVideo: boolean;
  }> = [];

  for (const { entry, identity, rvtr } of coverage.matches) {
    const retroverseLabel = retroverseLabels.get(rvtr);
    if (!retroverseLabel) continue;
    labelsByPath.set(entry.filePathNorm, retroverseLabel);
    matchedRvtrs.add(rvtr);
    matchedVdjTracks.push({
      rvtr,
      label: retroverseLabel.label,
      kind: retroverseLabel.kind,
      artist: entry.artist,
      title: entry.title,
      filePath: entry.filePath,
      source: identity.rvtrSource,
      isVideo: entry.isVideo,
    });
  }

  const xml = await readFile(vdjPath, "utf8");
  const entriesByPath = new Map(scan.entries.map((entry) => [entry.filePathNorm, entry]));
  let backupPath: string | null = null;

  let labelUpdatesApplied = 0;
  let totalRetroverseLabelsWritten = 0;
  let pkCount = 0;
  let dkCount = 0;
  let rvtrOnlyCount = 0;
  let skippedDueToExistingNonRetroverseLabel = 0;
  let retroverseLabelsCleared = 0;
  const nextXml = xml.replace(/<Song\s+FilePath="[^"]*"[^>]*>[\s\S]*?<\/Song>/g, (songBlock) => {
    const filePath = readSongPath(songBlock);
    if (!filePath) return songBlock;
    const entry = entriesByPath.get(normVdjPath(filePath));
    const nextLabel = entry ? labelsByPath.get(entry.filePathNorm)?.label ?? null : null;

    const updated = updateSongBlockLabel(songBlock, nextLabel);
    if (updated.changed) labelUpdatesApplied += 1;
    if (updated.skipped && nextLabel) skippedDueToExistingNonRetroverseLabel += 1;
    if (updated.cleared) retroverseLabelsCleared += 1;
    if (nextLabel && !updated.skipped) {
      totalRetroverseLabelsWritten += 1;
      if (nextLabel.startsWith("PK_")) pkCount += 1;
      if (nextLabel.startsWith("DK_")) dkCount += 1;
      if (RVTR_RE.test(nextLabel)) rvtrOnlyCount += 1;
    }
    return updated.next;
  });

  if (nextXml !== xml) {
    if (!checkOnly) {
      backupPath = `${vdjPath}.retroverse-package-label-backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}`;
      await copyFile(vdjPath, backupPath);
      await writeFile(vdjPath, nextXml, "utf8");
    }
  }

  const packageRvtrs = [...retroverseLabels.values()]
    .filter((entry) => entry.kind === "PK" || entry.kind === "DK")
    .map((entry) => entry.rvtr);
  const matchedPackageRvtrs = new Set(
    matchedVdjTracks.filter((track) => track.kind === "PK" || track.kind === "DK").map((track) => track.rvtr),
  );
  const packageCount = packageRvtrs.length;
  const unmatchedRvtrs = packageRvtrs.filter((rvtr) => !matchedRvtrs.has(rvtr)).sort();
  const packageLabelWritesApplied = labelUpdatesApplied - retroverseLabelsCleared;
  const report = {
    generatedAt: new Date().toISOString(),
    mode: checkOnly ? "check" : "write",
    vdjDatabasePath: vdjPath,
    totalVdjTracks: coverage.totalVdjTracks,
    totalVdjVideoTracks: coverage.totalVdjVideoTracks,
    distinctRvtrs: coverage.distinctRvtrs,
    mappedVdjTracks: coverage.mappedVdjTracks,
    unresolvedTracks: coverage.unresolvedTracks,
    coveragePct: coverage.coveragePct,
    averageVdjFilesPerRvtr: coverage.averageVdjFilesPerRvtr,
    packageCount,
    matchedVdjTracks: matchedVdjTracks.length,
    matchedPackageRvtrs: matchedPackageRvtrs.size,
    unmatchedTracks: unmatchedRvtrs.length,
    totalRetroverseLabelsWritten,
    pkCount,
    dkCount,
    rvtrOnlyCount,
    labelUpdatesApplied,
    wouldChange: nextXml !== xml,
    packageLabelWritesApplied,
    skippedDueToExistingNonRetroverseLabel,
    retroverseLabelsCleared,
    alreadyLabeled: totalRetroverseLabelsWritten - packageLabelWritesApplied,
    backupPath,
    filterExpressions: {
      allRetroverseEnabledTracks: "label contains \"RVTR\"",
      packageExists: "label starts with \"PK_\"",
      polishedDeckExists: "label starts with \"DK_\"",
    },
    topRvtrsByFileCount: coverage.topRvtrsByFileCount,
    unmatchedRvtrs,
    matches: matchedVdjTracks.sort((a, b) => a.rvtr.localeCompare(b.rvtr)),
  };

  let reportPath: string | null = null;
  if (!checkOnly) {
    const reportDir = join(process.cwd(), "reports", "intelligence");
    await mkdir(reportDir, { recursive: true });
    reportPath = join(reportDir, "vdj-package-label-report.json");
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify({ ...report, reportPath, matches: undefined }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
