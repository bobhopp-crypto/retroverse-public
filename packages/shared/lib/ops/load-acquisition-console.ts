import { acquisitionsFromState } from "@/lib/ops/acquisitions-from-state";
import { acquisitionStats } from "@/lib/ops/acquisition-export";
import { OPS_FOCUS_YEAR } from "@/lib/ops/load-ops-data";
import { loadYearMatchSection, yearMatchStats } from "@/lib/ops/load-year-match-section";
import { loadOpsState } from "@/lib/ops/ops-state-store";
import type { AcquisitionRow, YearMatchRow } from "@/lib/ops/reconciliation-model";
import { inspectPing } from "@/lib/inspect/pg";

export type AcquisitionConsoleData = {
  year: number;
  yearMatch: YearMatchRow[];
  acquisitionQueue: AcquisitionRow[];
  stats: ReturnType<typeof acquisitionStats>;
  yearStats: ReturnType<typeof yearMatchStats>;
  pgOk: boolean;
  pgError?: string;
};

export async function loadAcquisitionConsoleData(): Promise<AcquisitionConsoleData> {
  const year = OPS_FOCUS_YEAR;
  const ping = await inspectPing();

  if (!ping.ok) {
    const state = await loadOpsState();
    return {
      year,
      yearMatch: [],
      acquisitionQueue: acquisitionsFromState(state),
      stats: {
        chartRows: 0,
        matched: 0,
        missing: 0,
        possible: 0,
        acquisition: 0,
      },
      yearStats: { chartRows: 0, matched: 0, missing: 0 },
      pgOk: false,
      pgError: ping.error,
    };
  }

  const [yearMatch, state] = await Promise.all([
    loadYearMatchSection(year),
    loadOpsState(),
  ]);
  const acquisitionQueue = acquisitionsFromState(state);

  return {
    year,
    yearMatch,
    acquisitionQueue,
    stats: acquisitionStats(yearMatch),
    yearStats: yearMatchStats(yearMatch),
    pgOk: true,
  };
}
