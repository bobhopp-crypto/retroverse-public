import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { loadJukeboxOperatorStatus } from "@/lib/song-requests/jukebox-local-store";

import { JukeboxOperatorPanel } from "./JukeboxOperatorPanel";

import "./jukebox-operator.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Video Jukebox — BobOS",
  robots: { index: false, follow: false },
};

export default async function JukeboxOperatorPage() {
  if (!isOpsEnabled()) notFound();
  const initialStatus = await loadJukeboxOperatorStatus().catch(() => null);
  return <JukeboxOperatorPanel initialStatus={initialStatus} />;
}
