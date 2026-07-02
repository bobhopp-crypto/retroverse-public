import "server-only";

import { listPassLibrary } from "@/app/ops/event-studio/create/pass-generator/actions";
import { eventIdFromName } from "@/lib/ops/event-studio/pass-studio/default-templates";
import type { GeneratedPass, PassTemplate } from "@/lib/ops/event-studio/pass-studio/types";

import type { PassArtworkAdjustments } from "./pass-artwork-adjustments";
import {
  loadPassWorkspaceAdjustments,
  loadPassWorkspaceHistory,
  type PassWorkspaceSlug,
  type PassWorkspaceVersion,
} from "./pass-workspace-store";
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
};

export type PassWorkspaceData = {
  templates: PassWorkspaceTemplate[];
  library: GeneratedPass[];
};

export async function loadPassWorkspaceData(
  projectId: string,
  context: ProjectSharedContext,
): Promise<PassWorkspaceData> {
  const history = await loadPassWorkspaceHistory(projectId);
  const adjustmentsBySlug = await loadPassWorkspaceAdjustments(projectId);
  const now = new Date().toISOString();

  const templates: PassWorkspaceTemplate[] = SLOTS.map((slot) => {
    const versions = history[slot.slug] ?? [];
    const current = versions.length > 0 ? versions[versions.length - 1]! : null;

    return {
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
    };
  });

  // Previously generated PRINT batches for this project only (scoped by this project's own
  // event id) — unrelated to the artwork-reuse rule above; batches are never auto-created.
  const eventId = eventIdFromName(context.title);
  const library = await listPassLibrary({ eventId });

  return { templates, library };
}
