import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  creativeLabProjectGeneratedDir,
  creativeLabProjectSelectedDir,
} from "./paths";
import type {
  ConceptVariationKey,
  CreativeLabAsset,
  CreativeLabAssetStatus,
  CreativeLabAssetType,
  CreativeLabModuleId,
  CreativeLabProjectFile,
  FinalAssetSlot,
} from "./types";
import { FINAL_ASSET_SLOTS } from "./types";

export function emptyFinalSlots(): Record<FinalAssetSlot, string | null> {
  return {
    "final-front": null,
    "final-back": null,
    "final-poster": null,
    "final-bumper": null,
  };
}

export function moduleDefaultAssetType(module: CreativeLabModuleId): CreativeLabAssetType {
  switch (module) {
    case "poster-lab":
      return "poster";
    case "bumper-lab":
      return "bumper";
    case "card-lab":
      return "card";
    case "magazine-lab":
      return "magazine";
    default:
      return "pass-front";
  }
}

export function slotForAssetType(type: CreativeLabAssetType): FinalAssetSlot | null {
  switch (type) {
    case "pass-front":
    case "credential":
      return "final-front";
    case "pass-back":
      return "final-back";
    case "poster":
      return "final-poster";
    case "bumper":
      return "final-bumper";
    default:
      return "final-front";
  }
}

export function finalExportFilename(slot: FinalAssetSlot): string {
  switch (slot) {
    case "final-front":
      return "final-front.png";
    case "final-back":
      return "final-back.png";
    case "final-poster":
      return "poster.png";
    case "final-bumper":
      return "bumper.png";
  }
}

function newAssetId(): string {
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeAsset(raw: unknown, projectId: string): CreativeLabAsset | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<CreativeLabAsset & { selected?: boolean; status?: string }>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  if (!id) return null;

  let status: CreativeLabAssetStatus = "generated";
  const rawStatus = row.status;
  if (rawStatus === "approved" || rawStatus === "rejected" || rawStatus === "final" || rawStatus === "generated") {
    status = rawStatus;
  } else if (rawStatus === "placeholder" || rawStatus === "pending") {
    status = "generated";
  } else if (row.selected === true) {
    status = "approved";
  }

  const type =
    row.type === "pass-front" ||
    row.type === "pass-back" ||
    row.type === "poster" ||
    row.type === "bumper" ||
    row.type === "credential" ||
    row.type === "card" ||
    row.type === "magazine"
      ? row.type
      : "pass-front";

  const concept =
    row.concept === "A" || row.concept === "B" || row.concept === "C" || row.concept === "D"
      ? row.concept
      : undefined;

  return {
    id,
    projectId: typeof row.projectId === "string" ? row.projectId : projectId,
    type,
    concept,
    status,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    filePath: typeof row.filePath === "string" ? row.filePath : undefined,
    notes: typeof row.notes === "string" ? row.notes : undefined,
    promptId: typeof row.promptId === "string" ? row.promptId : undefined,
    module:
      row.module === "poster-lab" ||
      row.module === "bumper-lab" ||
      row.module === "card-lab" ||
      row.module === "magazine-lab" ||
      row.module === "pass-lab"
        ? row.module
        : undefined,
    strategyId: row.strategyId,
  };
}

export function normalizeAssets(raw: unknown, projectId: string): CreativeLabAsset[] {
  const rows = Array.isArray(raw) ? raw : [];
  const legacy = Array.isArray((raw as { generatedAssets?: unknown })?.generatedAssets)
    ? ((raw as { generatedAssets: unknown[] }).generatedAssets)
    : [];
  const combined = rows.length ? rows : legacy;
  return combined
    .map((item) => normalizeAsset(item, projectId))
    .filter((a): a is CreativeLabAsset => a != null);
}

