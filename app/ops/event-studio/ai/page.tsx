import type { Metadata } from "next";

import { EventStudioPlaceholderPanel } from "@/components/ops/event-studio/EventStudioPlaceholderPanel";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadEventStudioSnapshot } from "@/lib/ops/event-studio/load-event-snapshot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioAiPage() {
  const snapshot = await loadEventStudioSnapshot();

  return (
    <EventStudioShell
      active="ai"
      snapshot={snapshot}
      title="AI"
      lead="Prompt profiles and reference material for event artwork generation."
    >
      <EventStudioPlaceholderPanel
        title="AI prompt profiles"
        lead="Future storage for generation profiles scoped to this event."
        bullets={["Prompt Profile", "Negative Prompt", "Style Profile", "Reference Images"]}
      />
    </EventStudioShell>
  );
}
