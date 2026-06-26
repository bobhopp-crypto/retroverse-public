import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AttractTourExperience } from "@/components/retroverse/experience/AttractTourExperience";
import { LivingSongExperience } from "@/components/retroverse/experience/LivingSongExperience";
import { LivingSongShell } from "@/components/retroverse/experience/LivingSongShell";
import { RetroverseVideoPlayer } from "@/components/retroverse/experience/RetroverseVideoPlayer";
import { LiveChannelFollower } from "@/components/live-channel/LiveChannelFollower";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { isUsableChartHistory } from "@/lib/artist/chart-history";
import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { loadRvYearChartHistory } from "@/lib/artist/load-chart-history";
import {
  buildRvYearDestination,
  enrichRvYearDestination,
} from "@/lib/rv-year/enrich-rv-year-destination";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import type { RvYearDestination } from "@/lib/rv-year/rv-year-destination";
import { resolveTrackPlayback } from "@/lib/playback/resolve-track-playback";
import { toPlaybackManifest } from "@/lib/playback/types";
import { loadPatronSongExperience } from "@/lib/retroverse/experience/load-patron-experience";
import { loadSongControlPackage, songControlData } from "@/lib/retroverse-2/song-control";
import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";

import "./retroverse-song-2.css";

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

function titleCaseName(name: string): string {
  return name.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function trackYear(track: TrackPageData): number | null {
  if (track.releaseYear) return track.releaseYear;
  const fromChart = track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : NaN;
  if (Number.isFinite(fromChart) && fromChart > 0) return fromChart;
  return track.albums[0]?.releaseYear ?? null;
}

async function yearDestination(track: TrackPageData): Promise<RvYearDestination | null> {
  const year = trackYear(track);
  if (!year) return null;
  const history = await loadRvYearChartHistory(year);
  if (!history || !isUsableChartHistory(history)) return null;
  return enrichRvYearDestination(buildRvYearDestination(history, year));
}

export default async function Retroverse2SongPage({ params }: Props) {
  const { rvtr } = await params;
  const track = await loadTrackPage(rvtr);
  if (!track) notFound();

  const [artist, destination, playback, controlPackage] = await Promise.all([
    loadArtistPage(track.artistSlug),
    yearDestination(track),
    resolveTrackPlayback(track.rvtr, { title: track.title, artist: track.artistName }),
    loadSongControlPackage(track),
  ]);

  const control = songControlData(controlPackage);
  const year = trackYear(track);
  const opsEnabled = isOpsEnabled();
  const playbackManifest = toPlaybackManifest(playback);
  const patron = await loadPatronSongExperience({
    track,
    pkg: controlPackage,
    control,
    artist,
    destination,
    releaseYear: year,
    lengthHint: control.facts?.length ?? null,
  });

  const storyScore = patron.experience.chapters.filter((chapter) => chapter.kind === "story").length;
  const eraExhibit = patron.eraExhibit;

  return (
    <Rv2PublicShell
      className="rv2-song"
      yearsHref={track.rvYearHref ?? (year ? `/rv/${year}` : "/search")}
      lead={<LiveChannelFollower rvtr={track.rvtr} />}
    >
      <LivingSongShell
        rvtr={track.rvtr}
        durationSec={patron.living.durationSec}
        storyScore={storyScore}
        openingKind={patron.experience.director.openingKind}
      >
        <section className="rv2-song__hero" aria-label="Song overview">
          <div className="rv2-song__hero-top">
            <div className="rv2-song__hero-copy">
              {eraExhibit ? (
                <p className="rv2-song__exhibit-kicker">
                  {eraExhibit.eraName} · {eraExhibit.eraYears}
                </p>
              ) : null}
              <h1>{track.title}</h1>
              <p className="rv2-song__artist">{titleCaseName(track.artistName)}</p>
              {year ? <p className="rv2-song__year">{year}</p> : null}
              {eraExhibit?.atmosphereDescription ? (
                <p className="rv2-song__exhibit-atmosphere">{eraExhibit.atmosphereDescription}</p>
              ) : null}
              {eraExhibit?.artifactReference ? (
                <p className="rv2-song__exhibit-artifact">{eraExhibit.artifactReference}</p>
              ) : null}
            </div>
            {opsEnabled ? (
              <div className="rv2-song__hero-flags">
                <Link href={`/retroverse-2/song/${track.rvtr}/data`} className="rv2-song__data-button">
                  Edit
                </Link>
              </div>
            ) : null}
          </div>

          <RetroverseVideoPlayer
            posterUrl={track.coverUrl}
            title={track.title}
            playback={playbackManifest}
            className="rv2-song__video-player"
            syncPlayback
          />
        </section>

        <AttractTourExperience
          patron={patron}
          hero={{
            title: track.title,
            artist: track.artistName,
            year,
            coverUrl: track.coverUrl,
          }}
          eraArtifact={eraExhibit?.artifactReference ?? null}
        />

        <LivingSongExperience experience={patron.experience} plan={patron.living} />
      </LivingSongShell>
    </Rv2PublicShell>
  );
}
