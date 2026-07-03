import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import { collectionDir } from "../paths";
import { MS_COLLECTION_ID } from "./paths";

export type MsSyncEvent = {
  at: string;
  type: "private_restored" | "new_episode" | "removed_episode" | "acquired";
  episode_id: string;
  detail?: string;
};

export type MsSyncState = {
  version: 1;
  last_sync_at: string | null;
  last_official_playlist_count: number;
  last_playlist_video_ids: string[];
  new_episodes_since_last_sync: number;
  events: MsSyncEvent[];
};

const NOW = () => new Date().toISOString();

export function msSyncStatePath(): string {
  return join(collectionDir(MS_COLLECTION_ID), "sync-state.json");
}

function emptyState(): MsSyncState {
  return {
    version: 1,
    last_sync_at: null,
    last_official_playlist_count: 0,
    last_playlist_video_ids: [],
    new_episodes_since_last_sync: 0,
    events: [],
  };
}

export async function loadMsSyncState(): Promise<MsSyncState> {
  try {
    const raw = JSON.parse(await readFile(msSyncStatePath(), "utf8")) as MsSyncState;
    if (raw?.version === 1) {
      return {
        ...emptyState(),
        ...raw,
        events: Array.isArray(raw.events) ? raw.events : [],
        last_playlist_video_ids: Array.isArray(raw.last_playlist_video_ids)
          ? raw.last_playlist_video_ids
          : [],
      };
    }
  } catch {
    // first run
  }
  return emptyState();
}

export async function saveMsSyncState(state: MsSyncState): Promise<void> {
  const payload: MsSyncState = { ...state, version: 1 };
  await writeFile(msSyncStatePath(), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function appendMsSyncEvent(
  event: Omit<MsSyncEvent, "at"> & { at?: string },
): Promise<MsSyncState> {
  const state = await loadMsSyncState();
  state.events = [
    { ...event, at: event.at ?? NOW() },
    ...state.events.slice(0, 49),
  ];
  await saveMsSyncState(state);
  return state;
}
