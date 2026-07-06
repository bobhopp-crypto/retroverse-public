import { eventIdFromName } from "./event-id";
import type { PassTemplate } from "./types";
import { DEFAULT_PASS_ARTWORK_ADJUSTMENTS } from "@/lib/bobos/project-zero/pass-artwork-adjustments";
import type { PassWorkspaceTemplate } from "@/lib/bobos/project-zero/load-pass-workspace-data";
import type { PassWorkspaceSlug } from "@/lib/bobos/project-zero/pass-workspace-slugs";

/** Stable pass-workspace store key for Design Builder production layouts (per event). */
export function designBuilderProjectId(eventName: string): string {
  return `design-builder-${eventIdFromName(eventName)}`;
}

export function passTypeSlugFromPassLabel(label: string): PassWorkspaceSlug {
  const lower = label.trim().toLowerCase();
  if (lower.includes("backstage")) return "backstage";
  if (lower.includes("vip")) return "vip";
  return "general";
}

export function passTypeLabelFromTemplate(template: PassTemplate): string {
  return template.name.replace(/\s+Pass$/i, "").trim() || template.name;
}

/** Adapter — maps Pass Studio designs into the shape ProductionLayoutEditor expects. */
export function toWorkspaceTemplates(templates: PassTemplate[]): PassWorkspaceTemplate[] {
  return templates.map((template) => {
    const passTypeLabel = passTypeLabelFromTemplate(template);
    const slug = passTypeSlugFromPassLabel(passTypeLabel);
    return {
      ...template,
      slug,
      version: template.generationId ? 1 : 0,
      history: [],
      adjustments: { ...DEFAULT_PASS_ARTWORK_ADJUSTMENTS },
      approved: false,
    };
  });
}
