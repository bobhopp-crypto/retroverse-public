import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

export type SundayEventMode = {
  enabled: boolean;
  updatedAt: string;
};

function modePath(): string {
  return join(opsStateDir(), "sunday-nights", "event-mode.json");
}

function emptyMode(): SundayEventMode {
  return {
    enabled: false,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeMode(raw: unknown): SundayEventMode {
  if (!raw || typeof raw !== "object") return emptyMode();
  const obj = raw as Partial<SundayEventMode>;
  return {
    enabled: obj.enabled === true,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}

export async function loadSundayEventMode(): Promise<SundayEventMode> {
  try {
    const raw = await readFile(modePath(), "utf8");
    return normalizeMode(JSON.parse(raw));
  } catch {
    return emptyMode();
  }
}

export async function isSundayEventModeEnabled(): Promise<boolean> {
  const mode = await loadSundayEventMode();
  return mode.enabled;
}

export async function setSundayEventMode(enabled: boolean): Promise<SundayEventMode> {
  const next: SundayEventMode = {
    enabled,
    updatedAt: new Date().toISOString(),
  };
  const dir = join(opsStateDir(), "sunday-nights");
  await mkdir(dir, { recursive: true });
  await writeFile(modePath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
