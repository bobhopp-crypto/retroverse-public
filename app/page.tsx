import type { Metadata } from "next";

import { BroadcastViewer } from "@/components/retroverse-live/BroadcastViewer";
import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";

import "./home-broadcast.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retroverse",
  description: "Press Play for the Past.",
};

/**
 * The public homepage mirrors Retroverse Live: whatever the Broadcast Panel's
 * playhead points at is what visitors see — on air or the off-air stage.
 * No local rotation, no hardcoded content; the broadcast is the homepage.
 */
export default async function HomePage() {
  const initial = await buildPlayheadPayload();

  return (
    <main className="home-broadcast">
      <BroadcastViewer initial={initial} />
    </main>
  );
}
