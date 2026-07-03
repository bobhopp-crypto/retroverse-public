import type { Metadata } from "next";

import { GiveawayOverviewPanel } from "@/components/ops/event-studio/giveaway/GiveawayOverviewPanel";
import { GiveawayStudioFrame } from "@/components/ops/event-studio/giveaway/GiveawayStudioFrame";
import { loadGiveawayStudio } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";


export const metadata: Metadata = {
  title: "Giveaway Studio — Event Studio",
  robots: { index: false, follow: false },
};

export default async function GiveawayStudioOverviewPage() {
  const snapshot = await loadGiveawayStudio();

  return (
    <GiveawayStudioFrame
      active="overview"
      title="Giveaway Studio"
      lead="Run tonight's prize drawing from one production workspace — no spreadsheets, no stress."
    >
      <GiveawayOverviewPanel snapshot={snapshot} />
    </GiveawayStudioFrame>
  );
}
