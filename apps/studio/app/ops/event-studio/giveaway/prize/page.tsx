import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GiveawayPrizeEditor } from "@/components/ops/event-studio/giveaway/GiveawayPrizeEditor";
import { GiveawayStudioFrame } from "@/components/ops/event-studio/giveaway/GiveawayStudioFrame";
import { loadGiveawayStudio } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prize — Giveaway Studio",
  robots: { index: false, follow: false },
};

export default async function GiveawayStudioPrizePage() {
  const snapshot = await loadGiveawayStudio();
  if (!snapshot.activeGiveaway) notFound();

  return (
    <GiveawayStudioFrame
      active="prize"
      title="Prize"
      lead="Hero photo first. Description, value, sponsor, and promo copy inherit the event identity."
    >
      <GiveawayPrizeEditor giveaway={snapshot.activeGiveaway} />
    </GiveawayStudioFrame>
  );
}
