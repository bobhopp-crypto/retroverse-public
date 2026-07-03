import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PresentationStudio } from "@/components/bobos/presentation/PresentationStudio";
import {
  buildPlayheadPayload,
  listPresentations,
  loadPresentationState,
} from "@/lib/bobos/presentation/store";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Presentation Studio — BobOS",
  robots: { index: false, follow: false },
};

export default async function PresentationStudioPage() {
  if (!shouldAllowOpsRoutes()) notFound();

  const [presentations, state, playhead] = await Promise.all([
    listPresentations(),
    loadPresentationState(),
    buildPlayheadPayload(),
  ]);

  return (
    <PresentationStudio
      initialPresentations={presentations}
      initialOnAirId={state.activePresentationId}
      initialPlayhead={playhead}
    />
  );
}
