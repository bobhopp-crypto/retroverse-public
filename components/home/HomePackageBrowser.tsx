"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import type { HomepageRvtrMode, HomepageRvtrResolution } from "@/lib/home/homepage-rvtr";
import { normalizeRvtr } from "@/lib/studio/status";

import { HomepageSearchBar } from "./HomepageSearchBar";

import "./homepage-v1.css";

type SundayNightsCurrent = {
  currentTrackId: string | null;
  live: { source?: string | null } | null;
  channel: { running?: boolean } | null;
};

type Props = {
  initialResolution: HomepageRvtrResolution;
};

const LIVE_POLL_MS = 3000;

function modeLabel(mode: HomepageRvtrMode, liveBroadcast: boolean): string {
  if (liveBroadcast) return "Live";
  if (mode === "manual") return "Selected";
  return "Rotation";
}

export function HomeShell({ initialResolution }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const manualRvtrRef = useRef(searchParams.get("rvtr"));

  useEffect(() => {
    manualRvtrRef.current = searchParams.get("rvtr");
  }, [searchParams]);

  const handleManualSelect = useCallback(
    (rvtr: string) => {
      router.push(`/?rvtr=${encodeURIComponent(rvtr)}`);
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;

    async function pollLive() {
      try {
        const response = await fetch("/api/sunday-nights/current", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as SundayNightsCurrent;

        const liveBroadcast =
          payload.live?.source === "bridge" && Boolean(payload.currentTrackId?.trim());
        const liveRvtr = normalizeRvtr(payload.currentTrackId);

        if (liveBroadcast && liveRvtr) {
          const current = searchParams.get("rvtr");
          if (current !== liveRvtr) {
            router.replace(`/?rvtr=${encodeURIComponent(liveRvtr)}`);
          }
          return;
        }

        if (manualRvtrRef.current) return;

        if (payload.channel?.running && liveRvtr) {
          const current = searchParams.get("rvtr");
          if (current !== liveRvtr) {
            router.replace(`/?rvtr=${encodeURIComponent(liveRvtr)}`);
          }
        }
      } catch {
        // ignore transient poll errors
      }
    }

    const timer = window.setInterval(pollLive, LIVE_POLL_MS);
    void pollLive();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [router, searchParams]);

  const liveLocked = initialResolution.liveBroadcast;

  return (
    <div className="home-v1__search-panel">
      <HomepageSearchBar onSelectRvtr={handleManualSelect} disabled={liveLocked} />
      <p className="home-v1__mode" aria-live="polite">
        {modeLabel(initialResolution.mode, initialResolution.liveBroadcast)}
        {initialResolution.rvtr ? ` · ${initialResolution.rvtr}` : ""}
      </p>
    </div>
  );
}

/** @deprecated Use HomeShell */
export const HomePackageBrowser = HomeShell;
