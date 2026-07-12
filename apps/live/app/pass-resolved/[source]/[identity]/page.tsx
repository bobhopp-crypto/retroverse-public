import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { PassExperienceOverlay } from "@/components/pass/PassExperienceOverlay";
import { PassRegistrationView } from "@/components/pass/PassRegistrationView";
import { BroadcastViewer } from "@/components/retroverse-live/BroadcastViewer";
import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";
import { findPassById } from "@/lib/ops/event-studio/pass-studio/store";
import { recordPassActivity, scanPassByExactSerial } from "@/lib/retroverse-pass/store";

import "../../../home-broadcast.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ source: string; identity: string }> };

export default async function ResolvedPassPage({ params }: Props) {
  if ((await headers()).get("x-retroverse-pass-rewrite") !== "1") notFound();
  const { source, identity } = await params;

  if (source === "postgres") {
    const scan = await scanPassByExactSerial(identity);
    if (!scan) notFound();
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

  if (source === "studio") {
    const pass = await findPassById(identity);
    if (!pass) notFound();
    return <PassRegistrationView pass={pass} />;
  }

  notFound();
}

