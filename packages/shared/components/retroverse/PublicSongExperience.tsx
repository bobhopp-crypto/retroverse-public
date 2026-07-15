import Link from "next/link";

import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import { LivingSongExperience } from "@/components/retroverse/experience/LivingSongExperience";
import { LivingSongShell } from "@/components/retroverse/experience/LivingSongShell";
import { ChartJourney } from "@/components/retroverse/experience/ChartJourney";
import { isUsableChartHistory } from "@/lib/artist/chart-history";
import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { loadRvYearChartHistory } from "@/lib/artist/load-chart-history";
import {
  buildRvYearDestination,
  enrichRvYearDestination,
} from "@/lib/rv-year/enrich-rv-year-destination";
import type { RvYearDestination } from "@/lib/rv-year/rv-year-destination";
import { loadPatronSongExperience } from "@/lib/retroverse/experience/load-patron-experience";
import { loadSongControlPackage, songControlData } from "@/lib/retroverse-2/song-control";
import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";

import "@/app/retroverse-2/song/[rvtr]/retroverse-song-2.css";

type Props = {
  rvtr: string;
  className?: string;
};

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

export async function PublicSongExperience({ rvtr, className }: Props) {
  const track = await loadTrackPage(rvtr);
  if (!track) {
    return (
      <p className="home-v1__error">No published package for that song yet.</p>
    );
  }

  const [artist, destination, controlPackage] = await Promise.all([
    loadArtistPage(track.artistSlug),
    yearDestination(track),
    loadSongControlPackage(track),
  ]);

  const control = songControlData(controlPackage);
  const year = trackYear(track);
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
  const primaryAlbum = track.albums[0] ?? null;
  const journeyWeeks = track.trajectoryWeeks.length;
  const chartChapter = patron.experience.chapters.find(
    (chapter): chapter is Extract<(typeof patron.experience.chapters)[number], { kind: "chart_journey" }> =>
      chapter.kind === "chart_journey",
  );
  return (
    <div className={className}>
      <LivingSongShell
        rvtr={track.rvtr}
        durationSec={patron.living.durationSec}
        storyScore={storyScore}
        openingKind={patron.experience.director.openingKind}
      >
        <header className="rv2-song__header" aria-label="Song overview">
          <RetroverseBack fallbackHref="/search" fallbackLabel="Search" />
          <p className="rv2-live__eyebrow">Song</p>
          <h1>{track.title}</h1>
          <p className="rv2-song__artist">
            <Link href={track.artistHref} prefetch className="rv2-song__hero-link">
              {track.artistName}
            </Link>
          </p>
          {primaryAlbum ? (
            <p className="rv2-song__album">
              <span>Album</span>
              {primaryAlbum.href ? (
                <Link href={primaryAlbum.href} prefetch className="rv2-song__hero-link">
                  {primaryAlbum.title}
                </Link>
              ) : (
                primaryAlbum.title
              )}
            </p>
          ) : null}
          {year ? (
            <p className="rv2-song__year">
              {track.rvYearHref ? (
                <Link href={track.rvYearHref} prefetch className="rv2-song__hero-link">
                  {year}
                </Link>
              ) : (
                year
              )}
            </p>
          ) : null}
          {journeyWeeks > 0 ? (
            <p className="rv2-song__hero-summary">
              A complete Chart Journey in {journeyWeeks} {journeyWeeks === 1 ? "week" : "weeks"}.
            </p>
          ) : null}
          <nav className="rv2-song__explore-links" aria-label="Explore this song">
            {primaryAlbum?.href ? (
              <Link href={primaryAlbum.href} prefetch>Album</Link>
            ) : null}
            <Link href={track.artistHref} prefetch>Artist</Link>
            {track.rvYearHref && year ? (
              <Link href={track.rvYearHref} prefetch>Year {year}</Link>
            ) : null}
          </nav>
        </header>
        {journeyWeeks > 0 ? (
          <div className="rv2-song__journey-stage">
            <ChartJourney
              weeks={track.trajectoryWeeks}
              peak={track.peakHot100}
              chartLabel={track.chartRunLabel}
              focusTrackId={track.rvtr}
              releaseYear={year}
              summary={chartChapter?.summary ?? null}
              hideTimeline
              variant="rv2"
              className="rv2-song__chart-journey"
            />
          </div>
        ) : null}
        <LivingSongExperience experience={patron.experience} plan={patron.living} />
      </LivingSongShell>
    </div>
  );
}
