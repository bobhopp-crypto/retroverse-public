import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventProducerPanel } from "@/components/ops/event-studio/producer/EventProducerPanel";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";
import { listEventProducerDrafts } from "@/lib/ops/event-studio/producer/store";
import { loadProducerWorkflow } from "@/lib/ops/event-studio/producer/workflow";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

import "@/app/ops/ops.css";
import "@/app/ops/event-studio/event-studio.css";
import "@/app/ops/event-studio/producer/producer.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event Producer — BobOS",
  robots: { index: false, follow: false },
};

export default async function BobosProducerPage() {
  if (!shouldAllowOpsRoutes()) notFound();

  const [binder, drafts, workflow] = await Promise.all([
    loadProductionBinder(),
    listEventProducerDrafts(),
    loadProducerWorkflow(),
  ]);

  return (
    <EventStudioShell
      active="producer"
      snapshot={binder.snapshot}
      title="Event Producer"
      lead="Describe the show once. Sunday flow: Passes → Giveaway → Homepage."
    >
      <EventProducerPanel initialDrafts={drafts} initialWorkflow={workflow} />
    </EventStudioShell>
  );
}
