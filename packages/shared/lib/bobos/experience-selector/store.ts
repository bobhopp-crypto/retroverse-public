import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";
import { REDIS_SELECTOR_KEY, redisJsonGet, redisJsonSet } from "@/lib/sunday-nights/redis-live-state";

import {
  isExperienceId,
  type ExperienceId,
  type SelectorState,
} from "./types";

const DEFAULT_STATE: SelectorState = { selectedId: "program" };

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
  if (process.env.VERCEL === "1") {
    const raw = await redisJsonGet(REDIS_SELECTOR_KEY);
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
  if (process.env.VERCEL === "1") {
    await redisJsonSet(REDIS_SELECTOR_KEY, state as unknown as Record<string, unknown>);
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
