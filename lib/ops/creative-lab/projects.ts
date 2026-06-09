import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import { join } from "path";

import { buildConceptVariations } from "./concept-variations";
import { renderPromptText } from "./prompt-renderer";
import {
  creativeLabProjectIndexPath,
  creativeLabProjectPath,
  creativeLabProjectsDir,
} from "./paths";
import { emptyStyleSelection, normalizeStyleSelection } from "./style-catalog";
import type {
  CreativeLabIndexFile,
  CreativeLabModuleId,
  CreativeLabProjectFile,
  GeneratedAsset,
  GeneratedPrompt,
  StyleSelection,
} from "./types";

function newProjectId(): string {
  return `cl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function newAssetId(): string {
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeGeneratedPrompts(
  raw: unknown,
  project: Pick<CreativeLabProjectFile, "event" | "venue" | "date" | "featuredYears" | "theme" | "styleSelection" | "activeModule">,
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
          });
    out.push({
      id: row.id,
      module,
      conceptSummary: row.conceptSummary,
      renderedPrompt,
      variationKey,
      variationSetId: typeof row.variationSetId === "string" ? row.variationSetId : undefined,
      structuredConcept: row.structuredConcept ?? {
        event: project.event,
        venue: project.venue,
        date: project.date,
        featuredYears: project.featuredYears,
        theme: project.theme,
        dominantStyles: { credential: [], illustration: [], color: [], density: [] },
        module,
        variationKey,
      },
      createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    });
  }
  return out;
}

function normalizeProject(raw: unknown, fallbackId: string): CreativeLabProjectFile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<CreativeLabProjectFile>;
  const now = new Date().toISOString();
  const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : fallbackId;

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
    version: 1,
    id,
    name: typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : "Untitled Project",
    event: typeof obj.event === "string" ? obj.event : "",
    venue: typeof obj.venue === "string" ? obj.venue : "",
    date: typeof obj.date === "string" ? obj.date : "",
    featuredYears,
    theme: typeof obj.theme === "string" ? obj.theme : "",
    styleSelection: normalizeStyleSelection(obj.styleSelection),
    generatedPrompts: [],
    generatedAssets: Array.isArray(obj.generatedAssets) ? (obj.generatedAssets as GeneratedAsset[]) : [],
    selectedAssetIds: Array.isArray(obj.selectedAssetIds)
      ? obj.selectedAssetIds.filter((x): x is string => typeof x === "string")
      : [],
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
            const row = p as { id?: unknown; name?: unknown; event?: unknown; updatedAt?: unknown };
            const id = typeof row.id === "string" ? row.id.trim() : "";
            if (!id) return null;
            return {
              id,
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
  try {
    const raw = JSON.parse(await readFile(creativeLabProjectPath(projectId), "utf8")) as unknown;
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
}): Promise<CreativeLabProjectFile> {
  const id = newProjectId();
  const now = new Date().toISOString();
  const project: CreativeLabProjectFile = {
    version: 1,
    id,
    name: input.name.trim() || "Untitled Project",
    event: input.event?.trim() ?? "",
    venue: input.venue?.trim() ?? "",
    date: input.date?.trim() ?? "",
    featuredYears: input.featuredYears ?? [],
    theme: input.theme?.trim() ?? "",
    styleSelection: input.styleSelection ? normalizeStyleSelection(input.styleSelection) : emptyStyleSelection(),
    generatedPrompts: [],
    generatedAssets: [],
    selectedAssetIds: [],
    activeModule: "pass-lab",
    createdAt: now,
    updatedAt: now,
  };
  await saveProject(project);
  return project;
}

export async function saveProject(project: CreativeLabProjectFile): Promise<CreativeLabProjectFile> {
  const dir = join(creativeLabProjectsDir(), project.id);
  await mkdir(dir, { recursive: true });
  const updated = { ...project, updatedAt: new Date().toISOString() };
  await writeFile(creativeLabProjectPath(project.id), `${JSON.stringify(updated, null, 2)}\n`, "utf8");
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
      | "selectedAssetIds"
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
    updatedAt: new Date().toISOString(),
  };
  return saveProject(updated);
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const dir = join(creativeLabProjectsDir(), projectId);
  if (!existsSync(dir)) return false;
  await rm(dir, { recursive: true, force: true });
  const index = await loadIndex();
  index.projects = index.projects.filter((p) => p.id !== projectId);
  await saveIndex(index);
  return true;
}

/** Generate Concept A–D prompt variations + placeholder assets (no image gen). */
export async function generateConceptVariationsForModule(
  projectId: string,
  module: CreativeLabModuleId = "pass-lab",
): Promise<CreativeLabProjectFile | null> {
  const project = await loadProject(projectId);
  if (!project) return null;

  const prompts = buildConceptVariations(project, module);
  const assets: GeneratedAsset[] = prompts.map((prompt) => ({
    id: newAssetId(),
    module,
    promptId: prompt.id,
    status: "placeholder",
    selected: false,
    createdAt: prompt.createdAt,
  }));

  return saveProject({
    ...project,
    generatedPrompts: [...prompts, ...project.generatedPrompts].slice(0, 48),
    generatedAssets: [...assets, ...project.generatedAssets].slice(0, 48),
    activeModule: module,
  });
}

/** @deprecated Use generateConceptVariationsForModule */
export async function generateConceptForModule(
  projectId: string,
  module: CreativeLabModuleId = "pass-lab",
): Promise<CreativeLabProjectFile | null> {
  return generateConceptVariationsForModule(projectId, module);
}
