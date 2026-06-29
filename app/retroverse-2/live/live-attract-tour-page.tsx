import { redirect } from "next/navigation";

import { getPublicLiveRedirectUrl } from "@/lib/live-control/public-entry";
import { loadLiveControlState } from "@/lib/live-control/state";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { loadTrackPage } from "@/lib/track/load-track-page";

import { RetroverseLive2View } from "./retroverse-live-2-view";

import "./retroverse-live-2.css";

/** Shared Live Attract Tour entry — homepage, /index, and /retroverse-2/live. */
export async function LiveAttractTourPage() {
  const liveRedirect = await getPublicLiveRedirectUrl();
  if (liveRedirect) {
    redirect(liveRedirect);
  }

  const [state, control] = await Promise.all([
    loadSundayNightsState(),
    loadLiveControlState(),
  ]);
  const current = await buildSundayNightsCurrentPayload(state, control);
  const onAir =
    current.live?.source === "bridge" ||
    current.live?.source === "channel" ||
    control.running;

  const exploringTrack = onAir ? null : await loadTrackPage("Sweet Home Alabama");

  return <RetroverseLive2View initial={current} exploringTrack={exploringTrack} />;
}
