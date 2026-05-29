import type { OpsMatchOverride } from "@/lib/ops/ops-state-store";
import type { YearMatchRow } from "@/lib/ops/reconciliation-model";

export function applyMatchOverrides(
  rows: YearMatchRow[],
  overrides: Record<string, OpsMatchOverride>,
): YearMatchRow[] {
  return rows.map((row) => {
    const o = overrides[row.chartItemId];
    if (!o) return row;
    return {
      ...row,
      matchStatus: o.matchStatus,
      confidence:
        o.matchStatus === "matched"
          ? "high"
          : o.matchStatus === "ignored"
            ? "low"
            : row.confidence,
      bestMatch: o.bestMatch ?? row.bestMatch,
      manualOverride: o.manualOverride,
      mediaId: o.mediaId,
      notes: o.notes,
      label: o.bestMatch ?? row.label,
      hasVdjMedia: o.matchStatus === "matched" ? true : row.hasVdjMedia,
    };
  });
}
