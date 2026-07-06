import type { Metadata } from "next";

import { LiveChannelFollower } from "@/components/live-channel/LiveChannelFollower";
import { PublicSongExperience } from "@/components/retroverse/PublicSongExperience";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { UniversalRenderer } from "@/components/universal-renderer/UniversalRenderer";
import { resolveCanonicalSongExperience } from "@/lib/retroverse/experience/resolve-canonical-song";
import { loadTrackPage } from "@/lib/track/load-track-page";

import "./retroverse-song-empty.css";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const resolution = await resolveCanonicalSongExperience(rvtr);

  if (resolution.tier === "graph") {
    const { track } = resolution;
    return {
      title: `${track.title} — Retroverse`,
      description: `${track.title} by ${track.artistName} — chart journey, story, and discovery.`,
    };
  }

  if (resolution.tier === "package" || resolution.tier === "vdj") {
    const { payload } = resolution;
    return {
      title: `${payload.title} — ${payload.artist} — Retroverse`,
      description: `${payload.title} by ${payload.artist}${payload.year ? ` (${payload.year})` : ""} — a curated mobile experience on Retroverse.`,
    };
  }

  return { title: "Song — Retroverse" };
}

function trackYear(track: NonNullable<Awaited<ReturnType<typeof loadTrackPage>>>): number | null {
  if (track.releaseYear) return track.releaseYear;
  const fromChart = track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : NaN;
  if (Number.isFinite(fromChart) && fromChart > 0) return fromChart;
  return track.albums[0]?.releaseYear ?? null;
}

/**
 * Canonical Song Experience — every live entry point (VDJ Auto Follow, Live
 * Channel, current-song links, Runtime) resolves here.
 *
 * Renders the richest content already generated for the RVTR:
 *   graph (Postgres + patron experience) → package (any status) → VDJ
 *   library entry → honest empty state. Never a blank 404.
 */
export default async function Retroverse2SongPage({ params }: Props) {
  const { rvtr } = await params;
  const resolution = await resolveCanonicalSongExperience(rvtr);

  if (resolution.tier === "graph") {
    const { track } = resolution;
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

  if (resolution.tier === "package" || resolution.tier === "vdj") {
    const { payload } = resolution;
    return (
      <>
        <LiveChannelFollower rvtr={payload.rvtr} />
        <UniversalRenderer
          artist={payload.artist}
          title={payload.title}
          cards={payload.cards}
          theme={payload.theme}
        />
      </>
    );
  }

  return (
    <main className="rv-song-empty">
      <p className="rv-song-empty__eyebrow">Retroverse</p>
      <h1 className="rv-song-empty__title">This song is on its way</h1>
      <p className="rv-song-empty__body">
        {resolution.rvtr} hasn&apos;t been added to the Retroverse library yet.
      </p>
      <a className="rv-song-empty__cta" href="/search">
        Search Retroverse
      </a>
    </main>
  );
}
