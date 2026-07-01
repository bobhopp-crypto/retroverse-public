import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

/**
 * A BobOS Project owns its own pass artwork. This store is intentionally separate from
 * Pass Studio's global `templates.json` / Content Creator library fuzzy-matching — nothing
 * here is ever selected by matching event names against other projects' artwork. Every
 * project starts with empty history; artwork only appears here after Generate/Regenerate
 * is explicitly run for THIS project.
 */

export type PassWorkspaceSlug = "general" | "vip" | "backstage";

export const PASS_WORKSPACE_SLUGS: PassWorkspaceSlug[] = ["general", "vip", "backstage"];

export type PassWorkspaceVersion = {
  version: number;
  generationId: string;
  frontArtworkUrl: string | null;
  backArtworkUrl: string | null;
  createdAt: string;
};

type PassWorkspaceSlots = Record<PassWorkspaceSlug, PassWorkspaceVersion[]>;

type PassWorkspaceFile = {
  version: 1;
  projectId: string;
  slots: PassWorkspaceSlots;
};

function passWorkspaceDir(): string {
  return join(opsStateDir(), "bobos", "project-zero", "pass-workspace");
}

function passWorkspacePath(projectId: string): string {
  return join(passWorkspaceDir(), `${projectId}.json`);
}

function emptySlots(): PassWorkspaceSlots {
  return { general: [], vip: [], backstage: [] };
}

function normalizeFile(projectId: string, raw: unknown): PassWorkspaceFile {
  const parsed = (raw ?? {}) as Partial<PassWorkspaceFile>;
  const slots = emptySlots();
  for (const slug of PASS_WORKSPACE_SLUGS) {
    const versions = parsed.slots?.[slug];
    if (Array.isArray(versions)) slots[slug] = versions;
  }
  return { version: 1, projectId, slots };
}

async function loadFile(projectId: string): Promise<PassWorkspaceFile> {
  try {
    const raw = await readFile(passWorkspacePath(projectId), "utf8");
    return normalizeFile(projectId, JSON.parse(raw));
  } catch {
    return { version: 1, projectId, slots: emptySlots() };
  }
}

async function saveFile(file: PassWorkspaceFile): Promise<void> {
  await mkdir(passWorkspaceDir(), { recursive: true });
  await writeFile(passWorkspacePath(file.projectId), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

/** Every generation ever created for this project, per pass type — oldest first. Empty for a brand-new project. */
export async function loadPassWorkspaceHistory(projectId: string): Promise<PassWorkspaceSlots> {
  const file = await loadFile(projectId);
  return file.slots;
}

/** Appends a new version — Version 1, 2, 3… — and never overwrites a prior version. */
export async function appendPassWorkspaceVersion(
  projectId: string,
  slug: PassWorkspaceSlug,
  entry: { generationId: string; frontArtworkUrl: string | null; backArtworkUrl: string | null },
): Promise<PassWorkspaceVersion> {
  const file = await loadFile(projectId);
  const existing = file.slots[slug];
  const version: PassWorkspaceVersion = {
    version: existing.length + 1,
    generationId: entry.generationId,
    frontArtworkUrl: entry.frontArtworkUrl,
    backArtworkUrl: entry.backArtworkUrl,
    createdAt: new Date().toISOString(),
  };
  file.slots[slug] = [...existing, version];
  await saveFile(file);
  return version;
}
