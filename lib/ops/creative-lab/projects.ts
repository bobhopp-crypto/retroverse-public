import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import { join } from "path";

import {
  createPlaceholderAssets,
  mirrorAssetToSelected,
  moduleDefaultAssetType,
  normalizeAssets,
  normalizeFinalSlots,
  setAssetAsFinal,
  updateAssetStatus,
  writeArtworkAssetFile,
  writePlaceholderAssetFile,
} from "./assets";
import { generateArtwork, resolveArtworkProvider } from "./artwork";
import { compositionForKey } from "./concept-compositions";
import { buildConceptVariations } from "./concept-variations";
import { normalizeConceptStrategyMap, strategyForVariation } from "./concept-strategies";
import { exportFinalDeliverables, exportProjectPackage } from "./export-package";
import { loadPreset } from "./presets";
import { backCompositionForKey, renderPassBackPrompt } from "./pass-back-prompt";
import { renderPassConceptPrompt } from "./pass-concept-prompt";
import {
  creativeLabProjectIndexPath,
  creativeLabProjectPath,
  creativeLabProjectDir,
  creativeLabProjectsDir,
} from "./paths";
import { persistProjectBundle, ensureProjectLayout } from "./project-storage";
import { baseProjectSlug, uniqueProjectSlug } from "./project-slug";
import { DEFAULT_ARTIFACT_TYPE, normalizeArtifactTypeId } from "./artifact-types";
import { refinementsForArtDirection } from "./art-direction-refinements";
import { renderPromptText } from "./prompt-renderer";
import { emptyStyleSelection, normalizeStyleSelection } from "./style-catalog";
import { CONCEPT_KEYS, normalizeVisualWorldId, visualWorldById, type VisualWorldId } from "./visual-worlds";
import type {
  CreativeLabIndexFile,
  CreativeLabModuleId,
  CreativeLabProjectFile,
  CreativeLabAsset,
  CreativeLabAssetStatus,
  FinalAssetSlot,
  GeneratedPrompt,
  RefinementVariation,
  StyleSelection,
} from "./types";

function normalizeGeneratedPrompts(
  raw: unknown,
  project: Pick<
    CreativeLabProjectFile,
    | "event"
    | "venue"
    | "date"
    | "featuredYears"
    | "theme"
    | "styleSelection"
    | "activeModule"
    | "conceptStrategies"
    | "artifactType"
  >,
): GeneratedPrompt[] {
  if (!Array.isArray(raw)) return [];
  const out: GeneratedPrompt[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<GeneratedPrompt>;
    if (typeof row.id !== "string" || typeof row.conceptSummary !== "string") continue;
    const module =
      row.module === "poster-lab" ||
      row.module === "bumper-lab" ||
      row.module === "card-lab" ||
      row.module === "magazine-lab" ||
      row.module === "pass-lab"
        ? row.module
        : project.activeModule;
    const variationKey =
      row.variationKey === "A" || row.variationKey === "B" || row.variationKey === "C" || row.variationKey === "D"
        ? row.variationKey
        : undefined;
    const renderedPrompt =
      typeof row.renderedPrompt === "string" && row.renderedPrompt.trim()
        ? row.renderedPrompt
        : renderPromptText({
            event: project.event,
            venue: project.venue,
            date: project.date,
            featuredYears: project.featuredYears,
            theme: project.theme,
            styleSelection: project.styleSelection,
            module,
            variationKey,
            conceptStrategies: project.conceptStrategies,
            artifactType: project.artifactType,
          });
    const strategyId =
      row.strategyId ??
      row.structuredConcept?.strategyId ??
      strategyForVariation(project.conceptStrategies, variationKey);
    out.push({
      id: row.id,
      module,
      conceptSummary: row.conceptSummary,
      renderedPrompt,
      variationKey,
      variationSetId: typeof row.variationSetId === "string" ? row.variationSetId : undefined,
      passSide: row.passSide === "back" ? "back" : row.passSide === "front" ? "front" : undefined,
      parentFrontAssetId:
        typeof row.parentFrontAssetId === "string" ? row.parentFrontAssetId : undefined,
      assetId: typeof row.assetId === "string" ? row.assetId : undefined,
      strategyId,
      structuredConcept: row.structuredConcept ?? {
        event: project.event,
        venue: project.venue,
        date: project.date,
        featuredYears: project.featuredYears,
        theme: project.theme,
        dominantStyles: { credential: [], illustration: [], color: [], density: [] },
        module,
        variationKey,
        strategyId,
      },
      createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    });
  }
  return out;
}

