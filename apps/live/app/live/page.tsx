import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPublicLiveRedirectUrl } from "@/lib/live-control/public-entry";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadLiveControlState } from "@/lib/live-control/state";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

import { LiveNowPlayingView } from "./live-now-playing";

import "./live.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Now Playing — Retroverse",
  description: "Live now playing at Retroverse Sunday Nights.",
};

export default async function LivePage() {
  const liveRedirect = await getPublicLiveRedirectUrl();
  if (liveRedirect) {
    redirect(liveRedirect);
  }

  const [state, control] = await Promise.all([
    loadSundayNightsState(),
    loadLiveControlState(),
  ]);
  const initial = await buildSundayNightsCurrentPayload(state, control);

  return <LiveNowPlayingView initial={initial} />;
}
