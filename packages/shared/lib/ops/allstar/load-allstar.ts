import "server-only";

import { existsSync } from "fs";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";

import {
  allstarArchiveDir,
  allstarDataRoot,
  allstarExtractorOutputDir,
  allstarManifestPath,
  allstarPlayersCsvPath,
  allstarProbabilitiesCsvPath,
  allstarReviewDir,
  allstarScansDir,
} from "./paths";
import type {
  AllStarDashboardStats,
  AllStarDisc,
  AllStarDiscDetail,
  AllStarSnapshot,
  DiscGeometryStatus,
  DiscProcessingStatus,
  WedgeDegrees,
  WedgeProbabilities,
} from "./types";
import { ALLSTAR_MODULES, ALLSTAR_RESULT_NUMBERS, buildOutcomeSummary } from "./types";

type CsvRow = {
  sourceFile: string;
  player: string;
  position: string;
  degrees: WedgeDegrees;
  probabilities: WedgeProbabilities;
};

type ManifestFile = {
  updatedAt?: string;
  extractorVersion?: string;
};

function normalizeScanStem(stem: string): string {
  return stem.replace(/(?:\s+copy)+$/i, "");
}

function discIdFromStem(stem: string): string {
  return normalizeScanStem(stem).replace(/[^\w.-]+/g, "_");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

async function parsePlayersCsv(path: string): Promise<CsvRow[]> {
  if (!existsSync(path)) return [];
  const raw = await readFile(path, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);
  const numberCols = ALLSTAR_RESULT_NUMBERS.filter((n) => header.includes(n));

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((col, idx) => {
      row[col] = cells[idx] ?? "";
    });

    const degrees: WedgeDegrees = {};
    const probabilities: WedgeProbabilities = {};
    for (const n of numberCols) {
      degrees[n] = Number.parseFloat(row[n] ?? "0") || 0;
    }
    return {
      sourceFile: row.source_file ?? row.sourceFile ?? "",
      player: row.player ?? "",
      position: row.position ?? "",
      degrees,
      probabilities,
    };
  });
}

async function parseProbabilitiesCsv(path: string): Promise<Array<WedgeProbabilities & { sourceFile: string }>> {
  if (!existsSync(path)) return [];
  const raw = await readFile(path, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);
  const numberCols = ALLSTAR_RESULT_NUMBERS.filter((n) => header.includes(n));

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((col, idx) => {
      row[col] = cells[idx] ?? "";
    });
    const probabilities: WedgeProbabilities = {};
    for (const n of numberCols) {
      probabilities[n] = Number.parseFloat(row[n] ?? "0") || 0;
    }
    return {
      sourceFile: row.source_file ?? row.sourceFile ?? "",
      ...probabilities,
    } as WedgeProbabilities & { sourceFile: string };
  });
}

function rowForScan(
  scanFilename: string,
  rows: CsvRow[],
): CsvRow | undefined {
  return rows.find((row) => row.sourceFile === scanFilename)
    ?? rows.find((row) => row.sourceFile.replace(/\.[^.]+$/, "") === scanFilename.replace(/\.[^.]+$/, ""));
}

function probRowForScan(
  scanFilename: string,
  rows: Array<WedgeProbabilities & { sourceFile: string }>,
): WedgeProbabilities | undefined {
  const match = rows.find((row) => row.sourceFile === scanFilename)
    ?? rows.find((row) => row.sourceFile.replace(/\.[^.]+$/, "") === scanFilename.replace(/\.[^.]+$/, ""));
  if (!match) return undefined;
  const { sourceFile: _sourceFile, ...probabilities } = match;
  return probabilities;
}