function normalizeRefinementVariations(raw: unknown): RefinementVariation[] {
  if (!Array.isArray(raw)) return [];
  const out: RefinementVariation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<RefinementVariation> & { layoutId?: string };
    if (typeof row.id !== "string" || typeof row.index !== "number") continue;
    if (row.index < 1 || row.index > 8) continue;
    const artDirectionId = normalizeVisualWorldId(row.artDirectionId) ?? "psychedelic-festival";
    out.push({
      id: row.id,
      index: row.index,
      treatmentId:
        typeof row.treatmentId === "string"
          ? row.treatmentId
          : typeof row.layoutId === "string"
            ? row.layoutId
            : `refine-${row.index}`,
      treatmentLabel: typeof row.treatmentLabel === "string" ? row.treatmentLabel : `Variant ${row.index}`,
      parentPromptId: typeof row.parentPromptId === "string" ? row.parentPromptId : "",
      assetId: typeof row.assetId === "string" ? row.assetId : undefined,
      artDirectionId,
      layoutId: typeof row.layoutId === "string" ? row.layoutId : undefined,
      strategyId:
        row.strategyId === "broadcast-focus" ||
        row.strategyId === "credential-focus" ||
        row.strategyId === "festival-focus" ||
        row.strategyId === "collector-focus"
          ? row.strategyId
          : undefined,
      createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    });
  }
  return out.sort((a, b) => a.index - b.index);
}

function projectFolderId(project: Pick<CreativeLabProjectFile, "id" | "folderSlug">): string {
  return project.folderSlug || project.id;
}

function normalizeProject(raw: unknown, fallbackId: string): CreativeLabProjectFile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<CreativeLabProjectFile> & { generatedAssets?: unknown; selectedAssetIds?: unknown };
  const now = new Date().toISOString();
  const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : fallbackId;
  const folderSlug = typeof obj.folderSlug === "string" && obj.folderSlug.trim() ? obj.folderSlug.trim() : id;

  const featuredYears = Array.isArray(obj.featuredYears)
    ? obj.featuredYears.filter((y): y is number => typeof y === "number" && y > 1900 && y < 2100)
    : [];

  const activeModule: CreativeLabModuleId =
    obj.activeModule === "poster-lab" ||
    obj.activeModule === "bumper-lab" ||
    obj.activeModule === "card-lab" ||
    obj.activeModule === "magazine-lab" ||
    obj.activeModule === "pass-lab"
      ? obj.activeModule
      : "pass-lab";

  const base: CreativeLabProjectFile = {
    version: 2,
    id,
    folderSlug,
    name: typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : "Untitled Project",
    event: typeof obj.event === "string" ? obj.event : "",
    venue: typeof obj.venue === "string" ? obj.venue : "",
    date: typeof obj.date === "string" ? obj.date : "",
    featuredYears,
    theme: typeof obj.theme === "string" ? obj.theme : "",
    styleSelection: normalizeStyleSelection(obj.styleSelection),
    activePresetId: typeof obj.activePresetId === "string" ? obj.activePresetId : undefined,
    conceptStrategies: obj.conceptStrategies
      ? normalizeConceptStrategyMap(obj.conceptStrategies)
      : undefined,
    artifactType: normalizeArtifactTypeId(obj.artifactType),
    selectedConceptPromptId:
      typeof obj.selectedConceptPromptId === "string" ? obj.selectedConceptPromptId : null,
    selectedConceptKey:
      obj.selectedConceptKey === "A" ||
      obj.selectedConceptKey === "B" ||
      obj.selectedConceptKey === "C" ||
      obj.selectedConceptKey === "D"
        ? obj.selectedConceptKey
        : null,
    frontLocked: obj.frontLocked === true,
    lockedFrontAssetId:
      typeof obj.lockedFrontAssetId === "string" ? obj.lockedFrontAssetId : null,
    lockedFrontPromptId:
      typeof obj.lockedFrontPromptId === "string" ? obj.lockedFrontPromptId : null,
    frontVariationSetId:
      typeof obj.frontVariationSetId === "string" ? obj.frontVariationSetId : null,
    backVariationSetId:
      typeof obj.backVariationSetId === "string" ? obj.backVariationSetId : null,
    selectedBackPromptId:
      typeof obj.selectedBackPromptId === "string" ? obj.selectedBackPromptId : null,
    selectedBackKey:
      obj.selectedBackKey === "A" ||
      obj.selectedBackKey === "B" ||
      obj.selectedBackKey === "C" ||
      obj.selectedBackKey === "D"
        ? obj.selectedBackKey
        : null,
    selectedArtDirectionId: normalizeVisualWorldId(obj.selectedArtDirectionId),
    workflowRound:
      obj.workflowRound === 2 || obj.workflowRound === 3 ? obj.workflowRound : 1,
    refinementGenerated: obj.refinementGenerated === true,
    refinementVariations: normalizeRefinementVariations(obj.refinementVariations),
    selectedVariationIndex:
      typeof obj.selectedVariationIndex === "number" &&
      obj.selectedVariationIndex >= 1 &&
      obj.selectedVariationIndex <= 8
        ? obj.selectedVariationIndex
        : null,
    mockVariationRound: typeof obj.mockVariationRound === "number" ? obj.mockVariationRound : 0,
    generatedPrompts: [],
    assets: normalizeAssets(obj.assets ?? obj.generatedAssets, id),
    finalAssetSlots: normalizeFinalSlots(obj.finalAssetSlots),
    activeModule,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : now,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : now,
  };
  return finalizeProject(base, obj.generatedPrompts);
}

