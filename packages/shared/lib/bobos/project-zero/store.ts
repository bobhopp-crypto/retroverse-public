import "server-only";

import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { parseProjectIntent } from "./parse-intent";
import type { Project, ProjectFile, ProjectWorkspace, WorkspaceStatus } from "./types";
import { WORKSPACE_CATALOG } from "./workspace-catalog";

function projectZeroDir(): string {
  return join(opsStateDir(), "bobos", "project-zero");
}

function projectsPath(): string {
  return join(projectZeroDir(), "projects.json");
}

function defaultFile(): ProjectFile {
  return { version: 1, projects: [] };
}

function normalizeFile(raw: unknown): ProjectFile {
  if (!raw || typeof raw !== "object") return defaultFile();
  const obj = raw as Partial<ProjectFile>;
  if (!Array.isArray(obj.projects)) return defaultFile();
  return { version: 1, projects: obj.projects as Project[] };
}

async function loadFile(): Promise<ProjectFile> {
  try {
    const raw = await readFile(projectsPath(), "utf8");
    return normalizeFile(JSON.parse(raw));
  } catch {
    return defaultFile();
  }
}

async function saveFile(file: ProjectFile): Promise<void> {
  await mkdir(projectZeroDir(), { recursive: true });
  await writeFile(projectsPath(), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

export async function listProjects(): Promise<Project[]> {
  const file = await loadFile();
  return [...file.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(id: string): Promise<Project | null> {
  const file = await loadFile();
  return file.projects.find((project) => project.id === id) ?? null;
}

export async function createProject(prompt: string): Promise<Project> {
  const parsed = parseProjectIntent(prompt);
  const now = new Date().toISOString();

  const workspaces: ProjectWorkspace[] = parsed.workspaceIds.map((id) => ({
    id,
    title: WORKSPACE_CATALOG[id].title,
    status: "NOT_STARTED",
    notes: "",
  }));

  const project: Project = {
    id: randomUUID(),
    title: parsed.sharedContext.title,
    objective: prompt.trim(),
    domain: parsed.domain,
    createdAt: now,
    updatedAt: now,
    sharedContext: parsed.sharedContext,
    workspaces,
  };

  const file = await loadFile();
  file.projects.push(project);
  await saveFile(file);

  return project;
}

export async function updateWorkspace(
  projectId: string,
  workspaceId: string,
  patch: { status?: WorkspaceStatus; notes?: string },
): Promise<Project | null> {
  const file = await loadFile();
  const project = file.projects.find((p) => p.id === projectId);
  if (!project) return null;

  const workspace = project.workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return null;

  if (patch.status) workspace.status = patch.status;
  if (patch.notes !== undefined) workspace.notes = patch.notes;
  project.updatedAt = new Date().toISOString();

  await saveFile(file);
  return project;
}
