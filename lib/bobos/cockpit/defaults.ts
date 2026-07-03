import type { CockpitCell, CockpitState, CockpitWorkspaceId, PanelTypeId } from "./types";
import { COCKPIT_GRID_SIZE } from "./types";

const DEFAULT_COCKPIT_PANELS: PanelTypeId[] = [
  "current-event",
  "todays-tasks",
  "production-queue",
  "public-homepage",
  "pass-registration",
  "giveaway-panel",
  "broadcast",
  "current-song",
  "ai-queue",
  "media-library",
  "virtualdj-status",
  "printer-panel",
  "git-status",
  "system-health",
  "clock",
  "database-health",
];

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
      cells: id === "cockpit" ? seededCells(DEFAULT_COCKPIT_PANELS) : emptyCells(),
    };
  }
  return {
    version: 1,
    activeWorkspace: "cockpit",
    workspaces,
  };
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
