import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

import { yearWorkspaceDir } from "../paths";

import { emptyProducerTimeline } from "./empty-timeline";
import { PRODUCER_TIMELINE_BLOCKS } from "./config";
import { defaultRuntimeSecondsForCategory } from "./runtime-defaults";
import type {
  ProducerAssetCategoryId,
  ProducerTimelineAsset,
  ProducerTimelineBlockId,
  ProducerTimelineState,
} from "./types";

function timelinePath(year: number): string {
  return join(yearWorkspaceDir(year), "producer", "timeline.json");
}

export { emptyProducerTimeline } from "./empty-timeline";

function parseRuntimeSeconds(
  value: unknown,
  producerCategory: ProducerAssetCategoryId,
): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  return defaultRuntimeSecondsForCategory(producerCategory);
}

function parseOptionalOverride(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  return undefined;
}

function normalizeAsset(raw: unknown): ProducerTimelineAsset | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.title !== "string") return null;
  if (typeof o.productionCategory !== "string") return null;
  if (typeof o.productionItemId !== "string") return null;
  if (typeof o.producerCategory !== "string") return null;
  const producerCategory = o.producerCategory as ProducerAssetCategoryId;
  const override = parseOptionalOverride(o.runtimeOverrideSeconds);
  return {
    id: o.id,
    producerCategory,
    productionCategory: o.productionCategory as ProducerTimelineAsset["productionCategory"],
    productionItemId: o.productionItemId,
    title: o.title,
    subtitle: typeof o.subtitle === "string" ? o.subtitle : null,
    runtimeSeconds: parseRuntimeSeconds(o.runtimeSeconds, producerCategory),
    ...(override !== undefined ? { runtimeOverrideSeconds: override } : {}),
  };
}

function normalizeState(raw: unknown, year: number): ProducerTimelineState {
  const base = emptyProducerTimeline(year);
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const targetRaw = o.targetRuntimeMinutes;
  const targetRuntimeMinutes =
    typeof targetRaw === "number" &&
    Number.isFinite(targetRaw) &&
    targetRaw > 0 &&
    targetRaw <= 24 * 60
      ? Math.round(targetRaw)
      : base.targetRuntimeMinutes;
  const blocks = { ...base.blocks };
  const blocksRaw = o.blocks;
  if (blocksRaw && typeof blocksRaw === "object") {
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
  }
  return {
    version: 1,
    year,
    targetRuntimeMinutes,
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

export type ProducerTimelineAssetInput = Omit<ProducerTimelineAsset, "id">;

export async function addAssetToProducerBlock(
  year: number,
  blockId: ProducerTimelineBlockId,
  asset: ProducerTimelineAssetInput,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const runtimeSeconds = parseRuntimeSeconds(
    asset.runtimeSeconds,
    asset.producerCategory,
  );
  const entry: ProducerTimelineAsset = {
    ...asset,
    runtimeSeconds,
    id: randomUUID(),
  };
  if (asset.runtimeOverrideSeconds != null) {
    entry.runtimeOverrideSeconds = parseOptionalOverride(
      asset.runtimeOverrideSeconds,
    );
  }
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

export async function setProducerTargetRuntimeMinutes(
  year: number,
  targetRuntimeMinutes: number,
): Promise<ProducerTimelineState> {
  const minutes = Math.round(targetRuntimeMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) {
    throw new Error("Invalid target runtime");
  }
  const state = await loadProducerTimeline(year);
  const next = { ...state, targetRuntimeMinutes: minutes };
  await saveProducerTimeline(next);
  return next;
}

export async function setProducerRuntimeOverride(
  year: number,
  blockId: ProducerTimelineBlockId,
  timelineAssetId: string,
  runtimeOverrideSeconds: number | null,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const blocks = { ...state.blocks };
  const list = blocks[blockId];
  const idx = list.findIndex((a) => a.id === timelineAssetId);
  if (idx < 0) throw new Error("Timeline asset not found");
  const item = { ...list[idx] };
  if (runtimeOverrideSeconds == null) {
    delete item.runtimeOverrideSeconds;
  } else {
    const secs = Math.round(runtimeOverrideSeconds);
    if (!Number.isFinite(secs) || secs < 0) throw new Error("Invalid runtime");
    item.runtimeOverrideSeconds = secs;
  }
  blocks[blockId] = [
    ...list.slice(0, idx),
    item,
    ...list.slice(idx + 1),
  ];
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}
