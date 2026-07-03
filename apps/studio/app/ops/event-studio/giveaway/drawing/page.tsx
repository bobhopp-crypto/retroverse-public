import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GiveawayDrawingStage } from "@/components/ops/event-studio/giveaway/GiveawayDrawingStage";
import { GiveawayStudioFrame } from "@/components/ops/event-studio/giveaway/GiveawayStudioFrame";
import { loadGiveawayDrawingContext } from "@/lib/ops/event-studio/giveaway/draw";
import { slugifyEventKey } from "@/lib/ops/event-studio/giveaway/event-key";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Drawing — Giveaway Studio",
  robots: { index: false, follow: false },
};

export default async function GiveawayStudioDrawingPage() {
  const eventConfig = await loadEventControlConfig();
  const eventKey = slugifyEventKey(eventConfig.event.title);
  const context = await loadGiveawayDrawingContext(eventKey);
  if (!context.active) notFound();

  return (
    <GiveawayStudioFrame
      active="drawing"
      title="Drawing"
      lead="One button. One winner. Built for a busy room."
      workspace
    >
      <GiveawayDrawingStage
        giveaway={context.active}
        eligibleCount={context.eligibleCount}
        currentDraw={context.currentDraw}
        currentWinner={context.currentWinner}
      />
    </GiveawayStudioFrame>
  );
}
