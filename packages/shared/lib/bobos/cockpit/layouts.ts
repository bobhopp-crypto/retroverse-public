import type { CockpitCell, CockpitWorkspaceLayout, PanelTypeId } from "./types";
import { COCKPIT_GRID_SIZE } from "./types";

export type CockpitLayoutDefinition = {
  id: string;
  title: string;
  description: string;
  defaultLayout: boolean;
  orderedPanels: Array<PanelTypeId | null>;
  settings?: Record<string, string>;
};

/** Today's Cockpit arrangement, kept in the same order as the existing grid. */
export const DEFAULT_COCKPIT_LAYOUT: CockpitLayoutDefinition = {
  id: "operations",
  title: "Operations",
  description: "Daily Retroverse operations",
  defaultLayout: true,
  orderedPanels: [
    "current-event", "pass-production", "event-producer", "pass-management",
    "broadcast", "retroverse-runtime", "media-library", "catalog-integrity",
    "virtualdj-status", "printer-panel", "experience-inspector", "terminal",
    "system-health", "ai-queue", "clock", "storage",
  ],
};

export function layoutCells(layout: CockpitLayoutDefinition): CockpitCell[] {
  return Array.from({ length: COCKPIT_GRID_SIZE }, (_, index) => ({ panelType: layout.orderedPanels[index] ?? null }));
}

export function layoutDefinitionFromWorkspace(id: string, workspace: CockpitWorkspaceLayout): CockpitLayoutDefinition {
  return {
    id,
    title: id,
    description: "Saved Cockpit workspace layout",
    defaultLayout: id === DEFAULT_COCKPIT_LAYOUT.id,
    orderedPanels: workspace.cells.map((cell) => cell.panelType),
  };
}
