import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { parseCsvRows } from "@/lib/cover-integrity/parse-csv";

export type RepairBatchCsvRow = {
  batchRank: number;
  rval: string;
  artist: string;
  album: string;
  releaseYear: number | null;
  currentCoverPath: string | null;
  currentHash: string | null;
  issueReason: string;
  duplicateHashCount: number;
  trustTier: string;
  proposedSource: string;
  proposedCoverUrlOrPath: string;
  proposedConfidence: number;
  proposedReason: string;
  approve: string;
  curatorNotes: string;
};

export function repairBatchCsvPath(root = process.cwd()): string {
  const override = process.env.REPAIR_BATCH_CSV_PATH?.trim();
  if (override) return override;
  return join(root, "reports/cover_integrity/repair_batch_001.csv");
}

export async function loadRepairBatchCsv(
  csvPath?: string,
): Promise<RepairBatchCsvRow[]> {
  const path = csvPath ?? repairBatchCsvPath();
  const raw = await readFile(path, "utf8");
  const table = parseCsvRows(raw);
  if (table.length < 2) return [];

  const header = table[0]!.map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const rows: RepairBatchCsvRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r]!;
    const yearRaw = cells[idx("release_year")]?.trim();
    const year = yearRaw ? Number(yearRaw) : null;

    rows.push({
      batchRank: Number(cells[idx("batch_rank")] ?? r),
      rval: (cells[idx("rval")] ?? "").trim().toUpperCase(),
      artist: cells[idx("artist")] ?? "",
      album: cells[idx("album")] ?? "",
      releaseYear: Number.isFinite(year) ? year : null,
      currentCoverPath: cells[idx("current_cover_path")]?.trim() || null,
      currentHash: cells[idx("current_hash")]?.trim() || null,
      issueReason: cells[idx("issue_reason")] ?? "",
      duplicateHashCount: Number(cells[idx("duplicate_hash_count")] ?? 0) || 0,
      trustTier: cells[idx("trust_tier")] ?? "",
      proposedSource: cells[idx("proposed_source")] ?? "",
      proposedCoverUrlOrPath: cells[idx("proposed_cover_url_or_path")] ?? "",
      proposedConfidence: Number(cells[idx("proposed_confidence")] ?? 0) || 0,
      proposedReason: cells[idx("proposed_reason")] ?? "",
      approve: cells[idx("approve")] ?? "",
      curatorNotes: cells[idx("curator_notes")] ?? "",
    });
  }

  return rows.filter((row) => /^RVAL\d{6}$/.test(row.rval));
}
