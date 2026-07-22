import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import {
  isExperienceId,
  type ExperienceId,
  type SelectorState,
} from "./types";

const DEFAULT_STATE: SelectorState = { selectedId: "program" };

function selectorPath(): string {
  return join(opsStateDir(), "bobos", "experience-selector", "state.json");
}

export async function loadSelectorState(): Promise<SelectorState> {
  try {
    const raw = await readFile(selectorPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<SelectorState>;
    if (isExperienceId(parsed.selectedId)) {
      return { selectedId: parsed.selectedId };
    }
  } catch {
    // missing / corrupt → default
  }
  return { ...DEFAULT_STATE };
}

export async function saveSelectorState(state: SelectorState): Promise<void> {
  const dir = join(opsStateDir(), "bobos", "experience-selector");
  await mkdir(dir, { recursive: true });
  await writeFile(selectorPath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function setSelectedId(id: ExperienceId): Promise<SelectorState> {
  const state: SelectorState = { selectedId: id };
  await saveSelectorState(state);
  return state;
}
