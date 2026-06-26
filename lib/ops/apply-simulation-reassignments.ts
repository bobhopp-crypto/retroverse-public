import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { assignVdjLabelsBatch } from "@/lib/ops/browser-plus/vdj-label-write";
import { isOpsPlayableVideoPath } from "@/lib/ops/ops-video-media";

export type ReassignmentCsvRow = {
  fileArtist: string;
  fileTitle: string;
  currentRvtr: string;
  proposedRvtr: string;
  currentIdentity: string;
  proposedIdentity: string;
  confidence: number;
  simulatedBucket: string;
  containmentScore: number;
  filePath: string;
};

export type ApplyReassignmentsResult = {
  scannedAt: string;
  csvPath: string;
  totalCsvRows: number;
  eligible: ReassignmentCsvRow[];
  applied: number;
  unchanged: number;
  skipped: number;
  failed: Array<{ filePath: string; message: string }>;
  backupPath: string | null;
  filteredOut: number;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseReassignmentCsv(raw: string): ReassignmentCsvRow[] {
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]!);
  const idx = (name: string) => header.indexOf(name);

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      fileArtist: cols[idx("fileArtist")] ?? "",
      fileTitle: cols[idx("fileTitle")] ?? "",
      currentRvtr: (cols[idx("currentRvtr")] ?? "").toUpperCase(),
      proposedRvtr: (cols[idx("proposedRvtr")] ?? "").toUpperCase(),
      currentIdentity: cols[idx("currentIdentity")] ?? "",
      proposedIdentity: cols[idx("proposedIdentity")] ?? "",
      confidence: Number(cols[idx("confidence")] ?? 0),
      simulatedBucket: cols[idx("simulatedBucket")] ?? "",
      containmentScore: Number(cols[idx("containmentScore")] ?? 0),
      filePath: cols[idx("filePath")] ?? "",
    };
  });
}

function isCanonicalIdentity(source: string): boolean {
  return source === "hot100" || source === "hot100_vdj";
}

function isVideoFolderPath(filePath: string): boolean {
  if (!isOpsPlayableVideoPath(filePath)) return false;
  const p = filePath.replace(/\\/g, "/");
  if (/\/MUSIC\//i.test(p)) return false;
  if (/\/VIDEO VAULT\//i.test(p)) return false;
  return /\/VIDEO\//i.test(p);
}

/** High-confidence simulation reassignments only — exact/high bucket, canonical target. */
export function filterEligibleReassignments(rows: ReassignmentCsvRow[]): ReassignmentCsvRow[] {
  return rows.filter((row) => {
    if (!row.filePath || !row.proposedRvtr || !row.currentRvtr) return false;
    if (row.currentRvtr === row.proposedRvtr) return false;
    if (!isVideoFolderPath(row.filePath)) return false;
    if (!isCanonicalIdentity(row.proposedIdentity)) return false;
    if (row.simulatedBucket !== "exact" && row.simulatedBucket !== "high") return false;
    if (row.confidence < 95) return false;
    if (row.containmentScore < 95) return false;
    return true;
  });
}

export async function applySimulationReassignments(options: {
  csvPath: string;
  outDir: string;
  dryRun?: boolean;
}): Promise<ApplyReassignmentsResult> {
  const raw = await readFile(options.csvPath, "utf8");
  const allRows = parseReassignmentCsv(raw);
  const eligible = filterEligibleReassignments(allRows);

  if (options.dryRun || eligible.length === 0) {
    return {
      scannedAt: new Date().toISOString(),
      csvPath: options.csvPath,
      totalCsvRows: allRows.length,
      eligible,
      applied: 0,
      unchanged: 0,
      skipped: 0,
      failed: [],
      backupPath: null,
      filteredOut: allRows.length - eligible.length,
    };
  }

  const batch = await assignVdjLabelsBatch(
    eligible.map((row) => ({ filePath: row.filePath, rvtr: row.proposedRvtr })),
    { backupTag: "match-cleanup-reassign" },
  );

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await writeFile(
    join(options.outDir, `reassignments-applied-${stamp}.json`),
    JSON.stringify({ eligible, batch }, null, 2),
    "utf8",
  );

  return {
    scannedAt: new Date().toISOString(),
    csvPath: options.csvPath,
    totalCsvRows: allRows.length,
    eligible,
    applied: batch.ok,
    unchanged: batch.unchanged,
    skipped: batch.skipped,
    failed: batch.failed,
    backupPath: batch.backupPath,
    filteredOut: allRows.length - eligible.length,
  };
}
