import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { parseCsvRows } from "@/lib/cover-integrity/parse-csv";

export type CoverAuditHashRow = {
  rval: string;
  artist: string;
  album: string;
  releaseYear: number | null;
  canonicalPath: string | null;
  fileHash: string | null;
  trustTier: string;
};

export function coverAuditCsvPath(root = process.cwd()): string {
  const override = process.env.COVER_AUDIT_CSV_PATH?.trim();
  if (override) return override;
  return join(root, "reports/cover_integrity/cover_audit.csv");
}

export async function loadCoverAuditHashRows(): Promise<CoverAuditHashRow[]> {
  const raw = await readFile(coverAuditCsvPath(), "utf8");
  const table = parseCsvRows(raw);
  if (table.length < 2) return [];

  const header = table[0]!.map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const rows: CoverAuditHashRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r]!;
    const yearRaw = cells[idx("release year")]?.trim();
    const year = yearRaw ? Number(yearRaw) : null;
    const hash = cells[idx("file hash")]?.trim() || null;

    rows.push({
      rval: (cells[idx("rval")] ?? "").trim().toUpperCase(),
      artist: cells[idx("artist")] ?? "",
      album: cells[idx("album")] ?? "",
      releaseYear: Number.isFinite(year) ? year : null,
      canonicalPath: cells[idx("canonical path")]?.trim() || null,
      fileHash: hash,
      trustTier: cells[idx("trust tier")] ?? "",
    });
  }

  return rows.filter((row) => /^RVAL\d{6}$/.test(row.rval) && row.fileHash);
}

export async function loadHashMatchIndexForBatch(
  batchHashes: string[],
): Promise<Record<string, CoverAuditHashRow[]>> {
  const needed = new Set(batchHashes.filter(Boolean));
  if (needed.size === 0) return {};

  const all = await loadCoverAuditHashRows();
  const index: Record<string, CoverAuditHashRow[]> = {};

  for (const row of all) {
    if (!row.fileHash || !needed.has(row.fileHash)) continue;
    (index[row.fileHash] ??= []).push(row);
  }

  for (const hash of Object.keys(index)) {
    if (index[hash]!.length < 2) delete index[hash];
  }

  return index;
}
