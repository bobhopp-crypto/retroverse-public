import type { Metadata } from "next";

import { maybeAdvanceLiveChannel } from "@/lib/live-control/engine";
import {
  liveSongExperienceHref,
  shouldOpenSongExperienceDirect,
} from "@/lib/live-control/experience-route";
import { loadLiveControlState } from "@/lib/live-control/state";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { redirect } from "next/navigation";

import { RetroverseLive2View } from "./retroverse-live-2-view";

import "./retroverse-live-2.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retroverse 2.0 Live",
  description: "Command Center live music exploration for Retroverse.",
};

export default async function Retroverse2LivePage() {
  await maybeAdvanceLiveChannel();
  const [state, control] = await Promise.all([
    loadSundayNightsState(),
    loadLiveControlState(),
  ]);
  const current = await buildSundayNightsCurrentPayload(state, control);
  const onAir =
    current.live?.source === "bridge" ||
    current.live?.source === "channel" ||
    control.running;

  if (
    current.currentTrackId &&
    shouldOpenSongExperienceDirect({
      channelRunning: control.running,
      liveSource: current.live?.source,
    })
  ) {
    redirect(liveSongExperienceHref(current.currentTrackId));
  }

  const exploringTrack = onAir ? null : await loadTrackPage("Sweet Home Alabama");

  return <RetroverseLive2View initial={current} exploringTrack={exploringTrack} />;
}