async function listScanFiles(): Promise<Array<{ filename: string; path: string; stem: string }>> {
  const scansDir = allstarScansDir();
  if (!existsSync(scansDir)) return [];

  const deduped = new Map<string, { filename: string; path: string; stem: string }>();
  const entries = await readdir(scansDir);

  for (const filename of entries.sort()) {
    const lower = filename.toLowerCase();
    if (!/\.(jpg|jpeg|png)$/.test(lower)) continue;
    const stem = normalizeScanStem(filename.replace(/\.[^.]+$/, ""));
    const existing = deduped.get(stem);
    const path = join(scansDir, filename);
    if (!existing) {
      deduped.set(stem, { filename, path, stem });
      continue;
    }
    if (/\.(jpg|jpeg)$/.test(lower) && existing.filename.toLowerCase().endsWith(".png")) {
      deduped.set(stem, { filename, path, stem });
    }
  }

  return Array.from(deduped.values()).sort((a, b) => a.stem.localeCompare(b.stem));
}

async function listReviewFiles(): Promise<Set<string>> {
  const reviewDir = allstarReviewDir();
  if (!existsSync(reviewDir)) return new Set();
  const entries = await readdir(reviewDir);
  return new Set(entries.filter((f) => /\.(jpg|jpeg|png)$/i.test(f)));
}

function reviewFilenameForDisc(id: string, scanFilename: string): string | null {
  const stem = scanFilename.replace(/\.[^.]+$/, "");
  const sanitized = stem.replace(/[^\w.-]+/g, "_");
  return `${sanitized}.jpg`;
}

function sumDegrees(degrees: WedgeDegrees): number {
  return ALLSTAR_RESULT_NUMBERS.reduce((sum, n) => sum + (degrees[n] ?? 0), 0);
}

function countNonZeroOutcomes(degrees: WedgeDegrees): number {
  return ALLSTAR_RESULT_NUMBERS.filter((n) => (degrees[n] ?? 0) > 0).length;
}

function deriveProcessingStatus(
  row: CsvRow | undefined,
  hasReview: boolean,
): DiscProcessingStatus {
  if (!row) return "pending";
  const hasPlayer = row.player.trim().length >= 3;
  const outcomeCount = countNonZeroOutcomes(row.degrees);
  const degreeSum = sumDegrees(row.degrees);

  if (!hasReview && outcomeCount === 0) return "pending";
  if (degreeSum <= 0 && !hasPlayer) return "pending";
  if (hasPlayer && outcomeCount >= 8 && degreeSum >= 300) return "processed";
  if (hasPlayer && hasReview && outcomeCount >= 10 && Math.abs(degreeSum - 360) <= 1.5) {
    return "processed";
  }
  if (outcomeCount >= 3 || hasPlayer) return "ocr_partial";
  return "pending";
}

function deriveGeometryStatus(degrees: WedgeDegrees): DiscGeometryStatus {
  const total = sumDegrees(degrees);
  if (total <= 0) return "unknown";
  if (Math.abs(total - 360) <= 1) return "ok";
  if (Math.abs(total - 360) <= 2) return "warning";
  if (total >= 200) return "warning";
  return "failed";
}

async function loadCanonicalFileMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const dir = allstarArchiveDir();
  if (!existsSync(dir)) return map;
  const files = await readdir(dir);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(await readFile(join(dir, file), "utf8")) as {
        id?: string;
        canonicalFile?: string | null;
      };
      const id = raw.id ?? file.replace(/\.json$/, "");
      if (raw.canonicalFile) map.set(id, raw.canonicalFile);
    } catch {
      /* skip */
    }
  }
  return map;
}

function buildDisc(
  scan: { filename: string; path: string; stem: string },
  row: CsvRow | undefined,
  probRow: WedgeProbabilities | undefined,
  reviewFiles: Set<string>,
  canonicalFile: string | null,
): AllStarDisc {
  const id = discIdFromStem(scan.stem);
  const reviewImageFilename = reviewFilenameForDisc(id, scan.filename);
  const hasReviewImage = reviewImageFilename ? reviewFiles.has(reviewImageFilename) : false;
  const degrees = row?.degrees ?? {};
  const probabilities = probRow ?? row?.probabilities ?? {};
  const degreesSum = sumDegrees(degrees);
  const labeledWedgeCount = countNonZeroOutcomes(degrees);

  const warnings: string[] = [];
  if (degreesSum > 0 && Math.abs(degreesSum - 360) > 1) {
    warnings.push(`Degrees sum ${degreesSum.toFixed(1)}° (expected 360° ± 1°)`);
  }
  if (row && !row.player.trim()) warnings.push("Player name not detected");
  if (row && !row.position.trim()) warnings.push("Position not detected");
  if (!hasReviewImage) warnings.push("Review image missing");

  return {
    id,
    scanFilename: scan.filename,
    scanPath: scan.path,
    canonicalFile,
    player: row?.player?.trim() ?? "",
    position: row?.position?.trim() ?? "",
    degrees,
    probabilities,
    processingStatus: deriveProcessingStatus(row, hasReviewImage),
    geometryStatus: deriveGeometryStatus(degrees),
    wedgeCount: labeledWedgeCount > 0 ? 16 : null,
    labeledWedgeCount: labeledWedgeCount > 0 ? labeledWedgeCount : null,
    degreesSum: degreesSum > 0 ? degreesSum : null,
    hasReviewImage,
    reviewImageFilename,
    warnings,
  };
}

