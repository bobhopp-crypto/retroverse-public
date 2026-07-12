import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { PassExperienceOverlay } from "@/components/pass/PassExperienceOverlay";
import { BroadcastViewer } from "@/components/retroverse-live/BroadcastViewer";
import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";
import { decodeResolvedPass, RESOLVED_PASS_HEADER } from "@/lib/retroverse-pass/resolved-payload";
import { recordPassActivity } from "@/lib/retroverse-pass/store";

import "../../../home-broadcast.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ source: string; identity: string }> };

export default async function ResolvedPassPage({ params }: Props) {
  const requestHeaders = await headers();
  if (requestHeaders.get("x-retroverse-pass-rewrite") !== "1") notFound();
  const { source, identity } = await params;

  if (source === "postgres") {
    const scan = decodeResolvedPass(requestHeaders.get(RESOLVED_PASS_HEADER));
    if (!scan || scan.pass.serial !== identity) notFound();
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

  notFound();
}
