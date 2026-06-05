import { computeBlockRuntimes } from "./runtime";
import type { ProducerEraId, ProducerTimelineState } from "./types";

export const PLANNING_UNIT_MINUTES = 15;

export type PlanningZone = {
  index: number;
  startMinutes: number;
  endMinutes: number;
  label: string;
};

export function buildPlanningZones(totalMinutes: number): PlanningZone[] {
  const span = Math.max(
    PLANNING_UNIT_MINUTES,
    Math.ceil(totalMinutes / PLANNING_UNIT_MINUTES) * PLANNING_UNIT_MINUTES,
  );
  const zones: PlanningZone[] = [];
  for (let start = 0; start < span; start += PLANNING_UNIT_MINUTES) {
    const end = start + PLANNING_UNIT_MINUTES;
    zones.push({
      index: zones.length,
      startMinutes: start,
      endMinutes: end,
      label: `${start}–${end}`,
    });
  }
  return zones;
}

export type ZoneBlockPlacement = {
  blockId: string;
  title: string;
  eraId: ProducerEraId;
  zoneIndex: number;
  /** 0–1 fill within zone column for stacked display */
  weight: number;
};

export function buildZonePlacements(
  state: ProducerTimelineState,
): { zones: PlanningZone[]; placements: ZoneBlockPlacement[] } {
  const zones = buildPlanningZones(state.targetRuntimeMinutes);
  const blockRuntimes = computeBlockRuntimes(state);
  const placements: ZoneBlockPlacement[] = [];

  for (const br of blockRuntimes) {
    if (br.totalSeconds <= 0) continue;
    const block = state.blocks.find((b) => b.id === br.blockId);
    const eraId = block?.eraId ?? "mixed";
    for (const zone of zones) {
      const zoneStart = zone.startMinutes * 60;
      const zoneEnd = zone.endMinutes * 60;
      if (br.endSeconds <= zoneStart || br.startSeconds >= zoneEnd) continue;
      const overlapStart = Math.max(br.startSeconds, zoneStart);
      const overlapEnd = Math.min(br.endSeconds, zoneEnd);
      const overlap = overlapEnd - overlapStart;
      if (overlap <= 0) continue;
      placements.push({
        blockId: br.blockId,
        title: br.label,
        eraId,
        zoneIndex: zone.index,
        weight: overlap / (zoneEnd - zoneStart),
      });
    }
  }

  return { zones, placements };
}

export function planningRulerTicks(totalMinutes: number): number[] {
  const max = Math.max(
    PLANNING_UNIT_MINUTES,
    Math.ceil(totalMinutes / PLANNING_UNIT_MINUTES) * PLANNING_UNIT_MINUTES,
  );
  const ticks: number[] = [];
  for (let m = 0; m <= max; m += PLANNING_UNIT_MINUTES) {
    ticks.push(m);
  }
  return ticks;
}
