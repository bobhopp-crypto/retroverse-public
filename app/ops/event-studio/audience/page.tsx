import type { Metadata } from "next";

import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { EventStudioWorkflowBoard } from "@/components/ops/event-studio/EventStudioWorkflowBoard";
import { EVENT_STUDIO_AUDIENCE_ITEMS } from "@/lib/ops/event-studio/nav";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audience — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioAudiencePage() {
  const binder = await loadProductionBinder();

  return (
    <EventStudioShell
      active="audience"
      snapshot={binder.snapshot}
      title="Audience"
      lead="Registrations, emails, prize entries, and live drawing for this event."
    >
      <EventStudioWorkflowBoard
        title="Audience management"
        lead="Everything about the people attending or entering this show."
        items={EVENT_STUDIO_AUDIENCE_ITEMS}
      />
    </EventStudioShell>
  );
}
