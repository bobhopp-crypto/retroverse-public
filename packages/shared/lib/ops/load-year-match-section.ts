import { applyMatchOverrides } from "@/lib/ops/apply-match-overrides";
import { loadYearMatchConsole } from "@/lib/ops/load-year-match";
import { loadOpsState } from "@/lib/ops/ops-state-store";
import type { YearMatchRow } from "@/lib/ops/reconciliation-model";

export async function loadYearMatchSection(
  year: number,
): Promise<YearMatchRow[]> {
  const state = await loadOpsState();
  const raw = await loadYearMatchConsole(year);
  return applyMatchOverrides(raw, state.matchOverrides);
}

export function yearMatchStats(rows: YearMatchRow[]) {
  const matched = rows.filter((r) => r.matchStatus === "matched").length;
  const missing = rows.filter((r) => r.matchStatus === "missing").length;
  return { chartRows: rows.length, matched, missing };
}
