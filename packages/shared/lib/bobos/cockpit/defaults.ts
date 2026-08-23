import type { CockpitCell, CockpitState, CockpitWorkspaceId, PanelTypeId } from "./types";
import { COCKPIT_GRID_SIZE } from "./types";
import { DEFAULT_COCKPIT_LAYOUT, layoutCells } from "./layouts";

/** Bump when DEFAULT_COCKPIT_LAYOUT panel order changes (resets saved cockpit grid). */
export const CURRENT_COCKPIT_LAYOUT_VERSION = 8;

/** Production cockpit grid — matches the operator Mission Control layout. */
function emptyCells(): CockpitCell[] {
  return Array.from({ length: COCKPIT_GRID_SIZE }, () => ({ panelType: null }));
}

function seededCells(panelTypes: PanelTypeId[]): CockpitCell[] {
  const cells = emptyCells();
  panelTypes.forEach((panelType, index) => {
    if (index < COCKPIT_GRID_SIZE) cells[index] = { panelType };
  });
  return cells;
}

const WORKSPACE_IDS: CockpitWorkspaceId[] = [
  "cockpit",
  "live-aid-1985",
  "development",
  "ai-workbench",
  "marketplace",
  "finance",
  "manufacturing",
  "research",
];

export function createDefaultCockpitState(): CockpitState {
  const workspaces = {} as CockpitState["workspaces"];
  for (const id of WORKSPACE_IDS) {
    workspaces[id] = {
      cells: id === "cockpit" ? layoutCells(DEFAULT_COCKPIT_LAYOUT) : emptyCells(),
    };
  }
  return {
    version: 1,
    layoutVersion: CURRENT_COCKPIT_LAYOUT_VERSION,
    activeWorkspace: "cockpit",
    workspaces,
  };
}

export function createProductionCockpitLayout(): CockpitCell[] {
  return layoutCells(DEFAULT_COCKPIT_LAYOUT);
}

/** Panel cell label: 01–16 */
export function cellLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** Row/col label e.g. A1–D4 */
export function cellGridRef(index: number): string {
  const row = String.fromCharCode(65 + Math.floor(index / 4));
  const col = (index % 4) + 1;
  return `${row}${col}`;
}
