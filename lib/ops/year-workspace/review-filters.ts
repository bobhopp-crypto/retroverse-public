import {
  bridgeForRow,
  bridgeRank,
  type ActiveYearBridge,
} from "@/lib/ops/year-workspace/active-year-bridge";
import type { ReviewClassification } from "./review-types";
import type { YearWorkspaceRow } from "./types";
import type { ReviewOwnership } from "./ownership";

export type ReviewRowFilter = {
  q: string;
  vdjMatch: "all" | YearWorkspaceRow["vdjMatch"];
  ownership: "all" | ReviewOwnership;
  classification: "all" | ReviewClassification;
  needsReviewOnly: boolean;
  hasTagsOnly: boolean;
  bridgeOnly: boolean;
};

export const DEFAULT_REVIEW_ROW_FILTER: ReviewRowFilter = {
  q: "",
  vdjMatch: "all",
  ownership: "all",
  classification: "all",
  needsReviewOnly: false,
  hasTagsOnly: false,
  bridgeOnly: false,
};

export function filterReviewRows(
  rows: YearWorkspaceRow[],
  filter: ReviewRowFilter,
  bridges?: Record<string, ActiveYearBridge>,
): YearWorkspaceRow[] {
  const q = filter.q.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter.vdjMatch !== "all" && row.vdjMatch !== filter.vdjMatch) return false;
    if (filter.ownership !== "all" && row.ownership !== filter.ownership) return false;
    if (filter.classification !== "all" && row.classification !== filter.classification) {
      return false;
    }
    if (filter.needsReviewOnly && row.classification !== "Fill") {
      return false;
    }
    if (filter.hasTagsOnly && row.historicalTags.length === 0) return false;
    if (filter.bridgeOnly && bridges) {
      const b = bridgeForRow(bridges, row);
      if (!b || b.bridgeYears.length === 0) return false;
    }
    if (q) {
      const hay = `${row.artist} ${row.title} ${row.rvtr ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Bridge artists first (gold → blue → none), then artist A–Z. */
export function sortReviewRowsForScan(
  rows: YearWorkspaceRow[],
  bridges: Record<string, ActiveYearBridge>,
): YearWorkspaceRow[] {
  return [...rows].sort((a, b) => {
    const ra = bridgeRank(bridgeForRow(bridges, a));
    const rb = bridgeRank(bridgeForRow(bridges, b));
    if (ra !== rb) return ra - rb;
    return a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
  });
}

export function countByVdjMatch(rows: YearWorkspaceRow[]) {
  return {
    matched: rows.filter((r) => r.vdjMatch === "matched").length,
    missing: rows.filter((r) => r.vdjMatch === "missing").length,
    review: rows.filter((r) => r.vdjMatch === "review").length,
  };
}
