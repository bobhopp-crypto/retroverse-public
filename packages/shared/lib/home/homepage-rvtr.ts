import "server-only";

import { cache } from "react";

import { tickLiveControl } from "@/lib/live-control/engine";
import { resolveActiveLiveRvtr } from "@/lib/live-control/public-entry";
import { loadLiveControlState } from "@/lib/live-control/state";
import { loadSongPackageIndex, normalizePackageRvtr } from "@/lib/ops/intelligence/song-package-store";
import { isSongExperienceRenderable } from "@/lib/ops/intelligence/song-experience-renderability";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

export type HomepageRvtrMode = "live" | "rotation" | "manual";

export type HomepageRvtrResolution = {
  rvtr: string | null;
  mode: HomepageRvtrMode;
  liveBroadcast: boolean;
};

async function discoverPool(): Promise<string[]> {
  const index = await loadSongPackageIndex();
  return index.packages
    .filter((entry) => isSongExperienceRenderable(entry.status))
    .map((entry) => entry.rvtr.toUpperCase())
    .sort();
}

export async function resolveHomepageRotationRvtr(): Promise<string | null> {
  const pool = await discoverPool();
  if (pool.length === 0) return null;
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return pool[dayIndex % pool.length] ?? pool[0] ?? null;
}

export const resolveHomepageRvtr = cache(
  async (manualRvtr?: string | null): Promise<HomepageRvtrResolution> => {
    await tickLiveControl();
    const [state, control] = await Promise.all([
      loadSundayNightsState(),
      loadLiveControlState(),
    ]);

    const liveBroadcast =
      state.live?.source === "bridge" && Boolean(state.currentTrackId?.trim());
    const liveRvtr = resolveActiveLiveRvtr({
      currentTrackId: state.currentTrackId,
      liveRvtr: state.live?.rvtr,
    });

    if (liveBroadcast && liveRvtr) {
      return { rvtr: liveRvtr, mode: "live", liveBroadcast: true };
    }

    const manual = manualRvtr ? normalizePackageRvtr(manualRvtr) : null;
    if (manual) {
      return { rvtr: manual, mode: "manual", liveBroadcast: false };
    }

    if (control.running && liveRvtr) {
      return { rvtr: liveRvtr, mode: "rotation", liveBroadcast: false };
    }

    const rotated = await resolveHomepageRotationRvtr();
    return { rvtr: rotated, mode: "rotation", liveBroadcast: false };
  },
);
