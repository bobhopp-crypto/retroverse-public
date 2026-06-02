/**
 * Client-safe producer timeline defaults (no fs/path).
 */

import { PRODUCER_STARTER_BLOCKS } from "./block-templates";
import { PRODUCER_DEFAULT_TARGET_RUNTIME_MINUTES } from "./runtime-defaults";
import type { ProducerShowBlock, ProducerTimelineState } from "./types";

export function createStarterBlocks(): ProducerShowBlock[] {
  return PRODUCER_STARTER_BLOCKS.map((s) => ({
    id: crypto.randomUUID(),
    title: s.title,
    notes: s.notes,
    collapsed: false,
    assets: [],
  }));
}

export function emptyProducerTimeline(year: number): ProducerTimelineState {
  return {
    version: 2,
    year,
    targetRuntimeMinutes: PRODUCER_DEFAULT_TARGET_RUNTIME_MINUTES,
    blocks: createStarterBlocks(),
    updatedAt: new Date().toISOString(),
  };
}
