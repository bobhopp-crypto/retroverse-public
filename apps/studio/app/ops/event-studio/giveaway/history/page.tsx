import type { Metadata } from "next";

import { GiveawayHistoryBoard } from "@/components/ops/event-studio/giveaway/GiveawayHistoryBoard";
import { GiveawayStudioFrame } from "@/components/ops/event-studio/giveaway/GiveawayStudioFrame";
import { loadGiveawayStudio } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "History — Giveaway Studio",
  robots: { index: false, follow: false },
};

export default async function GiveawayStudioHistoryPage() {
  const snapshot = await loadGiveawayStudio();

  return (
    <GiveawayStudioFrame
      active="history"
      title="History"
      lead="Every draw, every winner, every claim status — stored automatically."
    >
      <GiveawayHistoryBoard snapshot={snapshot} />
    </GiveawayStudioFrame>
  );
}
