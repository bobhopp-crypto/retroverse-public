"use client";

import { BroadcastViewer } from "@/components/retroverse-live/BroadcastViewer";
import type { PlayheadPayload } from "@/lib/bobos/presentation/types";

export function RetroverseLivePlayer({ initial }: { initial: PlayheadPayload }) {
  // Full-screen takeover: sits above the global nav (z-index 1200) because
  // this is a venue display, not a browsing page.
  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 1300 }}>
      <BroadcastViewer initial={initial} />
    </main>
  );
}
