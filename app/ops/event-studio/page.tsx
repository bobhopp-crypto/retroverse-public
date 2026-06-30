import type { Metadata } from "next";

import { EventStudioOverview } from "@/components/ops/event-studio/EventStudioOverview";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioOverviewPage() {
  const binder = await loadProductionBinder();

  return (
    <EventStudioShell
      active="overview"
      snapshot={binder.snapshot}
      title="Overview"
      lead="Mission dashboard for this show — progress, checklist, and production shortcuts."
    >
      <EventStudioOverview binder={binder} />
    </EventStudioShell>
  );
}
