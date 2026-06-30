import type { Metadata } from "next";

import { EventProducerPanel } from "@/components/ops/event-studio/producer/EventProducerPanel";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";
import { listEventProducerDrafts } from "@/lib/ops/event-studio/producer/store";

import "./producer.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event Producer — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventProducerPage() {
  const [binder, drafts] = await Promise.all([loadProductionBinder(), listEventProducerDrafts()]);

  return (
    <EventStudioShell
      active="create"
      snapshot={binder.snapshot}
      title="Event Producer"
      lead="Describe the show in plain English. Local Ollama turns your brief into a structured draft plan and module recommendations."
    >
      <EventProducerPanel initialDrafts={drafts} />
    </EventStudioShell>
  );
}
