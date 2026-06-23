import type { Metadata } from "next";

import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { LiveExperienceShell } from "@/components/live-experience/LiveExperienceShell";
import { buildLiveShellFromCurrent } from "@/lib/live-experience/shell-model";

import { SundayNightsView } from "./sunday-nights-view";

import "./sunday-nights.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retroverse Sunday Nights — The Main Pub",
  description:
    "A long-form listening session at The Main Pub, Fond du Lac. Chart history, connected artists, and live Now Playing updates.",
};

export default async function SundayNightsPage() {
  const state = await loadSundayNightsState();
  const current = await buildSundayNightsCurrentPayload(state);
  const shell = await buildLiveShellFromCurrent(current, "Live");
  const opsEnabled = isOpsEnabled();

  return (
    <LiveExperienceShell {...shell}>
      <SundayNightsView
        initialTrack={current.track}
        initialLive={current.live}
        initialDestination={current.destination}
        initialUpdatedAt={current.updatedAt}
        opsEnabled={opsEnabled}
      />
    </LiveExperienceShell>
  );
}
