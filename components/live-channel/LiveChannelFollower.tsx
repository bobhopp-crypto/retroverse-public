"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const CHANNEL_POLL_MS = 3000;

type Props = {
  rvtr: string;
};

/**
 * When the live channel is running, follow song changes automatically.
 * Used on Song Experience — no extra click through Now Playing.
 */
export function LiveChannelFollower({ rvtr }: Props) {
  const router = useRouter();
  const rvtrRef = useRef(rvtr.toUpperCase());

  useEffect(() => {
    rvtrRef.current = rvtr.toUpperCase();
  }, [rvtr]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/sunday-nights/current", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          currentTrackId?: string | null;
          channel?: { running?: boolean } | null;
        };
        if (!data.channel?.running) return;
        const next = data.currentTrackId?.trim().toUpperCase();
        if (!next || next === rvtrRef.current) return;
        rvtrRef.current = next;
        router.replace(`/retroverse-2/song/${next}`);
      } catch {
        /* keep current song visible */
      }
    }

    const id = window.setInterval(poll, CHANNEL_POLL_MS);
    poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [router]);

  return null;
}
