import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import {
  DEFAULT_PASS_ARTWORK_ADJUSTMENTS,
  normalizePassArtworkAdjustments,
  type PassArtworkAdjustments,
} from "./pass-artwork-adjustments";

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
export type PassWorkspaceAdjustmentsBySlug = Record<PassWorkspaceSlug, PassArtworkAdjustments>;

type PassWorkspaceFile = {
  version: 1;
  projectId: string;
  slots: PassWorkspaceSlots;
  /** Print Boost — non-destructive, applied at finish time; never touches the raw
   *  generation. Keyed by pass type, independent of artwork version. */
  adjustments: PassWorkspaceAdjustmentsBySlug;
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

function defaultAdjustments(): PassWorkspaceAdjustmentsBySlug {
  return {
    general: { ...DEFAULT_PASS_ARTWORK_ADJUSTMENTS },
    vip: { ...DEFAULT_PASS_ARTWORK_ADJUSTMENTS },
    backstage: { ...DEFAULT_PASS_ARTWORK_ADJUSTMENTS },
  };
}

function normalizeFile(projectId: string, raw: unknown): PassWorkspaceFile {
  const parsed = (raw ?? {}) as Partial<PassWorkspaceFile>;
  const slots = emptySlots();
  for (const slug of PASS_WORKSPACE_SLUGS) {
    const versions = parsed.slots?.[slug];
    if (Array.isArray(versions)) slots[slug] = versions;
  }
  const adjustments = defaultAdjustments();
  for (const slug of PASS_WORKSPACE_SLUGS) {
    adjustments[slug] = normalizePassArtworkAdjustments(parsed.adjustments?.[slug]);
  }
  return { version: 1, projectId, slots, adjustments };
}

async function loadFile(projectId: string): Promise<PassWorkspaceFile> {
  try {
    const raw = await readFile(passWorkspacePath(projectId), "utf8");
    return normalizeFile(projectId, JSON.parse(raw));
  } catch {
    return { version: 1, projectId, slots: emptySlots(), adjustments: defaultAdjustments() };
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

/** Print Boost settings for every pass type in this project — defaults if never set. */
export async function loadPassWorkspaceAdjustments(
  projectId: string,
): Promise<PassWorkspaceAdjustmentsBySlug> {
  const file = await loadFile(projectId);
  return file.adjustments;
}

/** Non-destructive — only ever updates the adjustment settings, never the raw generation. */
export async function savePassWorkspaceAdjustment(
  projectId: string,
  slug: PassWorkspaceSlug,
  adjustments: Partial<PassArtworkAdjustments>,
): Promise<PassArtworkAdjustments> {
  const file = await loadFile(projectId);
  const normalized = normalizePassArtworkAdjustments(adjustments);
  file.adjustments[slug] = normalized;
  await saveFile(file);
  return normalized;
}
