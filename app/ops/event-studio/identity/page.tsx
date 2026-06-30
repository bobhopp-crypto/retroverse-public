import type { Metadata } from "next";

import { EventStudioIdentityPanel } from "@/components/ops/event-studio/EventStudioIdentityPanel";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Identity — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioIdentityPage() {
  const binder = await loadProductionBinder();

  return (
    <EventStudioShell
      active="identity"
      snapshot={binder.snapshot}
      title="Identity"
      lead="The source of truth for this event — every generator inherits from here."
    >
      <EventStudioIdentityPanel identity={binder.identity} />
    </EventStudioShell>
  );
}
