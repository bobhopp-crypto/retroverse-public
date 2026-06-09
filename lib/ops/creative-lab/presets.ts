import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";

import {
  normalizeConceptStrategyId,
  normalizeConceptStrategyMap,
} from "./concept-strategies";
import {
  BUILTIN_PRESET_LIBRARY,
  OBSOLETE_BUILTIN_PRESET_IDS,
  singleStyleSelection,
} from "./preset-library";
import { creativeLabStylePresetPath, creativeLabStylesDir } from "./paths";
import { normalizeStyleSelection } from "./style-catalog";
import type { ConceptStrategyId, CreativeLabPresetFile, StyleSelection } from "./types";

function seedToFile(seed: (typeof BUILTIN_PRESET_LIBRARY)[number], now: string): CreativeLabPresetFile {
  return {
    version: 2,
    id: seed.id,
    name: seed.name,
    description: seed.description,
    builtin: true,
    credentialStyle: seed.credentialStyle,
    illustrationStyle: seed.illustrationStyle,
    colorStyle: seed.colorStyle,
    densityStyle: seed.densityStyle,
    defaultConceptStrategy: seed.defaultConceptStrategy,
    conceptStrategies: seed.conceptStrategies,
    styleSelection: singleStyleSelection(
      seed.credentialStyle,
      seed.illustrationStyle,
      seed.colorStyle,
      seed.densityStyle,
    ),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizePreset(raw: unknown, fallbackId: string): CreativeLabPresetFile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<CreativeLabPresetFile>;
  const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : fallbackId;
  const now = new Date().toISOString();

  const credentialStyle =
    typeof obj.credentialStyle === "string" && obj.credentialStyle.trim()
      ? obj.credentialStyle.trim()
      : obj.styleSelection?.credential?.[0]?.id ?? "";
  const illustrationStyle =
    typeof obj.illustrationStyle === "string" && obj.illustrationStyle.trim()
      ? obj.illustrationStyle.trim()
      : obj.styleSelection?.illustration?.[0]?.id ?? "";
  const colorStyle =
    typeof obj.colorStyle === "string" && obj.colorStyle.trim()
      ? obj.colorStyle.trim()
      : obj.styleSelection?.color?.[0]?.id ?? "";
  const densityStyle =
    typeof obj.densityStyle === "string" && obj.densityStyle.trim()
      ? obj.densityStyle.trim()
      : obj.styleSelection?.density?.[0]?.id ?? "medium";

  const styleSelection = normalizeStyleSelection(
    obj.styleSelection ??
      (credentialStyle && illustrationStyle && colorStyle
        ? singleStyleSelection(credentialStyle, illustrationStyle, colorStyle, densityStyle)
        : undefined),
  );

  const defaultConceptStrategy = normalizeConceptStrategyId(obj.defaultConceptStrategy);
  const conceptStrategies = normalizeConceptStrategyMap(obj.conceptStrategies);

  return {
    version: 2,
    id,
    name: typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : id,
    description: typeof obj.description === "string" ? obj.description : "",
    builtin: obj.builtin === true,
    credentialStyle: credentialStyle || styleSelection.credential[0]?.id || "",
    illustrationStyle: illustrationStyle || styleSelection.illustration[0]?.id || "",
    colorStyle: colorStyle || styleSelection.color[0]?.id || "",
    densityStyle: densityStyle || styleSelection.density[0]?.id || "medium",
    defaultConceptStrategy,
    conceptStrategies,
    styleSelection,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : now,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : now,
  };
}

export async function syncBuiltinPresets(): Promise<void> {
  await mkdir(creativeLabStylesDir(), { recursive: true });
  const now = new Date().toISOString();

  for (const obsoleteId of OBSOLETE_BUILTIN_PRESET_IDS) {
    const path = creativeLabStylePresetPath(obsoleteId);
    if (existsSync(path)) await rm(path, { force: true });
  }

  for (const seed of BUILTIN_PRESET_LIBRARY) {
    const path = creativeLabStylePresetPath(seed.id);
    const existing = existsSync(path) ? await loadPreset(seed.id) : null;
    const file = seedToFile(seed, existing?.createdAt ?? now);
    file.createdAt = existing?.createdAt ?? now;
    file.updatedAt = now;
    await writeFile(path, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  }
}

/** @deprecated use syncBuiltinPresets */
export async function ensureDefaultPresets(): Promise<void> {
  await syncBuiltinPresets();
}

export async function listPresets(): Promise<CreativeLabPresetFile[]> {
  await syncBuiltinPresets();
  const dir = creativeLabStylesDir();
  const names = await readdir(dir);
  const presets: CreativeLabPresetFile[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const id = name.replace(/\.json$/, "");
    const preset = await loadPreset(id);
    if (preset) presets.push(preset);
  }
  return presets.sort((a, b) => {
    if (a.builtin !== b.builtin) return a.builtin ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function loadPreset(presetId: string): Promise<CreativeLabPresetFile | null> {
  try {
    const raw = JSON.parse(await readFile(creativeLabStylePresetPath(presetId), "utf8")) as unknown;
    return normalizePreset(raw, presetId);
  } catch {
    return null;
  }
}

export async function savePreset(input: {
  id: string;
  name: string;
  description?: string;
  styleSelection: StyleSelection;
  credentialStyle?: string;
  illustrationStyle?: string;
  colorStyle?: string;
  densityStyle?: string;
  defaultConceptStrategy?: ConceptStrategyId;
  conceptStrategies?: CreativeLabPresetFile["conceptStrategies"];
  builtin?: boolean;
}): Promise<CreativeLabPresetFile> {
  await mkdir(creativeLabStylesDir(), { recursive: true });
  const existing = await loadPreset(input.id);
  const now = new Date().toISOString();
  const styleSelection = normalizeStyleSelection(input.styleSelection);

  const file: CreativeLabPresetFile = {
    version: 2,
    id: input.id.trim(),
    name: input.name.trim() || input.id.trim(),
    description: input.description?.trim() ?? "",
    builtin: input.builtin ?? false,
    credentialStyle: input.credentialStyle ?? styleSelection.credential[0]?.id ?? "",
    illustrationStyle: input.illustrationStyle ?? styleSelection.illustration[0]?.id ?? "",
    colorStyle: input.colorStyle ?? styleSelection.color[0]?.id ?? "",
    densityStyle: input.densityStyle ?? styleSelection.density[0]?.id ?? "medium",
    defaultConceptStrategy: normalizeConceptStrategyId(
      input.defaultConceptStrategy ?? existing?.defaultConceptStrategy,
    ),
    conceptStrategies: normalizeConceptStrategyMap(
      input.conceptStrategies ?? existing?.conceptStrategies,
    ),
    styleSelection,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await writeFile(creativeLabStylePresetPath(file.id), `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return file;
}

export async function duplicatePreset(
  sourceId: string,
  newId: string,
  newName: string,
): Promise<CreativeLabPresetFile | null> {
  const source = await loadPreset(sourceId);
  if (!source) return null;
  return savePreset({
    id: newId,
    name: newName,
    description: source.description ? `${source.description} (copy)` : `Copy of ${source.name}`,
    styleSelection: source.styleSelection,
    credentialStyle: source.credentialStyle,
    illustrationStyle: source.illustrationStyle,
    colorStyle: source.colorStyle,
    densityStyle: source.densityStyle,
    defaultConceptStrategy: source.defaultConceptStrategy,
    conceptStrategies: source.conceptStrategies,
    builtin: false,
  });
}

