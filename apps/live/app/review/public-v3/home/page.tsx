import { notFound } from "next/navigation";

import { loadTrackPage } from "@/lib/track/load-track-page";
import type { SundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";

import { RetroverseLive2View } from "@/app/retroverse-2/live/retroverse-live-2-view";

import "@/app/retroverse-2/live/retroverse-live-2.css";
import "@/app/live-home.css";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ rvtr?: string }>;
};

export default async function PublicV3HomepageReview({ searchParams }: Props) {
  if (process.env.NODE_ENV === "production") notFound();

  const { rvtr } = await searchParams;
  if (!rvtr || !/^RVTR\d{6}$/i.test(rvtr)) notFound();

  const track = await loadTrackPage(rvtr);
  if (!track) notFound();

  const now = new Date().toISOString();
  const initial: SundayNightsCurrentPayload = {
    currentTrackId: track.rvtr,
    live: null,
    updatedAt: now,
    track,
    destination: { kind: "EXPERIENCE", href: `/retroverse-2/song/${track.rvtr}` },
    channel: null,
    publicState: {
      version: 2,
      source: "recommendation",
      servedAt: now,
    },
  };

  return (
    <RetroverseLive2View
      initial={initial}
      shellClassName="rv2-live-home"
      activeNav="live"
      minimalHome
    />
  );
}
