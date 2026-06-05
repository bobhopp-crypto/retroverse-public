import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import type { SundayNightsState } from "./types";

const RE_RVTR = /^RVTR\d{6}$/i;

function statePath(): string {
  return join(opsStateDir(), "sunday-nights", "state.json");
}

function emptyState(): SundayNightsState {
  return {
    version: 1,
    currentTrackId: null,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeState(raw: unknown): SundayNightsState {
  if (!raw || typeof raw !== "object") return emptyState();
  const obj = raw as Partial<SundayNightsState>;
  const trackId =
    typeof obj.currentTrackId === "string" && obj.currentTrackId.trim()
      ? obj.currentTrackId.trim().toUpperCase()
      : null;
  if (trackId && !RE_RVTR.test(trackId)) return emptyState();
  return {
    version: 1,
    currentTrackId: trackId,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}

export async function loadSundayNightsState(): Promise<SundayNightsState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    return normalizeState(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export async function saveSundayNightsState(state: SundayNightsState): Promise<void> {
  const dir = join(opsStateDir(), "sunday-nights");
  await mkdir(dir, { recursive: true });
  await writeFile(statePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function setCurrentTrackId(trackId: string | null): Promise<SundayNightsState> {
  const normalized =
    trackId?.trim() && RE_RVTR.test(trackId.trim())
      ? trackId.trim().toUpperCase()
      : null;
  const next: SundayNightsState = {
    version: 1,
    currentTrackId: normalized,
    updatedAt: new Date().toISOString(),
  };
  await saveSundayNightsState(next);
  return next;
}
