import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";
import { pgSundayNightsGet, pgSundayNightsSet } from "@/lib/sunday-nights/pg-state";
import { usePostgresSundayNightsState } from "@/lib/sunday-nights/storage-mode";

import {
  isExperienceId,
  type ExperienceId,
  type SelectorState,
} from "./types";

const DEFAULT_STATE: SelectorState = { selectedId: "program" };

/** Deployed site reads/writes via Postgres; local studio uses JSON. */
const PG_KEY = "experience-selector";

function selectorPath(): string {
  return join(opsStateDir(), "bobos", "experience-selector", "state.json");
}

function normalizeSelectorState(raw: unknown): SelectorState | null {
  if (!raw || typeof raw !== "object") return null;
  const selectedId = (raw as Partial<SelectorState>).selectedId;
  if (!isExperienceId(selectedId)) return null;
  return { selectedId };
}

export async function loadSelectorState(): Promise<SelectorState> {
  if (usePostgresSundayNightsState()) {
    const raw = await pgSundayNightsGet<Record<string, unknown>>(PG_KEY);
    return normalizeSelectorState(raw) ?? { ...DEFAULT_STATE };
  }

  try {
    const raw = await readFile(selectorPath(), "utf8");
    return normalizeSelectorState(JSON.parse(raw)) ?? { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function saveSelectorState(state: SelectorState): Promise<void> {
  if (usePostgresSundayNightsState()) {
    await pgSundayNightsSet(PG_KEY, state as unknown as Record<string, unknown>);
    return;
  }

  const dir = join(opsStateDir(), "bobos", "experience-selector");
  await mkdir(dir, { recursive: true });
  await writeFile(selectorPath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function setSelectedId(id: ExperienceId): Promise<SelectorState> {
  const state: SelectorState = { selectedId: id };
  await saveSelectorState(state);
  return state;
}
