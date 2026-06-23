import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { trackPageHref } from "@/lib/search/entity-routes";
import { loadTrackPage } from "@/lib/track/load-track-page";

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

/** Legacy track route — redirect to canonical Song Experience. */
export default async function TrackPage({ params }: Props) {
  const { id } = await params;
  const data = await loadTrackPage(id);
  if (!data) notFound();
  redirect(trackPageHref(data.rvtr));
}
