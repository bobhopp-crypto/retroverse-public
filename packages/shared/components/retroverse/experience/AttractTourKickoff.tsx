"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const SEED_KEY = "retroverse-attract-seed";

function readOrCreateSeed(): number {
  try {
    const existing = sessionStorage.getItem(SEED_KEY);
    if (existing) {
      const n = Number(existing);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const seed = Math.floor(Math.random() * 1_000_000_000);
    sessionStorage.setItem(SEED_KEY, String(seed));
    return seed;
  } catch {
    return Math.floor(Math.random() * 1_000_000_000);
  }
}

/** When idle on the live hub, send visitors into the auto tour. */
export function AttractTourKickoff({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const seed = readOrCreateSeed();

    async function start() {
      try {
        const res = await fetch(`/api/retroverse-2/attract-tour?seed=${seed}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { startRvtr?: string; entries?: Array<{ rvtr: string }> };
        const first = data.startRvtr ?? data.entries?.[0]?.rvtr;
        if (!first || cancelled) return;
        router.replace(`/retroverse-2/song/${first}`);
      } catch {
        /* live page remains usable */
      }
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, [enabled, router]);

  return null;
}
