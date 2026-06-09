import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import { join } from "path";

import { buildPromptConcept } from "./prompt-builder";
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

  return {
    version: 1,
    id,
    name: typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : "Untitled Project",
    event: typeof obj.event === "string" ? obj.event : "",
    venue: typeof obj.venue === "string" ? obj.venue : "",
    date: typeof obj.date === "string" ? obj.date : "",
    featuredYears,
    theme: typeof obj.theme === "string" ? obj.theme : "",
    styleSelection: normalizeStyleSelection(obj.styleSelection),
    generatedPrompts: Array.isArray(obj.generatedPrompts) ? (obj.generatedPrompts as GeneratedPrompt[]) : [],
    generatedAssets: Array.isArray(obj.generatedAssets) ? (obj.generatedAssets as GeneratedAsset[]) : [],
    selectedAssetIds: Array.isArray(obj.selectedAssetIds)
      ? obj.selectedAssetIds.filter((x): x is string => typeof x === "string")
      : [],
    activeModule,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : now,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : now,
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

/** Generate structured prompt concept + placeholder asset (no image gen). */
export async function generateConceptForModule(
  projectId: string,
  module: CreativeLabModuleId = "pass-lab",
): Promise<CreativeLabProjectFile | null> {
  const project = await loadProject(projectId);
  if (!project) return null;

  const prompt = buildPromptConcept(project, module);
  const asset: GeneratedAsset = {
    id: newAssetId(),
    module,
    promptId: prompt.id,
    status: "placeholder",
    selected: false,
    createdAt: new Date().toISOString(),
  };

  return saveProject({
    ...project,
    generatedPrompts: [prompt, ...project.generatedPrompts].slice(0, 24),
    generatedAssets: [asset, ...project.generatedAssets].slice(0, 24),
    activeModule: module,
  });
}
