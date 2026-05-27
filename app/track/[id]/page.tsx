import type { Metadata } from "next";

import { loadTrackPage } from "@/lib/track/load-track-page";
import type { TrackPageData } from "@/lib/track/load-track-page";

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

function fallbackTrackPageData(idParam: string): TrackPageData {
  const raw = decodeURIComponent(idParam).trim();
  const isRvtr = /^RVTR\d{6}$/i.test(raw);
  const rvtr = isRvtr ? raw.toUpperCase() : raw.toUpperCase();

  const title = raw
    ? raw
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "Unknown recording";

  const artistName = "Unknown artist";
  const artistSlug = "unknown-artist";

  return {
    rvtr,
    title,
    artistName,
    artistSlug,
    artistHref: `/search?q=${encodeURIComponent(title)}`,
    releaseYear: null,
    peakHot100: null,
    chartWeeks: 0,
    firstChartDate: null,
    coverUrl: null,
    hasHot100: false,
    hasVdjMedia: false,
    albums: [],
    trajectoryWeeks: [],
    chartRunLabel: "Hot 100",
    relatedTracks: [],
    rvYearHref: null,
  };
}

export default async function TrackPage({ params }: Props) {
  const { id } = await params;
  const data = await loadTrackPage(id);
  return <TrackPageView data={data ?? fallbackTrackPageData(id)} />;
}
