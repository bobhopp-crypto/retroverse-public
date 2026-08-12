import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import {
  createDefaultCockpitState,
  createProductionCockpitLayout,
  CURRENT_COCKPIT_LAYOUT_VERSION,
} from "./defaults";
import { COCKPIT_PANEL_REGISTRY as PANEL_LIBRARY } from "./registry";
import type { CockpitState, CockpitWorkspaceId, PanelTypeId } from "./types";
import { COCKPIT_GRID_SIZE, COCKPIT_WORKSPACES } from "./types";

function isPanelTypeId(value: unknown): value is PanelTypeId {
  return typeof value === "string" && value in PANEL_LIBRARY;
}

function cockpitDir(): string {
  return join(opsStateDir(), "bobos", "cockpit");
}

function statePath(): string {
  return join(cockpitDir(), "state.json");
}

function isWorkspaceId(value: unknown): value is CockpitWorkspaceId {
  return COCKPIT_WORKSPACES.some((ws) => ws.id === value);
}

function readLayoutVersion(raw: Partial<CockpitState>): number {
  const value = raw.layoutVersion;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeWorkspaceCells(
  layout: { cells?: unknown[] } | null | undefined,
  fallbackCells: CockpitState["workspaces"][CockpitWorkspaceId]["cells"],
): CockpitState["workspaces"][CockpitWorkspaceId]["cells"] {
  if (!layout || !Array.isArray(layout.cells)) return fallbackCells;

  const cells = layout.cells.slice(0, COCKPIT_GRID_SIZE).map((cell) => {
    const row = cell as { panelType?: unknown; config?: unknown };
    return {
      panelType: isPanelTypeId(row?.panelType) ? row.panelType : null,
      ...(row?.config && typeof row.config === "object"
        ? { config: row.config as Record<string, string> }
        : {}),
    };
  });
  while (cells.length < COCKPIT_GRID_SIZE) cells.push({ panelType: null });
  return cells;
}

function normalizeState(raw: unknown): CockpitState {
  const defaults = createDefaultCockpitState();
  if (!raw || typeof raw !== "object") return defaults;

  const obj = raw as Partial<CockpitState>;
  const savedLayoutVersion = readLayoutVersion(obj);
  const needsLayoutMigration = savedLayoutVersion < CURRENT_COCKPIT_LAYOUT_VERSION;
  const activeWorkspace = isWorkspaceId(obj.activeWorkspace) ? obj.activeWorkspace : defaults.activeWorkspace;

  const workspaces = { ...defaults.workspaces };
  if (obj.workspaces && typeof obj.workspaces === "object") {
    for (const ws of COCKPIT_WORKSPACES) {
      const layout = (obj.workspaces as CockpitState["workspaces"])[ws.id];
      const fallback = defaults.workspaces[ws.id].cells;
      if (ws.id === "cockpit" && needsLayoutMigration) {
        workspaces.cockpit = { cells: createProductionCockpitLayout() };
        continue;
      }
      workspaces[ws.id] = { cells: normalizeWorkspaceCells(layout, fallback) };
    }
  }

  // Safety: cockpit workspace always includes broadcast when migrating legacy saves.
  const cockpitCells = workspaces.cockpit.cells;
  const hasBroadcast = cockpitCells.some((cell) => cell.panelType === "broadcast");
  if (!hasBroadcast) {
    const byPanel = (panelType: PanelTypeId | null) =>
      cockpitCells.findIndex((cell) => cell.panelType === panelType);
    const candidates = [byPanel("live-display"), byPanel("current-song"), byPanel(null)];
    const index = candidates.find((i) => i !== -1) ?? cockpitCells.length - 1;
    cockpitCells[index] = { panelType: "broadcast" };
  }

  // Soft-place RV03-05 Home Page Factory without resetting the operator layout.
  const hasHomePageFactory = cockpitCells.some((cell) => cell.panelType === "home-page-factory");
  if (!hasHomePageFactory) {
    const byPanel = (panelType: PanelTypeId | null) =>
      cockpitCells.findIndex((cell) => cell.panelType === panelType);
    const candidates = [
      byPanel("catalog-integrity"),
      byPanel("production-queue"),
      byPanel("storage"),
      byPanel("clock"),
      byPanel("terminal"),
      byPanel("ai-queue"),
      byPanel(null),
    ];
    const index = candidates.find((i) => i !== -1);
    if (typeof index === "number") {
      cockpitCells[index] = { panelType: "home-page-factory" };
    }
  }

  return {
    version: 1,
    layoutVersion: CURRENT_COCKPIT_LAYOUT_VERSION,
    activeWorkspace,
    workspaces,
  };
}

export async function loadCockpitState(): Promise<CockpitState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<CockpitState>;
    const normalized = normalizeState(parsed);
    const savedLayoutVersion = readLayoutVersion(parsed);
    if (savedLayoutVersion < CURRENT_COCKPIT_LAYOUT_VERSION) {
      await saveCockpitState(normalized);
    }
    return normalized;
  } catch {
    return createDefaultCockpitState();
  }
}

export async function saveCockpitState(state: CockpitState): Promise<CockpitState> {
  const normalized = normalizeState(state);
  await mkdir(cockpitDir(), { recursive: true });
  await writeFile(statePath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export type CockpitPatch =
  | { type: "set-active-workspace"; workspaceId: CockpitWorkspaceId }
  | { type: "set-cell"; workspaceId: CockpitWorkspaceId; cellIndex: number; panelType: PanelTypeId | null }
  | { type: "set-cell-config"; workspaceId: CockpitWorkspaceId; cellIndex: number; config: Record<string, string> };

export async function patchCockpitState(patch: CockpitPatch): Promise<CockpitState> {
  const state = await loadCockpitState();

  switch (patch.type) {
    case "set-active-workspace":
      if (isWorkspaceId(patch.workspaceId)) state.activeWorkspace = patch.workspaceId;
      break;
    case "set-cell": {
      const layout = state.workspaces[patch.workspaceId];
      if (layout && patch.cellIndex >= 0 && patch.cellIndex < COCKPIT_GRID_SIZE) {
        layout.cells[patch.cellIndex] = {
          panelType: patch.panelType,
          config: layout.cells[patch.cellIndex]?.config,
        };
      }
      break;
    }
    case "set-cell-config": {
      const layout = state.workspaces[patch.workspaceId];
      if (layout && patch.cellIndex >= 0 && patch.cellIndex < COCKPIT_GRID_SIZE) {
        const cell = layout.cells[patch.cellIndex];
        if (cell) cell.config = patch.config;
      }
      break;
    }
  }

  return saveCockpitState(state);
}
