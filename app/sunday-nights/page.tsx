import type { Metadata } from "next";

import { loadTrackPage } from "@/lib/track/load-track-page";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

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
  const track = state.currentTrackId
    ? await loadTrackPage(state.currentTrackId)
    : null;

  return (
    <SundayNightsView initialTrack={track} initialUpdatedAt={state.updatedAt} />
  );
}
