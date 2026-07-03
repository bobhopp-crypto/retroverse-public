import type { Metadata } from "next";

import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { EventStudioWorkflowBoard } from "@/components/ops/event-studio/EventStudioWorkflowBoard";
import { EVENT_STUDIO_PUBLISH_ITEMS } from "@/lib/ops/event-studio/nav";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publish — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioPublishPage() {
  const binder = await loadProductionBinder();

  return (
    <EventStudioShell
      active="publish"
      snapshot={binder.snapshot}
      title="Publish"
      lead="Ship approved artwork to landing pages, social channels, and printable packages."
    >
      <EventStudioWorkflowBoard
        title="Publish destinations"
        lead="When artwork is approved in Assets, publish it from here."
        items={EVENT_STUDIO_PUBLISH_ITEMS}
      />
    </EventStudioShell>
  );
}
