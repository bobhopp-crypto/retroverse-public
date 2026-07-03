import type { Metadata } from "next";

import { EventStudioCreatePanel } from "@/components/ops/event-studio/EventStudioCreatePanel";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { EVENT_STUDIO_CREATE_TOOLS } from "@/lib/ops/event-studio/nav";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioCreatePage() {
  const binder = await loadProductionBinder();

  return (
    <EventStudioShell
      active="create"
      snapshot={binder.snapshot}
      title="Create"
      lead="Generate artwork and pages for this event. Pass generation is live; other generators open as production panels."
    >
      <EventStudioCreatePanel tools={EVENT_STUDIO_CREATE_TOOLS} />
    </EventStudioShell>
  );
}
