"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { normalizePlayheadPayload, playheadStageKey } from "@/lib/broadcast/normalize-playhead";
import type { PlayheadPayloadCore } from "@/lib/bobos/presentation/types";

const POLL_MS = 1000;

/** Refreshes the server-rendered Song Journey when the one published output changes. */
export function AudiencePlayheadRefresh({ initialKey }: { initialKey: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let refreshing = false;

    async function tick() {
      if (refreshing) return;
      try {
        const response = await fetch("/api/retroverse-live/playhead", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const next = normalizePlayheadPayload((await response.json()) as PlayheadPayloadCore);
        if (playheadStageKey(next) !== initialKey) {
          refreshing = true;
          router.refresh();
        }
      } catch {
        // Preserve the last published journey; the next poll will recover.
      }
    }

    const timer = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [initialKey, router]);

  return null;
}
