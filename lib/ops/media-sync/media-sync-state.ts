import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

export type MediaSyncState = {
  version: 1;
  reviewedIds: string[];
};

const EMPTY: MediaSyncState = { version: 1, reviewedIds: [] };

function statePath(): string {
  return join(opsStateDir(), "media-sync-state.json");
}

export async function loadMediaSyncState(): Promise<MediaSyncState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    const parsed = JSON.parse(raw) as MediaSyncState;
    if (parsed?.version === 1 && Array.isArray(parsed.reviewedIds)) {
      return parsed;
    }
    return EMPTY;
  } catch {
    return EMPTY;
  }
}

export async function markMediaSyncReviewed(rowId: string): Promise<MediaSyncState> {
  const state = await loadMediaSyncState();
  if (!state.reviewedIds.includes(rowId)) {
    state.reviewedIds.push(rowId);
  }
  await mkdir(opsStateDir(), { recursive: true });
  await writeFile(statePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}