function finalizeProject(project: CreativeLabProjectFile, rawPrompts: unknown): CreativeLabProjectFile {
  return {
    ...project,
    generatedPrompts: normalizeGeneratedPrompts(rawPrompts, project),
  };
}

async function loadIndex(): Promise<CreativeLabIndexFile> {
  try {
    const raw = JSON.parse(await readFile(creativeLabProjectIndexPath(), "utf8")) as unknown;
    if (!raw || typeof raw !== "object") return { version: 1, projects: [] };
    const obj = raw as Partial<CreativeLabIndexFile>;
    const projects = Array.isArray(obj.projects)
      ? obj.projects
          .map((p) => {
            if (!p || typeof p !== "object") return null;
            const row = p as {
              id?: unknown;
              folderSlug?: unknown;
              name?: unknown;
              event?: unknown;
              updatedAt?: unknown;
            };
            const id = typeof row.id === "string" ? row.id.trim() : "";
            if (!id) return null;
            return {
              id,
              folderSlug: typeof row.folderSlug === "string" ? row.folderSlug : id,
              name: typeof row.name === "string" ? row.name : id,
              event: typeof row.event === "string" ? row.event : "",
              updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : "",
            };
          })
          .filter((p): p is NonNullable<typeof p> => p != null)
      : [];
    return { version: 1, projects };
  } catch {
    return { version: 1, projects: [] };
  }
}

