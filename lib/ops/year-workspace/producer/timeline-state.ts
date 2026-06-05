import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

import { yearWorkspaceDir } from "../paths";

import { templateById } from "./block-templates";
import { emptyProducerTimeline } from "./empty-timeline";
import { normalizeEraTargets, parseProducerEraId } from "./era";
import { isV1TimelineRaw, migrateV1ToV2 } from "./migrate";
import {
  defaultApprovedRuntimeForCategory,
  defaultRuntimeSecondsForCategory,
} from "./runtime-defaults";
import type {
  ProducerAssetCategoryId,
  ProducerBlockTemplateId,
  ProducerEraId,
  ProducerEraTargets,
  ProducerShowBlock,
  ProducerTimelineAsset,
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

function parseApprovedRuntime(
  value: unknown,
  producerCategory: ProducerAssetCategoryId,
): boolean {
  if (typeof value === "boolean") return value;
  return defaultApprovedRuntimeForCategory(producerCategory);
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
    approvedRuntime: parseApprovedRuntime(o.approvedRuntime, producerCategory),
    ...(override !== undefined ? { runtimeOverrideSeconds: override } : {}),
  };
}

function normalizeBlock(raw: unknown): ProducerShowBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.title !== "string") return null;
  const assetsRaw = o.assets;
  const assets: ProducerTimelineAsset[] = [];
  if (Array.isArray(assetsRaw)) {
    for (const item of assetsRaw) {
      const asset = normalizeAsset(item);
      if (asset) assets.push(asset);
    }
  }
  return {
    id: o.id,
    title: o.title.trim() || "Block",
    notes: typeof o.notes === "string" ? o.notes : null,
    eraId: parseProducerEraId(o.eraId),
    collapsed: o.collapsed === true,
    ...(typeof o.legacyKey === "string"
      ? { legacyKey: o.legacyKey as ProducerShowBlock["legacyKey"] }
      : {}),
    assets,
  };
}

