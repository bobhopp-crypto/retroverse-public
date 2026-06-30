import type { Metadata } from "next";

import { EventStudioArchiveList } from "@/components/ops/event-studio/EventStudioArchiveList";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { EVENT_STUDIO_ARCHIVE_EXAMPLES } from "@/lib/ops/event-studio/nav";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";
import type { EventStudioArchiveEntry } from "@/lib/ops/event-studio/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Archive — Event Studio",
  robots: { index: false, follow: false },
};

function buildArchiveEntries(currentEventName: string): EventStudioArchiveEntry[] {
  const current: EventStudioArchiveEntry = {
    id: "current",
    name: currentEventName,
    status: "current",
  };
  const examples = EVENT_STUDIO_ARCHIVE_EXAMPLES.filter(
    (name) => name.toLowerCase() !== currentEventName.toLowerCase(),
  ).map((name) => ({
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    status: "planned" as const,
  }));

  return [current, ...examples];
}

export default async function EventStudioArchivePage() {
  const binder = await loadProductionBinder();
  const entries = buildArchiveEntries(binder.snapshot.eventName);

  return (
    <EventStudioShell
      active="archive"
      snapshot={binder.snapshot}
      title="Archive"
      lead="Previous shows and future binders — one production binder per event."
    >
      <EventStudioArchiveList entries={entries} currentEventName={binder.snapshot.eventName} />
    </EventStudioShell>
  );
}
