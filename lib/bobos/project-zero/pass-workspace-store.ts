import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import {
  emptyCreativeBriefSeed,
  normalizeCreativeBrief,
  type PassCreativeBrief,
} from "./creative-brief";
import {
  DEFAULT_PASS_ARTWORK_ADJUSTMENTS,
  normalizePassArtworkAdjustments,
  type PassArtworkAdjustments,
} from "./pass-artwork-adjustments";
import {
  defaultProductionLayoutFromPassLayout,
  normalizeProductionLayout,
  type ProductionLayout,
} from "./production-layout";
import { normalizePrintSheetGridId, type PrintSheetGridId } from "./print-sheet-grid";
import { PASS_WORKSPACE_SLUGS, type PassWorkspaceSlug } from "./pass-workspace-slugs";

/**
 * A BobOS Project owns its own pass artwork. This store is intentionally separate from
 * Pass Studio's global `templates.json` / Content Creator library fuzzy-matching — nothing
 * here is ever selected by matching event names against other projects' artwork. Every
 * project starts with empty history; artwork only appears here after Generate/Regenerate
 * is explicitly run for THIS project.
 */

export { PASS_WORKSPACE_SLUGS, type PassWorkspaceSlug } from "./pass-workspace-slugs";

export type PassWorkspaceVersion = {
  version: number;
  generationId: string;
  frontArtworkUrl: string | null;
  backArtworkUrl: string | null;
  createdAt: string;
};

type PassWorkspaceSlots = Record<PassWorkspaceSlug, PassWorkspaceVersion[]>;
export type PassWorkspaceAdjustmentsBySlug = Record<PassWorkspaceSlug, PassArtworkAdjustments>;

export type ProductionLayoutsByPassType = Record<PassWorkspaceSlug, ProductionLayout>;

type StoredLayoutsByPassType = Record<PassWorkspaceSlug, ProductionLayout | null>;

type PassWorkspaceFile = {
  version: 1;
  projectId: string;
  slots: PassWorkspaceSlots;
  /** Print Boost — non-destructive, applied at finish time; never touches the raw
   *  generation. Keyed by pass type, independent of artwork version. */
  adjustments: PassWorkspaceAdjustmentsBySlug;
  /** Restored Content Creator brief — null until the user first edits or generates;
   *  while null, the workspace pre-fills live from the project's Shared Context. */
  creative: PassCreativeBrief | null;
  /** BobOS-owned QR + serial production geometry — one independent layout per pass type.
   *  null uses canonical pass-layout defaults; saving one pass never touches the others. */
  layoutsByPassType: StoredLayoutsByPassType;
  /** Last selected print sheet grid layout. */
  printSheetGrid: PrintSheetGridId;
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

function emptyLayouts(): StoredLayoutsByPassType {
  return { general: null, vip: null, backstage: null };
}

function normalizeFile(projectId: string, raw: unknown): PassWorkspaceFile {
  const parsed = (raw ?? {}) as Partial<PassWorkspaceFile> & {
    /** Legacy single-layout field — migrated into every pass type on first load. */
    productionLayout?: unknown;
  };
  const slots = emptySlots();
  for (const slug of PASS_WORKSPACE_SLUGS) {
    const versions = parsed.slots?.[slug];
    if (Array.isArray(versions)) slots[slug] = versions;
  }
  const adjustments = defaultAdjustments();
  for (const slug of PASS_WORKSPACE_SLUGS) {
    adjustments[slug] = normalizePassArtworkAdjustments(parsed.adjustments?.[slug]);
  }
  const creative = parsed.creative
    ? normalizeCreativeBrief(parsed.creative, emptyCreativeBriefSeed())
    : null;

  const legacyLayout = parsed.productionLayout
    ? normalizeProductionLayout(parsed.productionLayout)
    : null;
  const layoutsByPassType = emptyLayouts();
  for (const slug of PASS_WORKSPACE_SLUGS) {
    const stored = parsed.layoutsByPassType?.[slug];
    layoutsByPassType[slug] = stored ? normalizeProductionLayout(stored) : legacyLayout;
  }

  const printSheetGrid = normalizePrintSheetGridId(parsed.printSheetGrid);
  return { version: 1, projectId, slots, adjustments, creative, layoutsByPassType, printSheetGrid };
}

async function loadFile(projectId: string): Promise<PassWorkspaceFile> {
  try {
    const raw = await readFile(passWorkspacePath(projectId), "utf8");
    return normalizeFile(projectId, JSON.parse(raw));
  } catch {
    return {
      version: 1,
      projectId,
      slots: emptySlots(),
      adjustments: defaultAdjustments(),
      creative: null,
      layoutsByPassType: emptyLayouts(),
      printSheetGrid: "auto",
    };
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

/** The persisted Content Creator brief for this project — null if never edited. */
export async function loadPassWorkspaceCreativeBrief(
  projectId: string,
): Promise<PassCreativeBrief | null> {
  const file = await loadFile(projectId);
  return file.creative;
}

/** Persists the edited Content Creator brief — never touches artwork history or Print Boost. */
export async function savePassWorkspaceCreativeBrief(
  projectId: string,
  brief: PassCreativeBrief,
): Promise<PassCreativeBrief> {
  const file = await loadFile(projectId);
  const normalized = normalizeCreativeBrief(brief, emptyCreativeBriefSeed());
  file.creative = normalized;
  await saveFile(file);
  return normalized;
}

/** Production overlay geometry — one independent QR + serial layout per pass type. */
export async function loadPassWorkspaceProductionLayouts(
  projectId: string,
): Promise<ProductionLayoutsByPassType> {
  const file = await loadFile(projectId);
  const layouts = {} as ProductionLayoutsByPassType;
  for (const slug of PASS_WORKSPACE_SLUGS) {
    layouts[slug] = file.layoutsByPassType[slug] ?? defaultProductionLayoutFromPassLayout();
  }
  return layouts;
}

/** Saves ONLY the given pass type's layout — the other passes' layouts are untouched. */
export async function savePassWorkspaceProductionLayout(
  projectId: string,
  slug: PassWorkspaceSlug,
  layout: ProductionLayout,
): Promise<ProductionLayout> {
  const file = await loadFile(projectId);
  const normalized = normalizeProductionLayout(layout);
  file.layoutsByPassType[slug] = normalized;
  await saveFile(file);
  return normalized;
}

export async function loadPassWorkspacePrintSheetGrid(projectId: string): Promise<PrintSheetGridId> {
  const file = await loadFile(projectId);
  return file.printSheetGrid;
}

export async function savePassWorkspacePrintSheetGrid(
  projectId: string,
  gridId: PrintSheetGridId,
): Promise<PrintSheetGridId> {
  const file = await loadFile(projectId);
  const normalized = normalizePrintSheetGridId(gridId);
  file.printSheetGrid = normalized;
  await saveFile(file);
  return normalized;
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
