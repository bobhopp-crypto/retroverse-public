import type { Metadata } from "next";

import { EventStudioIdentityPanel } from "@/components/ops/event-studio/EventStudioIdentityPanel";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";
import { getActiveProducerDraft } from "@/lib/ops/event-studio/producer/producer-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Identity — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioIdentityPage() {
  const [binder, activeDraft] = await Promise.all([
    loadProductionBinder(),
    getActiveProducerDraft(),
  ]);

  return (
    <EventStudioShell
      active="identity"
      snapshot={binder.snapshot}
      title="Identity"
      lead="Read-only view of the producer plan. Generators inherit these settings automatically."
    >
      <EventStudioIdentityPanel identity={binder.identity} fromProducer={Boolean(activeDraft)} />
    </EventStudioShell>
  );
}
