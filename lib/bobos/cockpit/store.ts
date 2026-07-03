import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { createDefaultCockpitState } from "./defaults";
import type { CockpitState, CockpitWorkspaceId, PanelTypeId } from "./types";
import { COCKPIT_GRID_SIZE, COCKPIT_WORKSPACES } from "./types";

function cockpitDir(): string {
  return join(opsStateDir(), "bobos", "cockpit");
}

function statePath(): string {
  return join(cockpitDir(), "state.json");
}

function isWorkspaceId(value: unknown): value is CockpitWorkspaceId {
  return COCKPIT_WORKSPACES.some((ws) => ws.id === value);
}

function normalizeState(raw: unknown): CockpitState {
  const defaults = createDefaultCockpitState();
  if (!raw || typeof raw !== "object") return defaults;

  const obj = raw as Partial<CockpitState>;
  const activeWorkspace = isWorkspaceId(obj.activeWorkspace) ? obj.activeWorkspace : defaults.activeWorkspace;

  const workspaces = { ...defaults.workspaces };
  if (obj.workspaces && typeof obj.workspaces === "object") {
    for (const ws of COCKPIT_WORKSPACES) {
      const layout = (obj.workspaces as CockpitState["workspaces"])[ws.id];
      if (!layout || !Array.isArray(layout.cells)) continue;
      const cells = layout.cells.slice(0, COCKPIT_GRID_SIZE).map((cell) => ({
        panelType: cell?.panelType ?? null,
        ...(cell?.config && typeof cell.config === "object" ? { config: cell.config } : {}),
      }));
      while (cells.length < COCKPIT_GRID_SIZE) cells.push({ panelType: null });
      workspaces[ws.id] = { cells };
    }
  }

  return { version: 1, activeWorkspace, workspaces };
}

export async function loadCockpitState(): Promise<CockpitState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    return normalizeState(JSON.parse(raw));
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
