import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventStudioComingSoonPanel } from "@/components/ops/event-studio/EventStudioComingSoonPanel";
import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import {
  EVENT_STUDIO_PLANNED_GENERATORS,
  isPlannedGeneratorSlug,
} from "@/lib/ops/event-studio/planned-generators";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ tool: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params;
  if (!isPlannedGeneratorSlug(tool)) {
    return { title: "Create — Event Studio", robots: { index: false, follow: false } };
  }
  const generator = EVENT_STUDIO_PLANNED_GENERATORS[tool];
  return {
    title: `${generator.title} — Event Studio`,
    robots: { index: false, follow: false },
  };
}

export default async function EventStudioPlannedGeneratorPage({ params }: Props) {
  const { tool } = await params;
  if (!isPlannedGeneratorSlug(tool)) {
    notFound();
  }

  const binder = await loadProductionBinder();
  const generator = EVENT_STUDIO_PLANNED_GENERATORS[tool];

  return (
    <EventStudioShell
      active="create"
      snapshot={binder.snapshot}
      title={generator.title}
      lead={generator.lead}
    >
      <EventStudioComingSoonPanel
        title={generator.title}
        lead={generator.lead}
        relatedHref={generator.relatedHref}
        relatedLabel={generator.relatedLabel}
      />
    </EventStudioShell>
  );
}
