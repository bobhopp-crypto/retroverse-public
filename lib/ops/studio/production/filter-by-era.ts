import "server-only";

import { yearFromFilePath } from "@/lib/sunday-nights/match-identity-rank";

import type { ProductionCandidateRow } from "./load-candidate-rows";

/** Sprint 3.19 — era anchors for live-testing cohorts. */
export type StudioEraAnchor = 1980 | 1990 | 2005;

export function resolveSongYear(row: Pick<ProductionCandidateRow, "year" | "filePath">): number | null {
  if (row.year != null && row.year >= 1960 && row.year <= 2030) return row.year;
  return yearFromFilePath(row.filePath);
}

export function eraAnchorForYear(year: number | null): StudioEraAnchor | null {
  if (year == null) return null;
  if (year >= 1980 && year <= 1989) return 1980;
  if (year >= 1990 && year <= 1999) return 1990;
  if (year >= 2000 && year <= 2009) return 2005;
  return null;
}

export function filterCandidateRowsByEras(
  rows: ProductionCandidateRow[],
  eras: StudioEraAnchor[],
): ProductionCandidateRow[] {
  const eraSet = new Set(eras);
  return rows.filter((row) => {
    const anchor = eraAnchorForYear(resolveSongYear(row));
    return anchor != null && eraSet.has(anchor);
  });
}

export function countCandidatesByEra(
  rows: ProductionCandidateRow[],
): Record<StudioEraAnchor, number> {
  const counts: Record<StudioEraAnchor, number> = { 1980: 0, 1990: 0, 2005: 0 };
  for (const row of rows) {
    const anchor = eraAnchorForYear(resolveSongYear(row));
    if (anchor) counts[anchor] += 1;
  }
  return counts;
}
