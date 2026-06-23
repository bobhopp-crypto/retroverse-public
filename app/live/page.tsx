import type { Metadata } from "next";

import { maybeAdvanceLiveChannel } from "@/lib/live-control/engine";
import {
  liveSongExperienceHref,
  shouldOpenSongExperienceDirect,
} from "@/lib/live-control/experience-route";
import { loadLiveControlState } from "@/lib/live-control/state";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { redirect } from "next/navigation";

import { LiveNowPlayingView } from "./live-now-playing";

import "./live.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Now Playing — Retroverse",
  description: "Live now playing at Retroverse Sunday Nights.",
};

export default async function LivePage() {
  await maybeAdvanceLiveChannel();
  const [state, control] = await Promise.all([
    loadSundayNightsState(),
    loadLiveControlState(),
  ]);
  const initial = await buildSundayNightsCurrentPayload(state, control);

  if (
    initial.currentTrackId &&
    shouldOpenSongExperienceDirect({
      channelRunning: control.running,
      liveSource: initial.live?.source,
    })
  ) {
    redirect(liveSongExperienceHref(initial.currentTrackId));
  }

  return <LiveNowPlayingView initial={initial} />;
}
