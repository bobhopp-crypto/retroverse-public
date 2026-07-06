import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PassExperienceOverlay } from "@/components/pass/PassExperienceOverlay";
import { PassRegistrationView } from "@/components/pass/PassRegistrationView";
import { BroadcastViewer } from "@/components/retroverse-live/BroadcastViewer";
import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";
import { findPassBySerial } from "@/lib/ops/event-studio/pass-studio/store";
import { recordPassActivity, scanPass } from "@/lib/retroverse-pass/store";
import { normalizePassSerial } from "@/lib/retroverse-pass/types";
import type { PassScanResult } from "@/lib/retroverse-pass/types";

import "../../home-broadcast.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ serial: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { serial } = await params;
  return {
    title: `Pass ${decodeURIComponent(serial)} — Retroverse`,
    robots: { index: false, follow: false },
  };
}

export default async function PassPage({ params }: Props) {
  const { serial: rawSerial } = await params;
  const raw = decodeURIComponent(rawSerial).trim();

  const serial = normalizePassSerial(raw);

  if (serial) {
    // Retroverse Pass (RVSN#####): the broadcast stays underneath;
    // claiming or being welcomed back happens in an overlay on top.
    let scan: PassScanResult | null = null;
    try {
      scan = await scanPass(serial);
      await recordPassActivity({
        visitorId: scan.pass.visitorId,
        passSerial: serial,
        eventType: "PASS_SCANNED",
      });
    } catch {
      // Database unreachable — never block the show; visitor lands on the broadcast.
    }

    const initial = await buildPlayheadPayload();

    return (
      <main className="home-broadcast">
        <BroadcastViewer initial={initial} />
        {scan ? (
          <PassExperienceOverlay
            scan={scan}
            currentEventTitle={initial.presentation?.title ?? null}
          />
        ) : null}
      </main>
    );
  }

  // Legacy Event Pass Studio serials (e.g. "0007") keep the standalone form.
  const pass = await findPassBySerial(raw);
  if (!pass) notFound();

  return <PassRegistrationView pass={pass} />;
}
