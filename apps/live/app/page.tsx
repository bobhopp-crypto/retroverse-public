import type { Metadata } from "next";

import { loadPublicCurrentSongPayload } from "@/lib/home/public-current-song";

import { RetroverseLive2View } from "./retroverse-2/live/retroverse-live-2-view";

import "./retroverse-2/live/retroverse-live-2.css";
import "./live-home.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Retroverse Live",
  description: "Press Play for the Past.",
};

/**
 * retroverse.live — public exploration homepage.
 * Live VDJ track when on air; recommended rotation when off air.
 */
export default async function HomePage() {
  const current = await loadPublicCurrentSongPayload();

  return (
    <RetroverseLive2View
      initial={current}
      shellClassName="rv2-live-home"
      activeNav="live"
      minimalHome
    />
  );
}
