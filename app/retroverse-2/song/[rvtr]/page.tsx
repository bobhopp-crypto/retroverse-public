import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LiveChannelFollower } from "@/components/live-channel/LiveChannelFollower";
import { PublicSongExperience } from "@/components/retroverse/PublicSongExperience";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { loadTrackPage } from "@/lib/track/load-track-page";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const track = await loadTrackPage(rvtr);
  return {
    title: track ? `${track.title} — Retroverse` : "Song — Retroverse",
    description: track
      ? `${track.title} by ${track.artistName} — chart journey, story, and discovery.`
      : undefined,
  };
}

function trackYear(track: NonNullable<Awaited<ReturnType<typeof loadTrackPage>>>): number | null {
  if (track.releaseYear) return track.releaseYear;
  const fromChart = track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : NaN;
  if (Number.isFinite(fromChart) && fromChart > 0) return fromChart;
  return track.albums[0]?.releaseYear ?? null;
}

export default async function Retroverse2SongPage({ params }: Props) {
  const { rvtr } = await params;
  const track = await loadTrackPage(rvtr);
  if (!track) notFound();

  const year = trackYear(track);

  return (
    <Rv2PublicShell
      className="rv2-song"
      yearsHref={track.rvYearHref ?? (year ? `/rv/${year}` : "/search")}
      lead={<LiveChannelFollower rvtr={track.rvtr} />}
    >
      <PublicSongExperience rvtr={track.rvtr} />
    </Rv2PublicShell>
  );
}