async function saveIndex(index: CreativeLabIndexFile): Promise<void> {
  await mkdir(creativeLabProjectsDir(), { recursive: true });
  await writeFile(creativeLabProjectIndexPath(), `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

async function syncIndexEntry(project: CreativeLabProjectFile): Promise<void> {
  const index = await loadIndex();
  const entry = {
    id: project.id,
    folderSlug: project.folderSlug,
    name: project.name,
    event: project.event,
    updatedAt: project.updatedAt,
  };
  const i = index.projects.findIndex((p) => p.id === project.id);
  if (i >= 0) index.projects[i] = entry;
  else index.projects.unshift(entry);
  index.projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await saveIndex(index);
}

async function findProjectPath(projectId: string): Promise<string | null> {
  const index = await loadIndex();
  const entry = index.projects.find((p) => p.id === projectId || p.folderSlug === projectId);
  const folder = entry?.folderSlug ?? projectId;
  const path = creativeLabProjectPath(folder);
  if (existsSync(path)) return path;
  if (existsSync(creativeLabProjectPath(projectId))) return creativeLabProjectPath(projectId);
  return null;
}

export async function listProjects(): Promise<CreativeLabIndexFile["projects"]> {
  await mkdir(creativeLabProjectsDir(), { recursive: true });
  const index = await loadIndex();
  if (index.projects.length > 0) return index.projects;

  const dirs = await readdir(creativeLabProjectsDir(), { withFileTypes: true });
  const discovered: CreativeLabIndexFile["projects"] = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const project = await loadProject(d.name);
    if (project) {
      discovered.push({
        id: project.id,
        folderSlug: project.folderSlug,
        name: project.name,
        event: project.event,
        updatedAt: project.updatedAt,
      });
    }
  }
  if (discovered.length) {
    await saveIndex({ version: 1, projects: discovered });
  }
  return discovered;
}

export async function loadProject(projectId: string): Promise<CreativeLabProjectFile | null> {
  const path = await findProjectPath(projectId);
  if (!path) return null;
  try {
    const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
    return normalizeProject(raw, projectId);
  } catch {
    return null;
  }
}

export async function createProject(input: {
  name: string;
  event?: string;
  venue?: string;
  date?: string;
  featuredYears?: number[];
  theme?: string;
  styleSelection?: StyleSelection;
  artifactType?: CreativeLabProjectFile["artifactType"];
}): Promise<CreativeLabProjectFile> {
  const folderSlug = await uniqueProjectSlug(input.event ?? "", input.date ?? "");
  const now = new Date().toISOString();
  const project: CreativeLabProjectFile = {
    version: 2,
    id: folderSlug,
    folderSlug,
    name: input.name.trim() || "Untitled Project",
    event: input.event?.trim() ?? "",
    venue: input.venue?.trim() ?? "",
    date: input.date?.trim() ?? "",
    featuredYears: input.featuredYears ?? [],
    theme: input.theme?.trim() ?? "",
    styleSelection: input.styleSelection ? normalizeStyleSelection(input.styleSelection) : emptyStyleSelection(),
    artifactType: normalizeArtifactTypeId(input.artifactType ?? DEFAULT_ARTIFACT_TYPE),
    generatedPrompts: [],
    assets: [],
    finalAssetSlots: normalizeFinalSlots(null),
    activeModule: "pass-lab",
    createdAt: now,
    updatedAt: now,
  };
  await saveProject(project);
  return project;
}

export async function saveProject(project: CreativeLabProjectFile): Promise<CreativeLabProjectFile> {
  const folderId = projectFolderId(project);
  await ensureProjectLayout(folderId);
  const updated = { ...project, folderSlug: folderId, updatedAt: new Date().toISOString() };
  await persistProjectBundle(updated);
  await syncIndexEntry(updated);
  return updated;
}

export async function updateProject(
  projectId: string,
  patch: Partial<
    Pick<
      CreativeLabProjectFile,
      | "name"
      | "event"
      | "venue"
      | "date"
      | "featuredYears"
      | "theme"
      | "styleSelection"
      | "activeModule"
      | "activePresetId"
      | "conceptStrategies"
      | "artifactType"
      | "selectedConceptPromptId"
      | "selectedConceptKey"
      | "frontLocked"
      | "lockedFrontAssetId"
      | "lockedFrontPromptId"
      | "frontVariationSetId"
      | "backVariationSetId"
      | "selectedBackPromptId"
      | "selectedBackKey"
      | "selectedArtDirectionId"
      | "workflowRound"
      | "refinementGenerated"
      | "refinementVariations"
      | "selectedVariationIndex"
      | "mockVariationRound"
      | "assets"
      | "finalAssetSlots"
      | "generatedPrompts"
    >
  >,
): Promise<CreativeLabProjectFile | null> {
  const existing = await loadProject(projectId);
  if (!existing) return null;
  const updated: CreativeLabProjectFile = {
    ...existing,
    ...patch,
    styleSelection: patch.styleSelection
      ? normalizeStyleSelection(patch.styleSelection)
      : existing.styleSelection,
    activePresetId:
      patch.activePresetId !== undefined ? patch.activePresetId || undefined : existing.activePresetId,
    conceptStrategies: patch.conceptStrategies
      ? normalizeConceptStrategyMap(patch.conceptStrategies)
      : existing.conceptStrategies,
    artifactType:
      patch.artifactType !== undefined
        ? normalizeArtifactTypeId(patch.artifactType)
        : existing.artifactType ?? DEFAULT_ARTIFACT_TYPE,
    selectedConceptPromptId:
      patch.selectedConceptPromptId !== undefined
        ? patch.selectedConceptPromptId
        : existing.selectedConceptPromptId ?? null,
    selectedConceptKey:
      patch.selectedConceptKey !== undefined ? patch.selectedConceptKey : (existing.selectedConceptKey ?? null),
    frontLocked: patch.frontLocked !== undefined ? patch.frontLocked : (existing.frontLocked ?? false),
    lockedFrontAssetId:
      patch.lockedFrontAssetId !== undefined
        ? patch.lockedFrontAssetId
        : (existing.lockedFrontAssetId ?? null),
    lockedFrontPromptId:
      patch.lockedFrontPromptId !== undefined
        ? patch.lockedFrontPromptId
        : (existing.lockedFrontPromptId ?? null),
    frontVariationSetId:
      patch.frontVariationSetId !== undefined
        ? patch.frontVariationSetId
        : (existing.frontVariationSetId ?? null),
    backVariationSetId:
      patch.backVariationSetId !== undefined
        ? patch.backVariationSetId
        : (existing.backVariationSetId ?? null),
    selectedBackPromptId:
      patch.selectedBackPromptId !== undefined
        ? patch.selectedBackPromptId
        : (existing.selectedBackPromptId ?? null),
    selectedBackKey:
      patch.selectedBackKey !== undefined ? patch.selectedBackKey : (existing.selectedBackKey ?? null),
    workflowRound: patch.workflowRound !== undefined ? patch.workflowRound : (existing.workflowRound ?? 1),
    refinementGenerated:
      patch.refinementGenerated !== undefined
        ? patch.refinementGenerated
        : (existing.refinementGenerated ?? false),
    refinementVariations:
      patch.refinementVariations !== undefined
        ? patch.refinementVariations
        : (existing.refinementVariations ?? []),
    selectedVariationIndex:
      patch.selectedVariationIndex !== undefined
        ? patch.selectedVariationIndex
        : (existing.selectedVariationIndex ?? null),
    mockVariationRound:
      patch.mockVariationRound !== undefined ? patch.mockVariationRound : (existing.mockVariationRound ?? 0),
    assets: patch.assets ?? existing.assets,
    finalAssetSlots: patch.finalAssetSlots ?? existing.finalAssetSlots,
    generatedPrompts: patch.generatedPrompts ?? existing.generatedPrompts,
    updatedAt: new Date().toISOString(),
  };
  return saveProject(updated);
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const project = await loadProject(projectId);
  if (!project) return false;
  const dir = creativeLabProjectDir(projectFolderId(project));
  if (!existsSync(dir)) return false;
  await rm(dir, { recursive: true, force: true });
  const index = await loadIndex();
  index.projects = index.projects.filter((p) => p.id !== projectId);
  await saveIndex(index);
  return true;
}

function artworkContextFromPrompt(
  project: CreativeLabProjectFile,
  prompt: string,
  worldId: VisualWorldId,
  treatmentLabel?: string,
): import("./artwork/types").ArtworkPromptContext {
  const world = visualWorldById(worldId);
  return {
    prompt,
    artifactTypeId: project.artifactType ?? "vip-pass",
    event: project.event,
    venue: project.venue,
    date: project.date,
    featuredYears: project.featuredYears,
    module: project.activeModule,
    artDirectionTitle: world.title,
    treatmentLabel,
  };
}

async function attachPlaceholderFiles(
  project: CreativeLabProjectFile,
  assets: CreativeLabAsset[],
): Promise<CreativeLabAsset[]> {
  const folderId = projectFolderId(project);
  const out: CreativeLabAsset[] = [];
  for (const asset of assets) {
    const rel = await writePlaceholderAssetFile(folderId, asset, asset.notes ?? asset.id);
    out.push({ ...asset, filePath: rel });
  }
  return out;
}

/** Generate 4 real pass concept images via OpenAI — same visual world, different compositions. */
export async function generatePassConceptsForProject(
  projectId: string,
  visualWorldId: VisualWorldId,
): Promise<CreativeLabProjectFile | null> {
  const project = await loadProject(projectId);
  if (!project) return null;

  const folderId = projectFolderId(project);
  const now = new Date().toISOString();
  const variationSetId = `set-${Date.now().toString(36)}`;
  const world = visualWorldById(visualWorldId);
  const prompts: GeneratedPrompt[] = [];
  const newAssets: CreativeLabAsset[] = [];
  const type = "pass-front" as const;

  for (const key of CONCEPT_KEYS) {
    const comp = compositionForKey(key, visualWorldId);
    const promptText = renderPassConceptPrompt({
      worldId: visualWorldId,
      event: project.event,
      venue: project.venue,
      date: project.date,
      featuredYears: project.featuredYears,
      conceptKey: key,
    });

    const promptId = `prompt-${Date.now().toString(36)}-${key.toLowerCase()}-${Math.random().toString(36).slice(2, 5)}`;
    const result = await generateArtwork(
      artworkContextFromPrompt(project, promptText, visualWorldId, comp.label),
      { count: 1, quality: "medium", size: "1024x1536" },
    );
    const image = result.images[0];
    if (!image) continue;

    const assetId = `asset-${Date.now().toString(36)}-${key.toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`;
    const rel = await writeArtworkAssetFile(folderId, assetId, image.buffer);
    console.log("[cl-artwork:register] concept asset", {
      projectId: project.id,
      conceptKey: key,
      assetId,
      promptId,
      filePath: rel,
      bytes: image.buffer.length,
    });

    newAssets.push({
      id: assetId,
      projectId: project.id,
      type,
      concept: key,
      status: "generated",
      createdAt: now,
      filePath: rel,
      promptId,
      module: "pass-lab",
      notes: `Concept ${key} · ${world.title} · ${resolveArtworkProvider()}`,
    });

    prompts.push({
      id: promptId,
      module: "pass-lab",
      conceptSummary: `${comp.label} — ${world.title}`,
      renderedPrompt: promptText,
      variationKey: key,
      variationSetId,
      passSide: "front",
      assetId,
      structuredConcept: {
        event: project.event,
        venue: project.venue,
        date: project.date,
        featuredYears: project.featuredYears,
        theme: project.theme,
        dominantStyles: { credential: [], illustration: [], color: [], density: [] },
        module: "pass-lab",
        variationKey: key,
      },
      createdAt: now,
    });
  }

  if (!prompts.length) {
    throw new Error("No pass concepts were generated");
  }

  return saveProject({
    ...project,
    generatedPrompts: [...prompts, ...project.generatedPrompts].slice(0, 48),
    assets: [...newAssets, ...project.assets].slice(0, 96),
    activeModule: "pass-lab",
    selectedArtDirectionId: visualWorldId,
    artifactType: project.artifactType ?? "vip-pass",
    workflowRound: 1,
    refinementGenerated: false,
    refinementVariations: [],
    selectedVariationIndex: null,
    selectedConceptKey: null,
    selectedConceptPromptId: null,
    frontLocked: false,
    lockedFrontAssetId: null,
    lockedFrontPromptId: null,
    frontVariationSetId: variationSetId,
    backVariationSetId: null,
    selectedBackPromptId: null,
    selectedBackKey: null,
    updatedAt: now,
  });
}

/** Approve and lock the selected front — required before back generation. */
export async function lockFrontAsset(projectId: string): Promise<CreativeLabProjectFile | null> {
  const project = await loadProject(projectId);
  if (!project) return null;
  const promptId = project.selectedConceptPromptId;
  if (!promptId) throw new Error("Select a front concept before locking");
  const winner = project.generatedPrompts.find(
    (p) => p.id === promptId && (p.passSide ?? "front") !== "back",
  );
  if (!winner?.assetId) throw new Error("Selected front has no generated asset");

  let updated = await approveAsset(projectId, winner.assetId);
  if (!updated) return null;

  return saveProject({
    ...updated,
    frontLocked: true,
    lockedFrontAssetId: winner.assetId,
    lockedFrontPromptId: promptId,
    frontVariationSetId: winner.variationSetId ?? project.frontVariationSetId ?? null,
    workflowRound: 2,
    backVariationSetId: null,
    selectedBackPromptId: null,
    selectedBackKey: null,
    finalAssetSlots: { ...updated.finalAssetSlots, "final-front": winner.assetId },
    assets: updated.assets.map((a) =>
      a.id === winner.assetId ? { ...a, type: "pass-front", status: "approved" } : a,
    ),
    updatedAt: new Date().toISOString(),
  });
}

/** Generate 4 matching back concepts from the locked front reference. */
export async function generateBackConceptsForProject(
  projectId: string,
): Promise<CreativeLabProjectFile | null> {
  const project = await loadProject(projectId);
  if (!project) return null;
  if (!project.frontLocked || !project.lockedFrontAssetId) {
    throw new Error("Lock a front pass before generating backs");
  }

  const frontAsset = project.assets.find((a) => a.id === project.lockedFrontAssetId);
  if (!frontAsset?.filePath?.endsWith(".png")) {
    throw new Error("Locked front asset is missing its PNG file");
  }

  const frontPrompt = project.generatedPrompts.find((p) => p.id === project.lockedFrontPromptId);
  const visualWorldId =
    normalizeVisualWorldId(project.selectedArtDirectionId) ?? "music-television-credential";
  const world = visualWorldById(visualWorldId);
  const frontKey = frontPrompt?.variationKey ?? "A";
  const frontComp = compositionForKey(frontKey, visualWorldId);

  const folderId = projectFolderId(project);
  const frontAbs = join(creativeLabProjectDir(folderId), frontAsset.filePath);
  const frontBuffer = await readFile(frontAbs);

  const now = new Date().toISOString();
  const variationSetId = `back-${Date.now().toString(36)}`;
  const prompts: GeneratedPrompt[] = [];
  const newAssets: CreativeLabAsset[] = [];

  for (const key of CONCEPT_KEYS) {
    const backPromptText = renderPassBackPrompt({
      worldId: visualWorldId,
      event: project.event,
      venue: project.venue,
      date: project.date,
      featuredYears: project.featuredYears,
      theme: project.theme,
      conceptKey: key,
      frontConceptSummary: frontPrompt?.conceptSummary ?? `${frontComp.label} — ${world.title}`,
      frontCompositionLabel: frontComp.label,
    });

    const promptId = `prompt-back-${Date.now().toString(36)}-${key.toLowerCase()}-${Math.random().toString(36).slice(2, 5)}`;
    const result = await generateArtwork(
      artworkContextFromPrompt(project, backPromptText, visualWorldId, `Back ${key}`),
      { count: 1, quality: "medium", size: "1024x1536", referenceImage: frontBuffer },
    );
    const image = result.images[0];
    if (!image) continue;

    const assetId = `asset-back-${Date.now().toString(36)}-${key.toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`;
    const rel = await writeArtworkAssetFile(folderId, assetId, image.buffer);
    console.log("[cl-artwork:register] back concept asset", {
      projectId: project.id,
      conceptKey: key,
      assetId,
      promptId,
      parentFront: project.lockedFrontAssetId,
      filePath: rel,
      bytes: image.buffer.length,
    });

    newAssets.push({
      id: assetId,
      projectId: project.id,
      type: "pass-back",
      concept: key,
      status: "generated",
      createdAt: now,
      filePath: rel,
      promptId,
      module: "pass-lab",
      notes: `Back ${key} · matches ${frontComp.label} · ${resolveArtworkProvider()}`,
    });

    prompts.push({
      id: promptId,
      module: "pass-lab",
      conceptSummary: `Back ${key} — ${backCompositionForKey(key).label} · matches ${frontComp.label}`,
      renderedPrompt: backPromptText,
      variationKey: key,
      variationSetId,
      passSide: "back",
      parentFrontAssetId: project.lockedFrontAssetId,
      assetId,
      structuredConcept: {
        event: project.event,
        venue: project.venue,
        date: project.date,
        featuredYears: project.featuredYears,
        theme: project.theme,
        dominantStyles: { credential: [], illustration: [], color: [], density: [] },
        module: "pass-lab",
        variationKey: key,
      },
      createdAt: now,
    });
  }

  if (!prompts.length) {
    throw new Error("No back concepts were generated");
  }

  return saveProject({
    ...project,
    generatedPrompts: [...prompts, ...project.generatedPrompts].slice(0, 64),
    assets: [...newAssets, ...project.assets].slice(0, 128),
    backVariationSetId: variationSetId,
    selectedBackPromptId: null,
    selectedBackKey: null,
    workflowRound: 3,
    updatedAt: now,
  });
}

export async function setSelectedBack(
  projectId: string,
  promptId: string,
): Promise<CreativeLabProjectFile | null> {
  const project = await loadProject(projectId);
  if (!project) return null;
  const winner = project.generatedPrompts.find(
    (p) => p.id === promptId && p.passSide === "back",
  );
  if (!winner) return null;
  return updateProject(projectId, {
    selectedBackPromptId: promptId,
    selectedBackKey: winner.variationKey ?? null,
    workflowRound: 3,
  });
}

/** Export locked front + selected back as final deliverables and project package. */
export async function exportPassPair(projectId: string): Promise<{
  project: CreativeLabProjectFile;
  zipPath: string;
  zipRel: string;
  files: string[];
} | null> {
  const project = await loadProject(projectId);
  if (!project) return null;
  if (!project.frontLocked || !project.lockedFrontAssetId) {
    throw new Error("Front must be locked before export");
  }
  if (!project.selectedBackPromptId) {
    throw new Error("Select a back pass before export");
  }
  const backPrompt = project.generatedPrompts.find((p) => p.id === project.selectedBackPromptId);
  const backAssetId = backPrompt?.assetId;
  if (!backAssetId) throw new Error("Selected back has no asset");

  let updated = await approveAsset(projectId, backAssetId);
  if (!updated) return null;
  updated = (await markAssetFinal(projectId, project.lockedFrontAssetId, "final-front")) ?? updated;
  updated = (await markAssetFinal(projectId, backAssetId, "final-back")) ?? updated;

  const pkg = await exportProjectPackage(updated);
  const finals = await exportFinalDeliverables(updated);
  return { project: updated, ...pkg, files: finals.files };
}

/** @deprecated SVG placeholder concepts — use generatePassConceptsForProject */
export async function generateConceptVariationsForModule(
  projectId: string,
  module: CreativeLabModuleId = "pass-lab",
): Promise<CreativeLabProjectFile | null> {
  const project = await loadProject(projectId);
  if (!project) return null;

  const preset = project.activePresetId ? await loadPreset(project.activePresetId) : null;
  const prompts = buildConceptVariations(project, module, preset);
  let assets = createPlaceholderAssets({
    projectId: project.id,
    module,
    prompts: prompts.map((p) => ({
      id: p.id,
      variationKey: p.variationKey,
      strategyId: p.strategyId,
      conceptSummary: p.conceptSummary,
      createdAt: p.createdAt,
    })),
  });
  assets = await attachPlaceholderFiles(project, assets);

  return saveProject({
    ...project,
    generatedPrompts: [...prompts, ...project.generatedPrompts].slice(0, 48),
    assets: [...assets, ...project.assets].slice(0, 96),
    activeModule: module,
    workflowRound: 1,
    refinementGenerated: false,
    refinementVariations: [],
    selectedVariationIndex: null,
    selectedConceptKey: null,
    mockVariationRound: 0,
    selectedConceptPromptId: null,
  });
}

export async function setSelectedConcept(
  projectId: string,
  promptId: string,
): Promise<CreativeLabProjectFile | null> {
  const project = await loadProject(projectId);
  if (!project) return null;
  const winner = project.generatedPrompts.find((p) => p.id === promptId);
  if (!winner) return null;
  return updateProject(projectId, {
    selectedConceptPromptId: promptId,
    selectedConceptKey: winner.variationKey ?? null,
    workflowRound: 1,
    refinementGenerated: false,
    refinementVariations: [],
    selectedVariationIndex: null,
  });
}

/** Generate 8 real refinement images — same world and composition, varied treatments. */
export async function generateRefinementImages(
  projectId: string,
): Promise<CreativeLabProjectFile | null> {
  const project = await loadProject(projectId);
  if (!project?.selectedConceptPromptId || !project.selectedArtDirectionId) return null;
  const parent = project.generatedPrompts.find((p) => p.id === project.selectedConceptPromptId);
  if (!parent?.variationKey) return null;

  const worldId = project.selectedArtDirectionId as VisualWorldId;
  const treatments = refinementsForArtDirection(worldId);
  const folderId = projectFolderId(project);
  const now = new Date().toISOString();
  const variations: RefinementVariation[] = [];
  const newAssets: CreativeLabAsset[] = [];
  const type = moduleDefaultAssetType(project.activeModule);

  for (let i = 0; i < treatments.length; i++) {
    const treatment = treatments[i];
    const promptText = renderPassConceptPrompt({
      worldId,
      event: project.event,
      venue: project.venue,
      date: project.date,
      featuredYears: project.featuredYears,
      conceptKey: parent.variationKey,
      refinement: treatment,
      refinementIndex: i + 1,
      parentConceptSummary: parent.conceptSummary,
    });

    const result = await generateArtwork(
      artworkContextFromPrompt(project, promptText, worldId, treatment.label),
      { count: 1, quality: "medium", size: "1024x1536" },
    );
    const image = result.images[0];
    if (!image) continue;

    const assetId = `asset-refine-${Date.now().toString(36)}-${i + 1}-${Math.random().toString(36).slice(2, 5)}`;
    const rel = await writeArtworkAssetFile(folderId, assetId, image.buffer);
    const varId = `refine-${Date.now().toString(36)}-${i + 1}`;

    variations.push({
      id: varId,
      index: i + 1,
      treatmentId: treatment.id,
      treatmentLabel: treatment.label,
      parentPromptId: parent.id,
      artDirectionId: worldId,
      assetId,
      createdAt: now,
    });

    newAssets.push({
      id: assetId,
      projectId: project.id,
      type,
      concept: parent.variationKey,
      status: "generated",
      createdAt: now,
      filePath: rel,
      promptId: parent.id,
      module: project.activeModule,
      notes: `Refinement ${i + 1}/8 · ${treatment.label} · ${resolveArtworkProvider()}`,
    });
  }

  if (!variations.length) {
    throw new Error("No refinement images were generated");
  }

  return saveProject({
    ...project,
    workflowRound: 2,
    refinementGenerated: true,
    refinementVariations: variations,
    selectedVariationIndex: null,
    assets: [...newAssets, ...project.assets].slice(0, 96),
    updatedAt: now,
  });
}

/** Alias — generates 8 real refinement images. */
export async function generateRefinementVariations(
  projectId: string,
): Promise<CreativeLabProjectFile | null> {
  return generateRefinementImages(projectId);
}

export async function setSelectedVariation(
  projectId: string,
  variationIndex: number,
): Promise<CreativeLabProjectFile | null> {
  const project = await loadProject(projectId);
  if (!project?.refinementGenerated) return null;
  const exists = project.refinementVariations?.some((v) => v.index === variationIndex);
  if (!exists) return null;
  return updateProject(projectId, {
    selectedVariationIndex: variationIndex,
    workflowRound: 3,
  });
}

/** @deprecated Artwork is generated with refinements in Phase 9 workflow */
export async function generateArtworkForProject(projectId: string): Promise<CreativeLabProjectFile | null> {
  return loadProject(projectId);
}

/** @deprecated Use generateRefinementVariations */
export async function advanceMockVariations(projectId: string): Promise<CreativeLabProjectFile | null> {
  return generateRefinementVariations(projectId);
}

export async function setAssetStatus(
  projectId: string,
  assetId: string,
  status: CreativeLabAssetStatus,
): Promise<CreativeLabProjectFile | null> {
  const project = await loadProject(projectId);
  if (!project) return null;
  let updated = updateAssetStatus(project, assetId, status);
  const asset = updated.assets.find((a) => a.id === assetId);
  if (asset && (status === "approved" || status === "final")) {
    const rel = await mirrorAssetToSelected(projectFolderId(updated), asset);
    updated = {
      ...updated,
      assets: updated.assets.map((a) => (a.id === assetId ? { ...a, filePath: a.filePath ?? rel } : a)),
    };
  }
  return saveProject(updated);
}

export async function approveAsset(projectId: string, assetId: string): Promise<CreativeLabProjectFile | null> {
  return setAssetStatus(projectId, assetId, "approved");
}

export async function rejectAsset(projectId: string, assetId: string): Promise<CreativeLabProjectFile | null> {
  return setAssetStatus(projectId, assetId, "rejected");
}

export async function markAssetFinal(
  projectId: string,
  assetId: string,
  slot?: FinalAssetSlot,
): Promise<CreativeLabProjectFile | null> {
  const project = await loadProject(projectId);
  if (!project) return null;
  let updated = setAssetAsFinal(project, assetId, slot);
  const asset = updated.assets.find((a) => a.id === assetId);
  if (asset) {
    const rel = await mirrorAssetToSelected(projectFolderId(updated), { ...asset, status: "final" });
    updated = {
      ...updated,
      assets: updated.assets.map((a) => (a.id === assetId ? { ...a, filePath: a.filePath ?? rel } : a)),
    };
  }
  return saveProject(updated);
}

export async function runExportProjectPackage(projectId: string): Promise<{
  project: CreativeLabProjectFile;
  zipPath: string;
  zipRel: string;
} | null> {
  const project = await loadProject(projectId);
  if (!project) return null;
  const result = await exportProjectPackage(project);
  return { project, ...result };
}

export async function runExportFinals(projectId: string): Promise<{
  project: CreativeLabProjectFile;
  files: string[];
  exportDir: string;
} | null> {
  const project = await loadProject(projectId);
  if (!project) return null;
  const result = await exportFinalDeliverables(project);
  return { project, ...result };
}

export { baseProjectSlug };

/** @deprecated Use generateConceptVariationsForModule */
export async function generateConceptForModule(
  projectId: string,
  module: CreativeLabModuleId = "pass-lab",
): Promise<CreativeLabProjectFile | null> {
  return generateConceptVariationsForModule(projectId, module);
}
