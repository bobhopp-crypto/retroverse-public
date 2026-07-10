import type { Metadata } from "next";

import { BroadcastViewer } from "@/components/retroverse-live/BroadcastViewer";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { normalizePlayheadPayload } from "@/lib/broadcast/normalize-playhead";
import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";

import "./live-home.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retroverse Live",
  description: "Press Play for the Past.",
};

/**
 * retroverse.live — the live broadcast. No traditional homepage; the site IS
 * the current Broadcast Asset from the mixer.
 */
export default async function HomePage() {
  const initial = normalizePlayheadPayload(await buildPlayheadPayload());

  return (
    <Rv2PublicShell className="rv2-live-home" activeNav="live">
      <div className="live-home explorer">
        <BroadcastViewer initial={initial} />
      </div>
    </Rv2PublicShell>
  );
}
