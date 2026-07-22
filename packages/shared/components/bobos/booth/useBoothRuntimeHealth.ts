"use client";

import { useEffect, useState } from "react";

import { fetchBoothVdjEnrichment } from "@/app/bobos/booth/actions";
import { getBroadcastStatus } from "@/app/bobos/broadcast/actions";
import { fetchRetroverseRuntimeStatus } from "@/app/bobos/runtime/actions";
import {
  emptyBoothRuntimeHealth,
  mapBoothRuntimeHealth,
  mapBoothVdjSource,
  type BoothRuntimeHealth,
} from "@/lib/bobos/booth";

const POLL_MS = 3000;

/**
 * One-way Runtime → Booth health + VirtualDJ Source poll.
 * Same tick for both. Identity comes from Runtime liveMonitor (already loaded).
 * Never writes to Booth Store. Never starts/stops Runtime.
 */
export function useBoothRuntimeHealth(): BoothRuntimeHealth {
  const [health, setHealth] = useState<BoothRuntimeHealth>(() => emptyBoothRuntimeHealth());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const [runtime, broadcast] = await Promise.all([
          fetchRetroverseRuntimeStatus(),
          getBroadcastStatus(),
        ]);
        if (cancelled) return;

        const vdjPlaying = broadcast.local.vdj?.playing ?? null;
        const local = runtime.liveMonitor.local;
        const hasLocalIdentity = Boolean(local.artist?.trim() && local.song?.trim());

        const enrichment =
          vdjPlaying === true && hasLocalIdentity && local.rvtr
            ? await fetchBoothVdjEnrichment(local.rvtr).catch(() => ({
                album: null,
                packageStatus: null,
              }))
            : { album: null, packageStatus: null };

        if (cancelled) return;

        const vdj = mapBoothVdjSource({
          bridgeConnected: runtime.vdjBridgeRunning,
          playing: vdjPlaying,
          live: hasLocalIdentity
            ? {
                artist: local.artist,
                title: local.song,
                rvtr: local.rvtr,
                coverUrl: local.coverUrl,
                bridgeTimestamp: local.updatedAt,
                source: "bridge",
              }
            : null,
          album: enrichment.album,
          packageStatus: enrichment.packageStatus,
          destinationKind: local.destinationKind,
        });

        setHealth(
          mapBoothRuntimeHealth({
            runtime,
            broadcast: {
              vdjPlaying,
              publicSync: broadcast.publicSync.state,
              publicSyncDetail: broadcast.publicSync.detail,
            },
            vdj,
          }),
        );
      } catch (error) {
        if (cancelled) return;
        setHealth(
          emptyBoothRuntimeHealth(error instanceof Error ? error.message : String(error)),
        );
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return health;
}
