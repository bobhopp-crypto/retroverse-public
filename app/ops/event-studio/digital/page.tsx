import type { Metadata } from "next";

import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { EventStudioToolGrid } from "@/components/ops/event-studio/EventStudioToolGrid";
import { EVENT_STUDIO_DIGITAL_TOOLS } from "@/lib/ops/event-studio/nav";
import { loadEventStudioSnapshot } from "@/lib/ops/event-studio/load-event-snapshot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Digital — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioDigitalPage() {
  const snapshot = await loadEventStudioSnapshot();

  return (
    <EventStudioShell
      active="digital"
      snapshot={snapshot}
      title="Digital"
      lead="Landing pages, social graphics, now playing, and registration."
    >
      <EventStudioToolGrid cards={EVENT_STUDIO_DIGITAL_TOOLS} />
    </EventStudioShell>
  );
}
