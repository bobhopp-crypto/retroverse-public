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
 * retroverse.live — the live broadcast. No traditional homepage; the site IS
 * the current Broadcast Asset from the mixer.
 */
export default async function HomePage() {
  const initial = await buildPlayheadPayload();

  return (
    <main className="home-broadcast">
      <BroadcastViewer initial={initial} />
    </main>
  );
}
