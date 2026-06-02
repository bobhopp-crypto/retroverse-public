/**
 * Client-safe producer timeline defaults (no fs/path).
 * Server persistence: producer/timeline-state.ts
 */

import { PRODUCER_TIMELINE_BLOCKS } from "./config";
import { PRODUCER_DEFAULT_TARGET_RUNTIME_MINUTES } from "./runtime-defaults";
import type {
  ProducerTimelineAsset,
  ProducerTimelineBlockId,
  ProducerTimelineState,
} from "./types";

export function emptyProducerTimelineBlocks(): Record<
  ProducerTimelineBlockId,
  ProducerTimelineAsset[]
> {
  const blocks = {} as Record<ProducerTimelineBlockId, ProducerTimelineAsset[]>;
  for (const { id } of PRODUCER_TIMELINE_BLOCKS) {
    blocks[id] = [];
  }
  return blocks;
}

export function emptyProducerTimeline(year: number): ProducerTimelineState {
  return {
    version: 1,
    year,
    targetRuntimeMinutes: PRODUCER_DEFAULT_TARGET_RUNTIME_MINUTES,
    blocks: emptyProducerTimelineBlocks(),
    updatedAt: new Date().toISOString(),
  };
}
