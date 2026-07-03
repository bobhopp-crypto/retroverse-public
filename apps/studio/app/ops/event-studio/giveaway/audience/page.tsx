import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GiveawayAudienceBoard } from "@/components/ops/event-studio/giveaway/GiveawayAudienceBoard";
import { GiveawayStudioFrame } from "@/components/ops/event-studio/giveaway/GiveawayStudioFrame";
import { loadGiveawayStudio } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audience — Giveaway Studio",
  robots: { index: false, follow: false },
};

export default async function GiveawayStudioAudiencePage() {
  const snapshot = await loadGiveawayStudio();
  if (!snapshot.activeGiveaway) notFound();

  return (
    <GiveawayStudioFrame
      active="audience"
      title="Audience"
      lead="Live entries, duplicate detection, search, and manual adds for the room."
    >
      <GiveawayAudienceBoard
        giveaway={snapshot.activeGiveaway}
        initialEntries={snapshot.entries}
        initialCount={snapshot.entryCount}
        initialDuplicateCount={snapshot.duplicateCount}
      />
    </GiveawayStudioFrame>
  );
}
