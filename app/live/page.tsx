import type { Metadata } from "next";

import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

import { LiveNowPlayingView } from "./live-now-playing";

import "./live.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Now Playing — Retroverse",
  description: "Live now playing at Retroverse Sunday Nights.",
};

export default async function LivePage() {
  const state = await loadSundayNightsState();
  const initial = await buildSundayNightsCurrentPayload(state);

  return <LiveNowPlayingView initial={initial} />;
}
