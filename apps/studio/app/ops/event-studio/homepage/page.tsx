import type { Metadata } from "next";

import { EventStudioHomepagePreviewPanel } from "@/components/ops/event-studio/EventStudioHomepagePreviewPanel";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";
import { loadEventStudioHomepagePreview } from "@/lib/ops/event-studio/producer/homepage-preview";

import "../event-studio.css";
import "./homepage.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Homepage — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioHomepagePage() {
  const [binder, preview] = await Promise.all([
    loadProductionBinder(),
    loadEventStudioHomepagePreview(),
  ]);

  return (
    <EventStudioShell
      active="homepage"
      snapshot={binder.snapshot}
      title="Homepage"
      lead="Sunday public homepage preview from the Producer plan."
    >
      <EventStudioHomepagePreviewPanel preview={preview} />
    </EventStudioShell>
  );
}
