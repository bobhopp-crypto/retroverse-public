import { acquisitionPriority } from "@/lib/ops/match-status";
import type { AcquisitionRow } from "@/lib/ops/reconciliation-model";
import type { OpsAcquisitionRecord, OpsReconciliationState } from "@/lib/ops/ops-state-store";
import { ensureUniqueRowIds } from "@/lib/ops/ensure-unique-ids";

export function acquisitionsFromState(state: OpsReconciliationState): AcquisitionRow[] {
  const rows = Object.values(state.acquisitions)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(
      (rec): AcquisitionRow => ({
        id: rec.id,
        chartItemId: rec.chartItemId,
        artist: rec.artist,
        title: rec.title,
        year: rec.year,
        priority: acquisitionPriority(rec.peak),
        peak: rec.peak,
        acquisitionStatus: rec.status,
        rvtr: null,
      }),
    );
  return ensureUniqueRowIds(rows);
}

export function recordToAcquisitionRow(rec: OpsAcquisitionRecord): AcquisitionRow {
  return {
    id: rec.id,
    chartItemId: rec.chartItemId,
    artist: rec.artist,
    title: rec.title,
    year: rec.year,
    priority: acquisitionPriority(rec.peak),
    peak: rec.peak,
    acquisitionStatus: rec.status,
    rvtr: null,
  };
}