export function normalizeFinalSlots(raw: unknown): Record<FinalAssetSlot, string | null> {
  const base = emptyFinalSlots();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Partial<Record<FinalAssetSlot, unknown>>;
  for (const slot of FINAL_ASSET_SLOTS) {
    const v = obj[slot];
    base[slot] = typeof v === "string" && v.trim() ? v.trim() : null;
  }
  return base;
}

export async function writePlaceholderAssetFile(
  projectId: string,
  asset: CreativeLabAsset,
  label: string,
): Promise<string> {
  const generatedDir = creativeLabProjectGeneratedDir(projectId);
  await mkdir(generatedDir, { recursive: true });
  const rel = `generated/${asset.id}.placeholder.json`;
  const abs = join(creativeLabProjectGeneratedDir(projectId), `${asset.id}.placeholder.json`);
  await writeFile(
    abs,
    `${JSON.stringify(
      {
        asset_id: asset.id,
        project_id: asset.projectId,
        type: asset.type,
        concept: asset.concept,
        status: asset.status,
        label,
        notes: "Placeholder — awaiting image provider integration.",
        created_at: asset.createdAt,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return rel;
}

export async function mirrorAssetToSelected(
  projectId: string,
  asset: CreativeLabAsset,
): Promise<string> {
  const selectedDir = creativeLabProjectSelectedDir(projectId);
  await mkdir(selectedDir, { recursive: true });
  const destName = `${asset.id}-${asset.status}.placeholder.json`;
  const destAbs = join(selectedDir, destName);
  const srcAbs = join(creativeLabProjectGeneratedDir(projectId), `${asset.id}.placeholder.json`);
  if (existsSync(srcAbs)) {
    await copyFile(srcAbs, destAbs);
  } else {
    await writeFile(destAbs, `${JSON.stringify(asset, null, 2)}\n`, "utf8");
  }
  return `selected/${destName}`;
}

export function createPlaceholderAssets(input: {
  projectId: string;
  module: CreativeLabModuleId;
  prompts: Array<{
    id: string;
    variationKey?: ConceptVariationKey;
    strategyId?: CreativeLabAsset["strategyId"];
    conceptSummary: string;
    createdAt: string;
  }>;
}): CreativeLabAsset[] {
  const type = moduleDefaultAssetType(input.module);
  return input.prompts.map((prompt) => ({
    id: newAssetId(),
    projectId: input.projectId,
    type,
    concept: prompt.variationKey,
    status: "generated" as const,
    createdAt: prompt.createdAt,
    promptId: prompt.id,
    module: input.module,
    strategyId: prompt.strategyId,
    notes: prompt.conceptSummary,
  }));
}

export function updateAssetStatus(
  project: CreativeLabProjectFile,
  assetId: string,
  status: CreativeLabAssetStatus,
): CreativeLabProjectFile {
  const assets = project.assets.map((a) => (a.id === assetId ? { ...a, status } : a));
  return { ...project, assets };
}

export function setAssetAsFinal(
  project: CreativeLabProjectFile,
  assetId: string,
  slot?: FinalAssetSlot,
): CreativeLabProjectFile {
  const asset = project.assets.find((a) => a.id === assetId);
  if (!asset) return project;

  const targetSlot = slot ?? slotForAssetType(asset.type) ?? "final-front";
  const finalAssetSlots = { ...project.finalAssetSlots };

  // Clear prior final in this slot
  const priorId = finalAssetSlots[targetSlot];
  let assets = project.assets.map((a) => {
    if (a.id === priorId && priorId !== assetId) return { ...a, status: "approved" as const };
    if (a.id === assetId) return { ...a, status: "final" as const };
    return a;
  });

  // Only one final per slot
  for (const s of FINAL_ASSET_SLOTS) {
    if (s !== targetSlot && finalAssetSlots[s] === assetId) {
      finalAssetSlots[s] = null;
    }
  }
  finalAssetSlots[targetSlot] = assetId;

  return { ...project, assets, finalAssetSlots };
}
