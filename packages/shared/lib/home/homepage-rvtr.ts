import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";

import { tickLiveControl } from "@/lib/live-control/engine";
import { resolveActiveLiveRvtr } from "@/lib/live-control/public-entry";
import { loadLiveControlState } from "@/lib/live-control/state";
import { normalizePackageRvtr } from "@/lib/ops/intelligence/song-package-store";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

export type HomepageRvtrMode = "live" | "rotation" | "manual";

export type HomepageRvtrResolution = {
  rvtr: string | null;
  mode: HomepageRvtrMode;
  liveBroadcast: boolean;
};

const DEFAULT_PREPARED_C2_SONG = "VDJ:54EAEB091E524D3B";

type PreparedC2Record = {
  articleReference?: { source?: unknown } | null;
  durableIdentity?: unknown;
  finalEditorialStatus?: unknown;
  headline?: unknown;
  prepared?: unknown;
};

async function discoverPreparedC2Pool(): Promise<string[]> {
  const candidates = [
    join(process.cwd(), "data/ops/manifest/c2-final-editor-backlog.json"),
    join(process.cwd(), "ops/manifest/c2-final-editor-backlog.json"),
    join(process.cwd(), "../data/ops/manifest/c2-final-editor-backlog.json"),
  ];
  for (const candidate of candidates) {
    try {
      const data = JSON.parse(await readFile(candidate, "utf8")) as { records?: PreparedC2Record[] };
      return [...new Set((data.records ?? [])
        .filter((record) =>
          record.prepared === true &&
          record.finalEditorialStatus === "TERRA_FINAL" &&
          record.headline &&
          record.articleReference?.source === "reports/c2-terra-editor-proof-25/terra-editor-manifest.json"
        )
        .map((record) => String(record.durableIdentity ?? "").trim().toUpperCase())
        .filter(Boolean))]
        .sort();
    } catch { /* try the next runtime data root */ }
  }
  return [];
}

export function selectPreparedSongOfHour(pool: readonly string[], now: Date): string | null {
  if (pool.length === 0) return null;
  const hourIndex = Math.floor(now.getTime() / 3_600_000);
  return pool[((hourIndex % pool.length) + pool.length) % pool.length] ?? pool[0] ?? null;
}

export async function resolveHomepageSongOfHourRvtr(now = new Date()): Promise<string | null> {
  return selectPreparedSongOfHour(await discoverPreparedC2Pool(), now) ?? DEFAULT_PREPARED_C2_SONG;
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

    const rotated = await resolveHomepageSongOfHourRvtr();
    return { rvtr: rotated, mode: "rotation", liveBroadcast: false };
  },
);
