import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { pgSundayNightsGet, pgSundayNightsSet } from "./pg-state";
import { usePostgresSundayNightsState } from "./storage-mode";

export type { SundayEventMode } from "./types";

const PG_KEY = "eventMode";

function modePath(): string {
  return join(opsStateDir(), "sunday-nights", "event-mode.json");
}

function emptyMode(): import("./types").SundayEventMode {
  return {
    enabled: false,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeMode(raw: unknown): import("./types").SundayEventMode {
  if (!raw || typeof raw !== "object") return emptyMode();
  const obj = raw as Partial<import("./types").SundayEventMode>;
  return {
    enabled: obj.enabled === true,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}

async function loadModeFromJson(): Promise<import("./types").SundayEventMode> {
  try {
    const raw = await readFile(modePath(), "utf8");
    return normalizeMode(JSON.parse(raw));
  } catch {
    return emptyMode();
  }
}

async function saveModeToJson(mode: import("./types").SundayEventMode): Promise<void> {
  const dir = join(opsStateDir(), "sunday-nights");
  await mkdir(dir, { recursive: true });
  await writeFile(modePath(), `${JSON.stringify(mode, null, 2)}\n`, "utf8");
}

export async function loadSundayEventMode(): Promise<import("./types").SundayEventMode> {
  if (usePostgresSundayNightsState()) {
    const raw = await pgSundayNightsGet<Record<string, unknown>>(PG_KEY);
    return raw ? normalizeMode(raw) : emptyMode();
  }
  return loadModeFromJson();
}

export async function isSundayEventModeEnabled(): Promise<boolean> {
  const mode = await loadSundayEventMode();
  return mode.enabled;
}

export async function setSundayEventMode(
  enabled: boolean,
): Promise<import("./types").SundayEventMode> {
  const next: import("./types").SundayEventMode = {
    enabled,
    updatedAt: new Date().toISOString(),
  };

  if (usePostgresSundayNightsState()) {
    await pgSundayNightsSet(PG_KEY, next as unknown as Record<string, unknown>);
    return next;
  }

  await saveModeToJson(next);
  return next;
}
