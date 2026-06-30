import type { Metadata } from "next";

import { EventStudioOverview } from "@/components/ops/event-studio/EventStudioOverview";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadEventStudioSnapshot } from "@/lib/ops/event-studio/load-event-snapshot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioOverviewPage() {
  const snapshot = await loadEventStudioSnapshot();

  return (
    <EventStudioShell
      active="overview"
      snapshot={snapshot}
      title="Overview"
      lead="One event owns landing pages, passes, social graphics, giveaways, and AI profiles."
    >
      <EventStudioOverview snapshot={snapshot} />
    </EventStudioShell>
  );
}
