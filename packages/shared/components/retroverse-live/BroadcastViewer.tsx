"use client";

import { useEffect, useState } from "react";

import {
  normalizePlayheadPayload,
  playheadStageKey,
} from "@/lib/broadcast/normalize-playhead";
import type { PlayheadPayload, PlayheadPayloadCore } from "@/lib/bobos/presentation/types";

import { PresentationStage } from "./PresentationStage";

const POLL_MS = 2000;

type Props = {
  initial: PlayheadPayload | PlayheadPayloadCore;
  /** When false, render only the initial payload (Audience Preview). */
  poll?: boolean;
};

/**
 * Broadcast viewer — polls "what is the current Playhead?" and renders it.
 * Used by the fullscreen /retroverse-live player, the public homepage, and
 * the Broadcast Mixer Audience Preview so every audience surface shows the
 * identical composed broadcast asset.
 */
export function BroadcastViewer({ initial, poll = true }: Props) {
  const [payload, setPayload] = useState(() => normalizePlayheadPayload(initial));

  useEffect(() => {
    if (!poll) return;

    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/retroverse-live/playhead", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as PlayheadPayloadCore;
        if (!cancelled) setPayload(normalizePlayheadPayload(next));
      } catch {
        // Keep showing the last known item; the next poll will recover.
      }
    }

    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [poll]);

  return (
    <PresentationStage
      key={playheadStageKey(payload)}
      rvba={payload.rvba}
      broadcast={payload.broadcast}
    />
  );
}
