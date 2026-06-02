import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

import { yearWorkspaceDir } from "../paths";

import { emptyProducerTimeline } from "./empty-timeline";
import { PRODUCER_TIMELINE_BLOCKS } from "./config";
import type {
  ProducerTimelineAsset,
  ProducerTimelineBlockId,
  ProducerTimelineState,
} from "./types";

function timelinePath(year: number): string {
  return join(yearWorkspaceDir(year), "producer", "timeline.json");
}

export { emptyProducerTimeline } from "./empty-timeline";

function normalizeAsset(raw: unknown): ProducerTimelineAsset | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.title !== "string") return null;
  if (typeof o.productionCategory !== "string") return null;
  if (typeof o.productionItemId !== "string") return null;
  if (typeof o.producerCategory !== "string") return null;
  return {
    id: o.id,
    producerCategory: o.producerCategory as ProducerTimelineAsset["producerCategory"],
    productionCategory: o.productionCategory as ProducerTimelineAsset["productionCategory"],
    productionItemId: o.productionItemId,
    title: o.title,
    subtitle: typeof o.subtitle === "string" ? o.subtitle : null,
  };
}

function normalizeState(raw: unknown, year: number): ProducerTimelineState {
  const base = emptyProducerTimeline(year);
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const blocksRaw = o.blocks;
  if (!blocksRaw || typeof blocksRaw !== "object") return base;
  const blocks = { ...base.blocks };
  for (const { id } of PRODUCER_TIMELINE_BLOCKS) {
    const list = (blocksRaw as Record<string, unknown>)[id];
    if (!Array.isArray(list)) continue;
    const parsed: ProducerTimelineAsset[] = [];
    for (const item of list) {
      const asset = normalizeAsset(item);
      if (asset) parsed.push(asset);
    }
    blocks[id] = parsed;
  }
  return {
    version: 1,
    year,
    blocks,
    updatedAt:
      typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
  };
}

export async function loadProducerTimeline(
  year: number,
): Promise<ProducerTimelineState> {
  try {
    const raw = await readFile(timelinePath(year), "utf8");
    return normalizeState(JSON.parse(raw) as unknown, year);
  } catch {
    return emptyProducerTimeline(year);
  }
}

async function saveProducerTimeline(state: ProducerTimelineState): Promise<void> {
  const dir = join(yearWorkspaceDir(state.year), "producer");
  await mkdir(dir, { recursive: true });
  const next: ProducerTimelineState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(timelinePath(state.year), JSON.stringify(next, null, 2), "utf8");
}

export async function addAssetToProducerBlock(
  year: number,
  blockId: ProducerTimelineBlockId,
  asset: Omit<ProducerTimelineAsset, "id">,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const entry: ProducerTimelineAsset = { ...asset, id: randomUUID() };
  const blocks = { ...state.blocks };
  blocks[blockId] = [...blocks[blockId], entry];
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}

export async function removeAssetFromProducerBlock(
  year: number,
  blockId: ProducerTimelineBlockId,
  timelineAssetId: string,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const blocks = { ...state.blocks };
  blocks[blockId] = blocks[blockId].filter((a) => a.id !== timelineAssetId);
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}
