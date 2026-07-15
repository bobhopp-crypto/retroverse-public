"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { CANONICAL_AUDIENCE_HREF, isLiveBroadcastPath } from "@/lib/bobos/presentation/canonical-audience";
import type { PlayheadPayload } from "@/lib/bobos/presentation/types";

const FOLLOW_POLL_MS = 1500;

type Props = {
  /** Routes where live audience sync is active. */
  enabledOnPaths?: RegExp;
};

const DEFAULT_PATHS = /^\/$/;

/**
 * Keeps patron surfaces on the canonical Broadcast player when the mixer
 * is on air or VirtualDJ live takeover is active.
 */
export function VdjAutoFollower({ enabledOnPaths = DEFAULT_PATHS }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!enabledOnPaths.test(pathname)) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/retroverse-live/playhead", { cache: "no-store" });
        if (!res.ok || cancelled) return;

        const data = (await res.json()) as PlayheadPayload;
        const shouldFollow =
          data.onAir ||
          (data.autoFollowVdj && data.vdj.playing) ||
          data.vdj.takeoverActive;

        if (!shouldFollow) return;
        if (isLiveBroadcastPath(pathnameRef.current)) return;
        router.replace(CANONICAL_AUDIENCE_HREF);
      } catch {
        /* keep current view */
      }
    }

    const id = window.setInterval(poll, FOLLOW_POLL_MS);
    poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabledOnPaths, pathname, router]);

  return null;
}
