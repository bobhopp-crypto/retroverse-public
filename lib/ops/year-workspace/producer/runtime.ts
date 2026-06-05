import type {
  ProducerShowBlock,
  ProducerTimelineAsset,
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

export function sumBlockRuntimeSeconds(block: ProducerShowBlock): number {
  return block.assets.reduce((sum, a) => sum + effectiveRuntimeSeconds(a), 0);
}

export function computeShowRuntimeSeconds(state: ProducerTimelineState): number {
  return state.blocks.reduce(
    (sum, block) => sum + sumBlockRuntimeSeconds(block),
    0,
  );
}

export type ProducerBlockRuntime = {
  blockId: string;
  label: string;
  eraId: import("./types").ProducerEraId;
  totalSeconds: number;
  startSeconds: number;
  endSeconds: number;
};

export function computeBlockRuntimes(
  state: ProducerTimelineState,
): ProducerBlockRuntime[] {
  let cursor = 0;
  const out: ProducerBlockRuntime[] = [];
  for (const block of state.blocks) {
    const totalSeconds = sumBlockRuntimeSeconds(block);
    const startSeconds = cursor;
    cursor += totalSeconds;
    out.push({
      blockId: block.id,
      label: block.title,
      eraId: block.eraId,
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

export function isAssetRuntimeApproved(asset: ProducerTimelineAsset): boolean {
  return asset.approvedRuntime === true;
}
