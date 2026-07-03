import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GiveawayRegistrationEditor } from "@/components/ops/event-studio/giveaway/GiveawayRegistrationEditor";
import { GiveawayStudioFrame } from "@/components/ops/event-studio/giveaway/GiveawayStudioFrame";
import { loadGiveawayStudio } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registration — Giveaway Studio",
  robots: { index: false, follow: false },
};

export default async function GiveawayStudioRegistrationPage() {
  const snapshot = await loadGiveawayStudio();
  if (!snapshot.activeGiveaway) notFound();

  return (
    <GiveawayStudioFrame
      active="registration"
      title="Registration"
      lead="Configure what guests submit when they scan the QR code."
    >
      <GiveawayRegistrationEditor giveaway={snapshot.activeGiveaway} />
    </GiveawayStudioFrame>
  );
}
