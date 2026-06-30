import type { Metadata } from "next";

import { EventStudioPlaceholderPanel } from "@/components/ops/event-studio/EventStudioPlaceholderPanel";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadEventStudioSnapshot } from "@/lib/ops/event-studio/load-event-snapshot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giveaway — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioGiveawayPage() {
  const snapshot = await loadEventStudioSnapshot();

  return (
    <EventStudioShell
      active="giveaway"
      snapshot={snapshot}
      title="Giveaway"
      lead="Prize drawing and entry management for live events."
    >
      <EventStudioPlaceholderPanel
        title="Giveaway desk"
        lead="Future home for prize setup, entries, winner selection, and drawing controls."
        bullets={["Prize", "Entries", "Winner", "Drawing"]}
      />
    </EventStudioShell>
  );
}
