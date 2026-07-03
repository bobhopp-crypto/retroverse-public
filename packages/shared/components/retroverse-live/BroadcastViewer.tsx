"use client";

import { useEffect, useState } from "react";

import type { PlayheadPayload } from "@/lib/bobos/presentation/types";

import { PresentationStage } from "./PresentationStage";

const POLL_MS = 2000;

/**
 * Broadcast viewer — polls "what is the current Playhead?" and renders it.
 * Used by the fullscreen /retroverse-live player and the public homepage,
 * so every audience surface shows the identical broadcast.
 */
export function BroadcastViewer({ initial }: { initial: PlayheadPayload }) {
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

  return <PresentationStage item={payload.item} />;
}
