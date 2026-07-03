import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GiveawaySettingsEditor } from "@/components/ops/event-studio/giveaway/GiveawaySettingsEditor";
import { GiveawayStudioFrame } from "@/components/ops/event-studio/giveaway/GiveawayStudioFrame";
import { loadGiveawayStudio } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings — Giveaway Studio",
  robots: { index: false, follow: false },
};

export default async function GiveawayStudioSettingsPage() {
  const snapshot = await loadGiveawayStudio();
  if (!snapshot.activeGiveaway) notFound();

  return (
    <GiveawayStudioFrame
      active="settings"
      title="Settings"
      lead="Giveaway status, rules, schedule, and registration URL."
    >
      <GiveawaySettingsEditor
        giveaway={snapshot.activeGiveaway}
        registrationUrl={snapshot.registrationUrl}
      />
    </GiveawayStudioFrame>
  );
}
