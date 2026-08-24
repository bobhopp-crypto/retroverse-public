"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CANONICAL_AUDIENCE_HREF } from "@/lib/bobos/presentation/canonical-audience";
import type { PlayheadPayload } from "@/lib/bobos/presentation/types";

type Props = {
  className?: string;
};

export function ReturnToLiveLink({ className }: Props) {
  const [liveAvailable, setLiveAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function observeBroadcast() {
      try {
        const response = await fetch(`/api/retroverse-live/playhead?ts=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!response.ok || cancelled) return;
        const playhead = (await response.json()) as PlayheadPayload;
        setLiveAvailable(
          Boolean(
            playhead.onAir &&
            playhead.rvba &&
            playhead.broadcast &&
            playhead.broadcast.state !== "off-air",
          ),
        );
      } catch {
        // Keep the last confirmed state. A later poll can recover.
      }
    }

    void observeBroadcast();
    const timer = window.setInterval(observeBroadcast, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!liveAvailable) return null;

  return (
    <Link href={CANONICAL_AUDIENCE_HREF} className={className}>
      Return to Live
    </Link>
  );
}
