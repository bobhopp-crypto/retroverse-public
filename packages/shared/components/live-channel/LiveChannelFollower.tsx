"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CANONICAL_AUDIENCE_HREF } from "@/lib/bobos/presentation/canonical-audience";

const CHANNEL_POLL_MS = 3000;

type Props = {
  rvtr: string;
};

/**
 * When the live channel is running, send patrons to the Broadcast player.
 */
export function LiveChannelFollower(_props: Props) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/sunday-nights/current", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          channel?: { running?: boolean } | null;
        };
        if (!data.channel?.running) return;
        router.replace(CANONICAL_AUDIENCE_HREF);
      } catch {
        /* keep current view */
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
