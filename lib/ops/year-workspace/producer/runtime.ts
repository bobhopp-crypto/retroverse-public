import { PRODUCER_TIMELINE_BLOCKS } from "./config";
import type {
  ProducerTimelineAsset,
  ProducerTimelineBlockId,
  ProducerTimelineState,
} from "./types";

export function effectiveRuntimeSeconds(asset: ProducerTimelineAsset): number {
  if (
    asset.runtimeOverrideSeconds != null &&
    Number.isFinite(asset.runtimeOverrideSeconds) &&
    asset.runtimeOverrideSeconds >= 0
  ) {
    return Math.round(asset.runtimeOverrideSeconds);
  }
  return Math.max(0, Math.round(asset.runtimeSeconds));
}

export function formatProducerDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** Parse M:SS or MM:SS (e.g. 0:30, 3:42). Returns null if invalid. */
export function parseProducerMmSs(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length !== 2) return null;
  const mins = Number(parts[0]);
  const secs = Number(parts[1]);
  if (!Number.isFinite(mins) || !Number.isFinite(secs)) return null;
  if (mins < 0 || secs < 0 || secs >= 60) return null;
  return Math.round(mins * 60 + secs);
}

export function formatProducerMmSs(totalSeconds: number): string {
  return formatProducerDuration(totalSeconds);
}

export function sumBlockRuntimeSeconds(
  assets: ProducerTimelineAsset[],
): number {
  return assets.reduce((sum, a) => sum + effectiveRuntimeSeconds(a), 0);
}

export function computeShowRuntimeSeconds(
  state: ProducerTimelineState,
): number {
  let total = 0;
  for (const { id } of PRODUCER_TIMELINE_BLOCKS) {
    total += sumBlockRuntimeSeconds(state.blocks[id] ?? []);
  }
  return total;
}

export type ProducerBlockRuntime = {
  blockId: ProducerTimelineBlockId;
  label: string;
  totalSeconds: number;
  startSeconds: number;
  endSeconds: number;
};

export function computeBlockRuntimes(
  state: ProducerTimelineState,
): ProducerBlockRuntime[] {
  let cursor = 0;
  const out: ProducerBlockRuntime[] = [];
  for (const block of PRODUCER_TIMELINE_BLOCKS) {
    const assets = state.blocks[block.id] ?? [];
    const totalSeconds = sumBlockRuntimeSeconds(assets);
    const startSeconds = cursor;
    cursor += totalSeconds;
    out.push({
      blockId: block.id,
      label: block.label,
      totalSeconds,
      startSeconds,
      endSeconds: cursor,
    });
  }
  return out;
}

export function rulerMarkersMinutes(targetMinutes: number): number[] {
  const max = Math.max(15, Math.ceil(targetMinutes / 15) * 15);
  const markers: number[] = [];
  for (let m = 0; m <= max; m += 15) {
    markers.push(m);
  }
  return markers;
}

export function showRuntimeSummary(state: ProducerTimelineState): {
  targetMinutes: number;
  currentSeconds: number;
  remainingSeconds: number;
} {
  const targetMinutes = state.targetRuntimeMinutes;
  const targetSeconds = targetMinutes * 60;
  const currentSeconds = computeShowRuntimeSeconds(state);
  const remainingSeconds = Math.max(0, targetSeconds - currentSeconds);
  return { targetMinutes, currentSeconds, remainingSeconds };
}