function buildStats(discs: AllStarDisc[]): AllStarDashboardStats {
  return {
    totalScans: discs.length,
    processedScans: discs.filter((d) => d.processingStatus === "processed").length,
    pendingScans: discs.filter((d) => d.processingStatus === "pending").length,
    ocrComplete: discs.filter((d) => d.processingStatus === "processed").length,
    ocrPartial: discs.filter((d) => d.processingStatus === "ocr_partial").length,
    geometryOk: discs.filter((d) => d.geometryStatus === "ok").length,
    geometryWarning: discs.filter((d) => d.geometryStatus === "warning").length,
    lastExtractedAt: null,
  };
}

async function readManifestUpdatedAt(): Promise<string | null> {
  const path = allstarManifestPath();
  if (!existsSync(path)) {
    const csvPath = allstarPlayersCsvPath();
    if (!existsSync(csvPath)) return null;
    const st = await stat(csvPath);
    return st.mtime.toISOString();
  }
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as ManifestFile;
    return parsed.updatedAt ?? null;
  } catch {
    return null;
  }
}

export async function loadAllStarSnapshot(): Promise<AllStarSnapshot> {
  const scans = await listScanFiles();
  const playerRows = await parsePlayersCsv(allstarPlayersCsvPath());
  const probRows = await parseProbabilitiesCsv(allstarProbabilitiesCsvPath());
  const reviewFiles = await listReviewFiles();
  const canonicalFiles = await loadCanonicalFileMap();

  const discs = scans.map((scan) =>
    buildDisc(
      scan,
      rowForScan(scan.filename, playerRows),
      probRowForScan(scan.filename, probRows),
      reviewFiles,
      canonicalFiles.get(discIdFromStem(scan.stem)) ?? null,
    ),
  );

  const stats = buildStats(discs);
  stats.lastExtractedAt = await readManifestUpdatedAt();

  return {
    updatedAt: new Date().toISOString(),
    dataRoot: allstarDataRoot(),
    scansDir: allstarScansDir(),
    outputDir: allstarExtractorOutputDir(),
    modules: ALLSTAR_MODULES,
    stats,
    discs,
  };
}

export async function loadAllStarDisc(discId: string): Promise<AllStarDiscDetail | null> {
  const snapshot = await loadAllStarSnapshot();
  const disc = snapshot.discs.find((d) => d.id === discId);
  if (!disc) return null;

  const wedges = ALLSTAR_RESULT_NUMBERS.map((n, index) => ({
    index,
    label: Number.parseInt(n, 10),
    spanDeg: disc.degrees[n] ?? 0,
    probability: disc.probabilities[n] ?? 0,
  })).filter((w) => w.spanDeg > 0 || w.probability > 0);

  const outcomeSummary = buildOutcomeSummary(disc.degrees, disc.probabilities);

  return { ...disc, wedges, outcomeSummary };
}

export function allstarScanPathForDisc(disc: AllStarDisc): string {
  return disc.scanPath;
}

export function allstarReviewPathForDisc(disc: AllStarDisc): string | null {
  if (!disc.reviewImageFilename) return null;
  return join(allstarReviewDir(), disc.reviewImageFilename);
}

export { discIdFromStem, ALLSTAR_RESULT_NUMBERS };
