import type { Metadata } from "next";

import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { EventStudioToolGrid } from "@/components/ops/event-studio/EventStudioToolGrid";
import { EVENT_STUDIO_PRINT_TOOLS } from "@/lib/ops/event-studio/nav";
import { loadEventStudioSnapshot } from "@/lib/ops/event-studio/load-event-snapshot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Print — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioPrintPage() {
  const snapshot = await loadEventStudioSnapshot();

  return (
    <EventStudioShell
      active="print"
      snapshot={snapshot}
      title="Print"
      lead="Passes, posters, table cards, and certificates for the venue."
    >
      <EventStudioToolGrid cards={EVENT_STUDIO_PRINT_TOOLS} />
    </EventStudioShell>
  );
}
