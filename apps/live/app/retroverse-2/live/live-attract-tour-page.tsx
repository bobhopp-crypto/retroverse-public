import { redirect } from "next/navigation";

import { loadPublicCurrentSongPayload } from "@/lib/home/public-current-song";
import { getPublicLiveRedirectUrl } from "@/lib/live-control/public-entry";

import { RetroverseLive2View } from "./retroverse-live-2-view";

import "./retroverse-live-2.css";

/** Live attract tour entry — /retroverse-2/live only (not the public homepage). */
export async function LiveAttractTourPage() {
  const liveRedirect = await getPublicLiveRedirectUrl();
  if (liveRedirect) {
    redirect(liveRedirect);
  }

  const current = await loadPublicCurrentSongPayload();
  return <RetroverseLive2View initial={current} />;
}
