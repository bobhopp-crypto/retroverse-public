import { PassExperienceOverlay } from "@/components/pass/PassExperienceOverlay";
import { BroadcastViewer } from "@/components/retroverse-live/BroadcastViewer";
import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";

import { recordPassActivity } from "./store";
import type { PassScanResult } from "./types";

export async function PassExperienceShell({ scan }: { scan: PassScanResult }) {
  try {
    await recordPassActivity({
      visitorId: scan.pass.visitorId,
      passSerial: scan.pass.serial,
      eventType: "PASS_SCANNED",
    });
  } catch {
    // Activity logging must never block a valid pass.
  }
  const initial = await buildPlayheadPayload();
  return (
    <main className="home-broadcast">
      <BroadcastViewer initial={initial} />
      <PassExperienceOverlay scan={scan} currentEventTitle={initial.presentation?.title ?? null} />
    </main>
  );
}
