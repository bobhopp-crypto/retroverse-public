import type { Metadata } from "next";

import { EventStudioPlaceholderPanel } from "@/components/ops/event-studio/EventStudioPlaceholderPanel";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadEventStudioSnapshot } from "@/lib/ops/event-studio/load-event-snapshot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Branding — Event Studio",
  robots: { index: false, follow: false },
};

export default async function EventStudioBrandingPage() {
  const snapshot = await loadEventStudioSnapshot();

  return (
    <EventStudioShell
      active="branding"
      snapshot={snapshot}
      title="Branding"
      lead="Event look-and-feel controls will live here."
    >
      <EventStudioPlaceholderPanel
        title="Branding controls"
        lead="Future controls for colors, fonts, illustration style, and prompt profiles tied to this event."
        bullets={["Colors", "Fonts", "Illustration style", "Prompt profile"]}
      />
    </EventStudioShell>
  );
}
