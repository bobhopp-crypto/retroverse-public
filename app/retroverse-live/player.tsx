"use client";

import { useEffect, useState } from "react";

import { PresentationStage } from "@/components/retroverse-live/PresentationStage";
import type { PlayheadPayload } from "@/lib/bobos/presentation/types";

const POLL_MS = 2000;

export function RetroverseLivePlayer({ initial }: { initial: PlayheadPayload }) {
  const [payload, setPayload] = useState<PlayheadPayload>(initial);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/retroverse-live/playhead", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as PlayheadPayload;
        if (!cancelled) setPayload(next);
      } catch {
        // Keep showing the last known item; the next poll will recover.
      }
    }

    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Full-screen takeover: sits above the global nav (z-index 1200) because
  // this is a venue display, not a browsing page.
  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 1300 }}>
      <PresentationStage item={payload.item} />
    </main>
  );
}
