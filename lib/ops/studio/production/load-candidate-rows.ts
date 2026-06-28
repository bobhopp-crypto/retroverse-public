import "server-only";

import { isActiveVideoRow } from "@/lib/ops/browser-plus-2/status";
import { loadBrowserPlusModel } from "@/lib/ops/browser-plus/load-browser-plus";

export type ProductionCandidateRow = {
  rvtr: string;
  artist: string;
  title: string;
  playCount: number;
  filePath: string;
  year: number | null;
};

/** VDJ library rows for production queue — avoids full Browser+ 2 dashboard build. */
export async function loadProductionCandidateRows(): Promise<ProductionCandidateRow[]> {
  const model = await loadBrowserPlusModel();
  const seen = new Set<string>();
  const rows: ProductionCandidateRow[] = [];

  const sorted = [...model.rows]
    .filter((row) => row.rvtr && isActiveVideoRow(row) && row.filePath?.trim())
    .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0));

  for (const row of sorted) {
    const rvtr = row.rvtr!.trim().toUpperCase();
    if (seen.has(rvtr)) continue;
    seen.add(rvtr);
    rows.push({
      rvtr,
      artist: row.artist,
      title: row.title,
      playCount: row.playCount ?? 0,
      filePath: row.filePath,
      year: row.year ?? null,
    });
  }

  return rows;
}