function normalizeState(raw: unknown, year: number): ProducerTimelineState {
  if (!raw || typeof raw !== "object") return emptyProducerTimeline(year);
  const o = raw as Record<string, unknown>;

  if (isV1TimelineRaw(o)) {
    const migrated = migrateV1ToV2(o, year);
    return normalizeState(migrated, year);
  }

  const base = emptyProducerTimeline(year);
  const targetRaw = o.targetRuntimeMinutes;
  const targetRuntimeMinutes =
    typeof targetRaw === "number" &&
    Number.isFinite(targetRaw) &&
    targetRaw > 0 &&
    targetRaw <= 24 * 60
      ? Math.round(targetRaw)
      : base.targetRuntimeMinutes;

  const blocks: ProducerShowBlock[] = [];
  if (Array.isArray(o.blocks)) {
    for (const item of o.blocks) {
      const block = normalizeBlock(item);
      if (block) blocks.push(block);
    }
  }

  return {
    version: 2,
    year,
    targetRuntimeMinutes,
    eraTargets: normalizeEraTargets(o.eraTargets),
    blocks: blocks.length > 0 ? blocks : base.blocks,
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
    version: 2,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(timelinePath(state.year), JSON.stringify(next, null, 2), "utf8");
}

function findBlockIndex(state: ProducerTimelineState, blockId: string): number {
  return state.blocks.findIndex((b) => b.id === blockId);
}

function requireBlock(state: ProducerTimelineState, blockId: string): number {
  const idx = findBlockIndex(state, blockId);
  if (idx < 0) throw new Error("Block not found");
  return idx;
}

function cloneAsset(asset: ProducerTimelineAsset): ProducerTimelineAsset {
  return { ...asset, id: randomUUID() };
}

export type ProducerTimelineAssetInput = Omit<ProducerTimelineAsset, "id">;

export async function addAssetToProducerBlock(
  year: number,
  blockId: string,
  asset: ProducerTimelineAssetInput,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const idx = requireBlock(state, blockId);
  const runtimeSeconds = parseRuntimeSeconds(
    asset.runtimeSeconds,
    asset.producerCategory,
  );
  const entry: ProducerTimelineAsset = {
    ...asset,
    runtimeSeconds,
    approvedRuntime:
      asset.approvedRuntime ??
      defaultApprovedRuntimeForCategory(asset.producerCategory),
    id: randomUUID(),
  };
  if (asset.runtimeOverrideSeconds != null) {
    entry.runtimeOverrideSeconds = parseOptionalOverride(
      asset.runtimeOverrideSeconds,
    );
  }
  const blocks = state.blocks.map((b, i) =>
    i === idx ? { ...b, assets: [...b.assets, entry] } : b,
  );
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}

export async function removeAssetFromProducerBlock(
  year: number,
  blockId: string,
  timelineAssetId: string,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const idx = requireBlock(state, blockId);
  const blocks = state.blocks.map((b, i) =>
    i === idx
      ? { ...b, assets: b.assets.filter((a) => a.id !== timelineAssetId) }
      : b,
  );
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
  blockId: string,
  timelineAssetId: string,
  runtimeOverrideSeconds: number | null,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const idx = requireBlock(state, blockId);
  const block = state.blocks[idx];
  const assetIdx = block.assets.findIndex((a) => a.id === timelineAssetId);
  if (assetIdx < 0) throw new Error("Timeline asset not found");
  const item = { ...block.assets[assetIdx] };
  if (runtimeOverrideSeconds == null) {
    delete item.runtimeOverrideSeconds;
  } else {
    const secs = Math.round(runtimeOverrideSeconds);
    if (!Number.isFinite(secs) || secs < 0) throw new Error("Invalid runtime");
    item.runtimeOverrideSeconds = secs;
  }
  const assets = [
    ...block.assets.slice(0, assetIdx),
    item,
    ...block.assets.slice(assetIdx + 1),
  ];
  const blocks = state.blocks.map((b, i) => (i === idx ? { ...b, assets } : b));
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}

export async function setProducerRuntimeApproval(
  year: number,
  blockId: string,
  timelineAssetId: string,
  approvedRuntime: boolean,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const idx = requireBlock(state, blockId);
  const block = state.blocks[idx];
  const assetIdx = block.assets.findIndex((a) => a.id === timelineAssetId);
  if (assetIdx < 0) throw new Error("Timeline asset not found");
  const item = { ...block.assets[assetIdx], approvedRuntime };
  const assets = [
    ...block.assets.slice(0, assetIdx),
    item,
    ...block.assets.slice(assetIdx + 1),
  ];
  const blocks = state.blocks.map((b, i) => (i === idx ? { ...b, assets } : b));
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}

export async function addProducerBlock(
  year: number,
  opts: {
    afterBlockId?: string | null;
    templateId?: ProducerBlockTemplateId;
    title?: string;
    notes?: string | null;
  },
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const template = opts.templateId ? templateById(opts.templateId) : null;
  const block: ProducerShowBlock = {
    id: randomUUID(),
    title: opts.title?.trim() || template?.title || "Custom Block",
    notes:
      opts.notes !== undefined
        ? opts.notes
        : template?.notes
          ? template.notes
          : null,
    eraId: template?.eraId ?? "mixed",
    collapsed: false,
    assets: [],
  };
  const blocks = [...state.blocks];
  if (opts.afterBlockId) {
    const afterIdx = findBlockIndex(state, opts.afterBlockId);
    const insertAt = afterIdx >= 0 ? afterIdx + 1 : blocks.length;
    blocks.splice(insertAt, 0, block);
  } else {
    blocks.push(block);
  }
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}

export async function duplicateProducerBlock(
  year: number,
  blockId: string,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const idx = requireBlock(state, blockId);
  const source = state.blocks[idx];
  const copy: ProducerShowBlock = {
    id: randomUUID(),
    title: `${source.title} (copy)`,
    notes: source.notes,
    eraId: source.eraId,
    collapsed: false,
    assets: source.assets.map(cloneAsset),
  };
  const blocks = [...state.blocks];
  blocks.splice(idx + 1, 0, copy);
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}

export async function renameProducerBlock(
  year: number,
  blockId: string,
  title: string,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const idx = requireBlock(state, blockId);
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title required");
  const blocks = state.blocks.map((b, i) =>
    i === idx ? { ...b, title: trimmed } : b,
  );
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}

export async function updateProducerBlockNotes(
  year: number,
  blockId: string,
  notes: string | null,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const idx = requireBlock(state, blockId);
  const blocks = state.blocks.map((b, i) =>
    i === idx ? { ...b, notes: notes?.trim() ? notes.trim() : null } : b,
  );
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}

export async function deleteProducerBlock(
  year: number,
  blockId: string,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const blocks = state.blocks.filter((b) => b.id !== blockId);
  if (blocks.length === state.blocks.length) throw new Error("Block not found");
  if (blocks.length === 0) throw new Error("Cannot delete the last block");
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}

export async function moveProducerBlock(
  year: number,
  blockId: string,
  direction: "up" | "down",
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const idx = requireBlock(state, blockId);
  const target = direction === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= state.blocks.length) {
    throw new Error("Cannot move block further");
  }
  const blocks = [...state.blocks];
  const [item] = blocks.splice(idx, 1);
  blocks.splice(target, 0, item);
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}

export async function setProducerBlockCollapsed(
  year: number,
  blockId: string,
  collapsed: boolean,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const idx = requireBlock(state, blockId);
  const blocks = state.blocks.map((b, i) =>
    i === idx ? { ...b, collapsed } : b,
  );
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}

export async function setProducerBlockEra(
  year: number,
  blockId: string,
  eraId: ProducerEraId,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const idx = requireBlock(state, blockId);
  const blocks = state.blocks.map((b, i) =>
    i === idx ? { ...b, eraId: parseProducerEraId(eraId) } : b,
  );
  const next = { ...state, blocks };
  await saveProducerTimeline(next);
  return next;
}

export async function setProducerEraTargets(
  year: number,
  eraTargets: Partial<ProducerEraTargets>,
): Promise<ProducerTimelineState> {
  const state = await loadProducerTimeline(year);
  const nextTargets = { ...state.eraTargets };
  for (const era of ["1967", "1978", "1992"] as const) {
    const v = eraTargets[era];
    if (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 24 * 60) {
      nextTargets[era] = Math.round(v);
    }
  }
  const next = { ...state, eraTargets: nextTargets };
  await saveProducerTimeline(next);
  return next;
}
