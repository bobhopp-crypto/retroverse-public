import Link from "next/link";

import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import { LivingSongShell } from "@/components/retroverse/experience/LivingSongShell";
import { ChartJourney } from "@/components/retroverse/experience/ChartJourney";
import { CanonicalPublicTrace } from "@/components/public/CanonicalPublicTrace";
import { GraphHeader } from "@/components/public/GraphHeader";
import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";
import { discoverySourcesForPage } from "@/lib/public/discovery-contract";
import { rvChronologyHrefFromChartDate } from "@/lib/rv/rv-chronology-paths";

import "@/app/retroverse-2/song/[rvtr]/retroverse-song-2.css";

type Props = {
  rvtr: string;
  trackData?: TrackPageData;
  traceEnabled?: boolean;
  className?: string;
};

function trackYear(track: TrackPageData): number | null {
  if (track.releaseYear) return track.releaseYear;
  const fromChart = track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : NaN;
  if (Number.isFinite(fromChart) && fromChart > 0) return fromChart;
  return track.albums[0]?.releaseYear ?? null;
}

function chartStory(track: TrackPageData): string {
  const weeks = track.trajectoryWeeks.length;
  if (!weeks) return "Its chart record is still taking shape in the Retroverse.";
  const debut = track.trajectoryWeeks[0]?.rank;
  const peak = track.peakHot100;
  const peakWeek = track.trajectoryWeeks.find((week) => week.rank === peak);
  const first = track.trajectoryWeeks[0]?.issueDate;
  const last = track.trajectoryWeeks[weeks - 1]?.issueDate;
  const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "an unknown date";
  const parts = [`It debuted at #${debut ?? "—"} on ${formatDate(first)}.`];
  const top40 = track.trajectoryWeeks.findIndex((week) => week.rank <= 40);
  const top10 = track.trajectoryWeeks.findIndex((week) => week.rank <= 10);
  if (top40 >= 0 && top40 !== 0) parts.push(`It entered the Top 40 ${top40} ${top40 === 1 ? "week" : "weeks"} later.`);
  if (top10 >= 0 && top10 !== top40) parts.push(`It reached the Top 10 after ${top10} ${top10 === 1 ? "week" : "weeks"}.`);
  if (peak != null && peakWeek) parts.push(`It reached a peak of #${peak} on ${formatDate(peakWeek.issueDate)}.`);
  parts.push(`After ${weeks} ${weeks === 1 ? "week" : "weeks"}, its final appearance came on ${formatDate(last)}.`);
  return parts.join(" ");
}

function definingMoment(track: TrackPageData): { label: string; detail: string; href: string | null } {
  const weeks = track.trajectoryWeeks;
  const peak = track.peakHot100;
  const peakWeek = weeks.find((week) => week.rank === peak);
  if (peak != null && peakWeek) return { label: "Peak Week", detail: `#${peak} · ${peakWeek.issueDate}`, href: rvChronologyHrefFromChartDate(peakWeek.issueDate, track.releaseYear) };
  const biggestJump = weeks.reduce<{ index: number; delta: number } | null>((best, week, index) => week.delta != null && (!best || week.delta > best.delta) ? { index, delta: week.delta } : best, null);
  if (biggestJump) { const week = weeks[biggestJump.index]!; return { label: "Biggest Jump", detail: `Up ${biggestJump.delta} places · ${week.issueDate}`, href: rvChronologyHrefFromChartDate(week.issueDate, track.releaseYear) }; }
  return { label: "Final Week", detail: weeks.length ? weeks[weeks.length - 1]!.issueDate : "Chart record", href: weeks.length ? rvChronologyHrefFromChartDate(weeks[weeks.length - 1]!.issueDate, track.releaseYear) : null };
}

