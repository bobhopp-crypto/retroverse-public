"use client";

import { useEffect, useRef, useState } from "react";

import { TrackPageEmbed } from "@/app/track/[id]/track-page-embed";
import type { TrackPageData } from "@/lib/track/load-track-page";

type Props = {
  initialTrack: TrackPageData | null;
  initialUpdatedAt: string;
};

type CurrentPayload = {
  currentTrackId: string | null;
  updatedAt: string;
  track: TrackPageData | null;
};

const POLL_MS = 8000;

export function SundayNightsLive({ initialTrack, initialUpdatedAt }: Props) {
  const [track, setTrack] = useState<TrackPageData | null>(initialTrack);
  const updatedAtRef = useRef(initialUpdatedAt);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/sunday-nights/current", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as CurrentPayload;
        if (cancelled || data.updatedAt === updatedAtRef.current) return;
        updatedAtRef.current = data.updatedAt;
        setTrack(data.track);
      } catch {
        /* ignore transient network errors */
      }
    }

    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="sn-live" aria-live="polite" aria-atomic="true">
      {track ? (
        <TrackPageEmbed data={track} />
      ) : (
        <section className="sn-live__waiting">
          <p className="sn-live__waiting-label">Now playing</p>
          <p className="sn-live__waiting-text">Tonight&apos;s exploration begins soon.</p>
        </section>
      )}
    </div>
  );
}
