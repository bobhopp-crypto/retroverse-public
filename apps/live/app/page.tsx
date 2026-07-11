import type { Metadata } from "next";

import { resolveHomepageRvtr } from "@/lib/home/homepage-rvtr";
import { loadLiveControlState } from "@/lib/live-control/state";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { loadTrackPage } from "@/lib/track/load-track-page";

import { RetroverseLive2View } from "./retroverse-2/live/retroverse-live-2-view";

import "./retroverse-2/live/retroverse-live-2.css";
import "./live-home.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retroverse Live",
  description: "Press Play for the Past.",
};

/**
 * retroverse.live — public exploration homepage.
 * Live VDJ track when on air; recommended rotation when off air.
 */
export default async function HomePage() {
  const [state, control, homepage] = await Promise.all([
    loadSundayNightsState(),
    loadLiveControlState(),
    resolveHomepageRvtr(),
  ]);
  const current = await buildSundayNightsCurrentPayload(state, control);

  const onAir =
    (current.live?.source === "bridge" && Boolean(current.live.title?.trim())) ||
    current.live?.source === "channel" ||
    control.running;

  let exploringTrack = null;
  if (!onAir) {
    const offAirRvtr = homepage.rvtr;
    if (offAirRvtr) {
      exploringTrack = await loadTrackPage(offAirRvtr);
    }
    if (!exploringTrack) {
      exploringTrack = await loadTrackPage("Sweet Home Alabama");
    }
  }

  return (
    <RetroverseLive2View
      initial={current}
      exploringTrack={exploringTrack}
      shellClassName="rv2-live-home"
      activeNav="live"
    />
  );
}
