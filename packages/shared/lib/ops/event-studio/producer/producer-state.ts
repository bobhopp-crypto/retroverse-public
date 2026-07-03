import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import type { ProductionModuleId, ProductionModuleStatus } from "./module-status";
import { normalizeProductionModuleStatus } from "./module-status";
import { listEventProducerDrafts } from "./store";
import type { EventProducerDraft, EventProducerParsedPlan } from "./types";

export type ProducerState = {
  version: 1;
  activeDraftId: string | null;
  moduleStatuses: Partial<Record<ProductionModuleId, ProductionModuleStatus>>;
  syncedAt: string | null;
  updatedAt: string;
};

function statePath(): string {
  return join(opsStateDir(), "event-studio", "producer", "state.json");
}

function defaultState(): ProducerState {
  return {
    version: 1,
    activeDraftId: null,
    moduleStatuses: {},
    syncedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeState(raw: unknown): ProducerState {
  if (!raw || typeof raw !== "object") return defaultState();
  const obj = raw as Partial<ProducerState>;
  const moduleStatuses: Partial<Record<ProductionModuleId, ProductionModuleStatus>> = {};
  if (obj.moduleStatuses && typeof obj.moduleStatuses === "object") {
    for (const [key, value] of Object.entries(obj.moduleStatuses)) {
      const status = normalizeProductionModuleStatus(value);
      if (status) {
        moduleStatuses[key as ProductionModuleId] = status;
      }
    }
  }
  return {
    version: 1,
    activeDraftId: typeof obj.activeDraftId === "string" ? obj.activeDraftId : null,
    moduleStatuses,
    syncedAt: typeof obj.syncedAt === "string" ? obj.syncedAt : null,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}

async function saveState(state: ProducerState): Promise<ProducerState> {
  const dir = join(opsStateDir(), "event-studio", "producer");
  await mkdir(dir, { recursive: true });
  const next = { ...state, updatedAt: new Date().toISOString() };
  await writeFile(statePath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export async function loadProducerState(): Promise<ProducerState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export async function setActiveDraftId(draftId: string): Promise<ProducerState> {
  const state = await loadProducerState();
  return saveState({ ...state, activeDraftId: draftId });
}

export async function setModuleStatus(
  moduleId: ProductionModuleId,
  status: ProductionModuleStatus,
): Promise<ProducerState> {
  const state = await loadProducerState();
  return saveState({
    ...state,
    moduleStatuses: { ...state.moduleStatuses, [moduleId]: status },
  });
}

export async function markSynced(): Promise<ProducerState> {
  const state = await loadProducerState();
  return saveState({ ...state, syncedAt: new Date().toISOString() });
}

export async function getActiveProducerDraft(): Promise<EventProducerDraft | null> {
  const state = await loadProducerState();
  if (!state.activeDraftId) return null;
  const drafts = await listEventProducerDrafts();
  return drafts.find((draft) => draft.id === state.activeDraftId) ?? null;
}

export async function getActiveProducerPlan(): Promise<{
  draft: EventProducerDraft;
  parsedPlan: EventProducerParsedPlan;
} | null> {
  const draft = await getActiveProducerDraft();
  if (!draft) return null;
  return { draft, parsedPlan: draft.parsedPlan };
}

export async function getStoredModuleStatuses(): Promise<
  Partial<Record<ProductionModuleId, ProductionModuleStatus>>
> {
  const state = await loadProducerState();
  return state.moduleStatuses;
}
