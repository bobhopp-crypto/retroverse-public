import "server-only";

import { listPassLibrary } from "@/app/bobos/passes/actions";
import { loadGenerationManifest } from "@/lib/ops/content-creator/library";
import { eventIdFromName } from "@/lib/bobos/pass-studio/default-templates";
import { nextSerialStart } from "@/lib/bobos/pass-studio/store";
import type { GeneratedPass, PassTemplate } from "@/lib/bobos/pass-studio/types";

import { seedCreativeBriefFromContext, type PassCreativeBrief } from "./creative-brief";
import type { PassArtworkAdjustments } from "./pass-artwork-adjustments";
import {
  loadPassWorkspaceAdjustments,
  loadPassWorkspaceCreativeBrief,
  loadPassWorkspaceHistory,
  loadPassWorkspacePrintSheetGrid,
  loadPassWorkspaceProductionLayouts,
  type PassWorkspaceSlug,
  type PassWorkspaceVersion,
  type ProductionLayoutsByPassType,
} from "./pass-workspace-store";
import type { PrintSheetGridId } from "./print-sheet-grid";
import type { ProjectSharedContext } from "./types";

type SlotSpec = { slug: PassWorkspaceSlug; label: string; primary: string; accent: string };

/** Fixed defaults for a brand-new project — no artwork, no history, nothing borrowed from any other project. */
const SLOTS: SlotSpec[] = [
  { slug: "general", label: "General", primary: "#1a0f2e", accent: "#2eb8b8" },
  { slug: "vip", label: "VIP", primary: "#2b1810", accent: "#ff7a45" },
  { slug: "backstage", label: "Backstage", primary: "#10161c", accent: "#c494ff" },
];

function virtualTemplateId(projectId: string, slug: PassWorkspaceSlug): string {
  return `bobos-${projectId}-${slug}`;
}

/** A Pass Studio template shape, but owned entirely by this project — never the shared,
 *  cross-event `templates.json`. `version`/`history` reflect only this project's own generations. */
export type PassWorkspaceTemplate = PassTemplate & {
  slug: PassWorkspaceSlug;
  version: number;
  history: PassWorkspaceVersion[];
  /** Print Boost — non-destructive; never mutates the raw generation this points at. */
  adjustments: PassArtworkAdjustments;
  /** Whether the current version's generation is approved in the Content Creator library. */
  approved: boolean;
};

export type PassWorkspaceData = {
  templates: PassWorkspaceTemplate[];
  library: GeneratedPass[];
  /** The restored Content Creator brief — saved edits if any, otherwise pre-filled
   *  from the project's Shared Context. */
  creative: PassCreativeBrief;
  /** BobOS production overlay geometry — one independent layout per pass type. */
  productionLayouts: ProductionLayoutsByPassType;
  /** Last selected print sheet grid. */
  printSheetGrid: PrintSheetGridId;
  /** Next available serial across the whole pass library — for the Issue Passes estimate. */
  nextSerial: number;
};

async function isGenerationApproved(generationId: string | null): Promise<boolean> {
  if (!generationId) return false;
  try {
    const manifest = await loadGenerationManifest(generationId);
    return manifest?.status === "approved" || manifest?.status === "production_ready";
  } catch {
    return false;
  }
}

export async function loadPassWorkspaceData(
  projectId: string,
  context: ProjectSharedContext,
): Promise<PassWorkspaceData> {
  const history = await loadPassWorkspaceHistory(projectId);
  const adjustmentsBySlug = await loadPassWorkspaceAdjustments(projectId);
  const savedBrief = await loadPassWorkspaceCreativeBrief(projectId);
  const productionLayouts = await loadPassWorkspaceProductionLayouts(projectId);
  const printSheetGrid = await loadPassWorkspacePrintSheetGrid(projectId);
  const creative = savedBrief ?? seedCreativeBriefFromContext(context);
  const now = new Date().toISOString();

  const templates: PassWorkspaceTemplate[] = [];
  for (const slot of SLOTS) {
    const versions = history[slot.slug] ?? [];
    const current = versions.length > 0 ? versions[versions.length - 1]! : null;

    templates.push({
      id: virtualTemplateId(projectId, slot.slug),
      name: `${slot.label} Pass`,
      generationId: current?.generationId ?? null,
      frontArtworkUrl: current?.frontArtworkUrl ?? null,
      backArtworkUrl: current?.backArtworkUrl ?? null,
      colors: { primary: slot.primary, secondary: "#ffffff", accent: slot.accent },
      fonts: { heading: "Georgia", body: "Arial" },
      qrPosition: { side: "back", xPct: 68, yPct: 68, sizePct: 24 },
      logoUrl: null,
      backgroundUrl: null,
      style: context.theme || `${slot.label} Pass`,
      createdAt: current?.createdAt ?? now,
      updatedAt: current?.createdAt ?? now,
      slug: slot.slug,
      version: versions.length,
      history: versions,
      adjustments: adjustmentsBySlug[slot.slug],
      approved: await isGenerationApproved(current?.generationId ?? null),
    });
  }

  // Previously generated PRINT batches for this project only (scoped by this project's own
  // event id) — unrelated to the artwork-reuse rule above; batches are never auto-created.
  const eventId = eventIdFromName(context.title);
  const library = await listPassLibrary({ eventId });
  const nextSerial = await nextSerialStart();

  return { templates, library, creative, productionLayouts, printSheetGrid, nextSerial };
}
