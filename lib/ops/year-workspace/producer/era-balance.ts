import { formatProducerDuration, sumBlockRuntimeSeconds } from "./runtime";
import type { ProducerEraId, ProducerTimelineState } from "./types";

const PRODUCER_ERA_ORDER: ProducerEraId[] = ["1967", "1978", "1992", "mixed"];

export type EraHealthLabel = "ON TARGET" | "SHORT" | "LONG";

export type EraHealth = {
  label: EraHealthLabel;
  tone: "ok" | "warn" | "bad";
};

export type EraRuntimeTotals = Record<ProducerEraId, number>;

export function computeEraRuntimeSeconds(state: ProducerTimelineState): EraRuntimeTotals {
  const totals: EraRuntimeTotals = { 1967: 0, 1978: 0, 1992: 0, mixed: 0 };
  for (const block of state.blocks) {
    totals[block.eraId] += sumBlockRuntimeSeconds(block);
  }
  return totals;
}

export function eraRuntimeHealth(
  currentSeconds: number,
  targetMinutes: number,
): EraHealth {
  const currentMinutes = currentSeconds / 60;
  const delta = currentMinutes - targetMinutes;
  const abs = Math.abs(delta);
  if (abs <= 5) return { label: "ON TARGET", tone: "ok" };
  if (abs <= 15) return { label: delta < 0 ? "SHORT" : "LONG", tone: "warn" };
  return { label: delta < 0 ? "SHORT" : "LONG", tone: "bad" };
}

export type EraBalanceRow = {
  eraId: ProducerEraId;
  label: string;
  currentSeconds: number;
  currentClock: string;
  targetMinutes: number | null;
  targetClock: string | null;
  health: EraHealth | null;
};

export function buildEraBalanceRows(state: ProducerTimelineState): EraBalanceRow[] {
  const totals = computeEraRuntimeSeconds(state);
  const targets = state.eraTargets;

  const rows: EraBalanceRow[] = (["1967", "1978", "1992"] as const).map((eraId) => {
    const currentSeconds = totals[eraId];
    const targetMinutes = targets[eraId];
    return {
      eraId,
      label: eraId,
      currentSeconds,
      currentClock: formatProducerDuration(currentSeconds),
      targetMinutes,
      targetClock: formatProducerDuration(targetMinutes * 60),
      health: eraRuntimeHealth(currentSeconds, targetMinutes),
    };
  });

  rows.push({
    eraId: "mixed",
    label: "Mixed",
    currentSeconds: totals.mixed,
    currentClock: formatProducerDuration(totals.mixed),
    targetMinutes: null,
    targetClock: null,
    health: null,
  });

  return rows;
}

export type EraBreakdownLine = {
  eraId: ProducerEraId;
  label: string;
  minutes: number;
  clock: string;
};

export function buildEraBreakdown(state: ProducerTimelineState): EraBreakdownLine[] {
  const totals = computeEraRuntimeSeconds(state);
  return PRODUCER_ERA_ORDER.map((eraId) => ({
    eraId,
    label: eraId === "mixed" ? "Mixed" : eraId,
    minutes: Math.round(totals[eraId] / 60),
    clock: formatProducerDuration(totals[eraId]),
  }));
}
