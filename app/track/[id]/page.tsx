import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isSundayEventModeEnabled } from "@/lib/sunday-nights/event-mode";
import { loadTrackPage } from "@/lib/track/load-track-page";

import { TrackPageView } from "./track-page-view";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await loadTrackPage(id);
  return {
    title: data ? `${data.title} — ${data.artistName} — RetroVerse` : "Song — RetroVerse",
    description: data
      ? `${data.title} by ${data.artistName} — song journey, chart history, and albums in RetroVerse.`
      : undefined,
  };
}

export default async function TrackPage({ params }: Props) {
  const { id } = await params;
  const [data, sundayEventActive] = await Promise.all([
    loadTrackPage(id),
    isSundayEventModeEnabled(),
  ]);
  if (!data) notFound();
  return <TrackPageView data={data} sundayEventActive={sundayEventActive} />;
}