export async function PublicSongExperience({ rvtr, trackData, traceEnabled = false, className }: Props) {
  const track = trackData ?? await loadTrackPage(rvtr);
  if (!track) {
    return null;
  }

  const year = trackYear(track);
  const primaryAlbum = track.primaryAlbum;
  const journeyWeeks = track.trajectoryWeeks.length;
  const moment = definingMoment(track);
  return (
    <>
    <div className={className}>
      <GraphHeader data={{
        rvtr: track.rvtr,
        rvar: track.artistSlug,
        rval: primaryAlbum?.rval,
        rvyr: year,
        rvwk: track.firstChartDate,
        integrity: track.hasHot100 ? "canonical Hot 100" : "outside Hot 100",
        relationshipStatus: primaryAlbum ? `${track.albums.length} album relationship${track.albums.length === 1 ? "" : "s"}` : null,
        historicalAlbum: primaryAlbum?.title,
        artworkAlbum: track.coverUrl ? track.albums.find((album) => album.coverUrl === track.coverUrl)?.title : null,
        albumAppearanceCount: track.albums.length,
        enrichmentStatus: null,
      }} />
      <LivingSongShell
        rvtr={track.rvtr}
        durationSec={Math.max(30, journeyWeeks * 2)}
        storyScore={journeyWeeks}
        openingKind="chart_journey"
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
          <div className="rv2-song__continue-label">Continue Exploring</div>
          <nav className="rv2-song__explore-links" aria-label="Continue Exploring">
            {primaryAlbum?.href ? (
              <Link href={primaryAlbum.href} prefetch>Album</Link>
            ) : null}
            <Link href={track.artistHref} prefetch>Artist</Link>
            {track.rvYearHref && year ? (
              <Link href={track.rvYearHref} prefetch>Year {year}</Link>
            ) : null}
            {moment.href ? <Link href={moment.href} prefetch>Peak Week</Link> : null}
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
              summary={null}
              hideTimeline
              variant="rv2"
              className="rv2-song__chart-journey"
            />
          </div>
        ) : null}
        <section className="rv-exp-chapter rv-exp-story" aria-labelledby="rv-defining-moment-heading">
          <header className="rv-exp-chapter__head"><h2 id="rv-defining-moment-heading">DEFINING MOMENT</h2></header>
          <div className="rv-exp-story__cards"><article className="rv-exp-story__card"><h3>{moment.label}</h3><p className="rv-exp-story__body">{moment.detail}</p>{moment.href ? <Link href={moment.href} className="rv-exp-discover__card" prefetch>Open chart week</Link> : null}</article></div>
        </section>
        <section className="rv-exp-chapter rv-exp-story" aria-labelledby="rv-song-story-heading">
          <header className="rv-exp-chapter__head"><h2 id="rv-song-story-heading">The Story</h2></header>
          <div className="rv-exp-story__cards"><article className="rv-exp-story__card"><p className="rv-exp-story__body">{chartStory(track)}</p></article></div>
        </section>
        {track.relatedTracks.length > 0 ? (
        <section className="rv-exp-chapter rv-exp-discover" aria-labelledby="rv-chart-doppelgangers-heading">
            <header className="rv-exp-chapter__head"><h2 id="rv-chart-doppelgangers-heading">CHART DOPPELGÄNGERS</h2></header>
            <p className="rv-exp-story__context">Unexpected historical twins with a place in the same chart universe.</p>
            <ul className="rv-exp-discover__rail">
              {track.relatedTracks.map((song) => <li key={song.rvtr}><Link href={song.href} className="rv-exp-discover__card" prefetch><span className="rv-exp-discover__copy"><span className="rv-exp-discover__title">{song.title}</span><span>{song.releaseYear ?? ""}</span></span></Link></li>)}
            </ul>
          </section>
        ) : null}
      </LivingSongShell>
    </div>
    <CanonicalPublicTrace
      enabled={traceEnabled}
      rvtr={track.rvtr}
      artistId={track.artistId}
      albumId={track.primaryAlbum?.albumId ?? null}
      primaryAlbum={track.primaryAlbum?.title ?? null}
      resolverPath={track.resolverPath}
      discoverySources={discoverySourcesForPage("song")}
      loaderTimings={[
        ...track.loaderTimings,
      ]}
    />
    </>
  );
}
