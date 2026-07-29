import Link from "next/link";

import { ExternalDiscoveryLinks } from "@/components/public/ExternalDiscoveryLinks";
import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import { LivingSongShell } from "@/components/retroverse/experience/LivingSongShell";
import { ChartJourney } from "@/components/retroverse/experience/ChartJourney";
import { CanonicalPublicTrace } from "@/components/public/CanonicalPublicTrace";
import { GraphHeader } from "@/components/public/GraphHeader";
import type { PublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";
import { loadPublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";
import { discoverySourcesForPage } from "@/lib/public/discovery-contract";
import { rvChronologyHrefFromChartDate } from "@/lib/rv/rv-chronology-paths";
import { normalizeSongContent } from "@/lib/retroverse/song-content";
import type { TrackPageData } from "@/lib/track/load-track-page";

import "./public-song-experience.css";

type Props = {
  payload?: PublicSongPayload;
  rvtr?: string;
  trackData?: TrackPageData;
  traceEnabled?: boolean;
  className?: string;
  embedded?: boolean;
};

function trackYearFromPayload(payload: PublicSongPayload, track: TrackPageData | null): number | null {
  if (payload.year) return payload.year;
  if (!track) return null;
  if (track.releaseYear) return track.releaseYear;
  const fromChart = track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : NaN;
  if (Number.isFinite(fromChart) && fromChart > 0) return fromChart;
  return track.albums[0]?.releaseYear ?? null;
}

function chartStory(track: TrackPageData): string {
  const weeks = track.trajectoryWeeks.length;
  if (!weeks) return "";
  const debut = track.trajectoryWeeks[0]?.rank;
  const peak = track.peakHot100;
  const peakWeek = track.trajectoryWeeks.find((week) => week.rank === peak);
  const first = track.trajectoryWeeks[0]?.issueDate;
  const last = track.trajectoryWeeks[weeks - 1]?.issueDate;
  const formatDate = (value?: string) =>
    value
      ? new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${value}T00:00:00Z`))
      : "an unknown date";
  const parts = [`It debuted at #${debut ?? "—"} on ${formatDate(first)}.`];
  const top40 = track.trajectoryWeeks.findIndex((week) => week.rank <= 40);
  const top10 = track.trajectoryWeeks.findIndex((week) => week.rank <= 10);
  if (top40 >= 0 && top40 !== 0) parts.push(`It entered the Top 40 ${top40} ${top40 === 1 ? "week" : "weeks"} later.`);
  if (top10 >= 0 && top10 !== top40) parts.push(`It reached the Top 10 after ${top10} ${top10 === 1 ? "week" : "weeks"}.`);
  if (peak != null && peakWeek) parts.push(`It reached a peak of #${peak} on ${formatDate(peakWeek.issueDate)}.`);
  parts.push(`After ${weeks} ${weeks === 1 ? "week" : "weeks"}, its final appearance came on ${formatDate(last)}.`);
  return parts.join(" ");
}

function definingMoment(
  track: TrackPageData,
  year: number | null,
): { label: string; detail: string; href: string | null } | null {
  const weeks = track.trajectoryWeeks;
  if (!weeks.length) return null;
  const peak = track.peakHot100;
  const peakWeek = weeks.find((week) => week.rank === peak);
  if (peak != null && peakWeek) {
    return {
      label: "Peak Week",
      detail: `#${peak} · ${peakWeek.issueDate}`,
      href: rvChronologyHrefFromChartDate(peakWeek.issueDate, year),
    };
  }
  const biggestJump = weeks.reduce<{ index: number; delta: number } | null>(
    (best, week, index) =>
      week.delta != null && (!best || week.delta > best.delta) ? { index, delta: week.delta } : best,
    null,
  );
  if (biggestJump) {
    const week = weeks[biggestJump.index]!;
    return {
      label: "Biggest Jump",
      detail: `Up ${biggestJump.delta} places · ${week.issueDate}`,
      href: rvChronologyHrefFromChartDate(week.issueDate, year),
    };
  }
  return {
    label: "Final Week",
    detail: weeks[weeks.length - 1]!.issueDate,
    href: rvChronologyHrefFromChartDate(weeks[weeks.length - 1]!.issueDate, year),
  };
}

export async function PublicSongExperience({
  payload: payloadProp,
  rvtr,
  trackData,
  traceEnabled = false,
  className,
  embedded = false,
}: Props) {
  const payload =
    payloadProp ??
    (rvtr ? await loadPublicSongPayload(rvtr) : null);

  if (!payload) return null;

  const track = payload.track ?? trackData ?? null;
  const localContent = payload.localContent;
  const year = trackYearFromPayload(payload, track);
  const primaryAlbum = track?.primaryAlbum ?? null;
  const journeyWeeks = track?.trajectoryWeeks.length ?? 0;
  const moment = track ? definingMoment(track, year) : null;
  const storyText = track ? chartStory(track) : "";
  const content = track ? normalizeSongContent(track) : { sections: [] };
  const artistHref = payload.links.artistHref;
  const albumHref = payload.links.albumHref ?? primaryAlbum?.href ?? null;
  const yearHref = payload.links.yearHref;

  const rootClass = ["rv2-song", embedded ? "rv2-song--embedded" : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={rootClass}>
        {!embedded && track ? (
          <GraphHeader
            data={{
              rvtr: payload.rvtr,
              rvar: track.artistSlug,
              rval: primaryAlbum?.rval,
              rvyr: year,
              rvwk: track.firstChartDate,
              integrity: track.hasHot100 ? "canonical Hot 100" : "outside Hot 100",
              relationshipStatus: primaryAlbum
                ? `${track.albums.length} album relationship${track.albums.length === 1 ? "" : "s"}`
                : null,
              historicalAlbum: primaryAlbum?.title,
              artworkAlbum: track.coverUrl
                ? track.albums.find((album) => album.coverUrl === track.coverUrl)?.title
                : null,
              albumAppearanceCount: track.albums.length,
              enrichmentStatus: null,
            }}
          />
        ) : null}

        <LivingSongShell
          rvtr={payload.rvtr}
          durationSec={Math.max(30, journeyWeeks * 2)}
          storyScore={Math.max(journeyWeeks, payload.storyCards.length)}
          openingKind={journeyWeeks > 0 ? "chart_journey" : "story"}
        >
          <header className="rv2-song__header" aria-label="Song overview">
            {!embedded ? (
              <RetroverseBack fallbackHref="/search" fallbackLabel="Search" />
            ) : null}
            {(embedded && payload.coverUrl) || (!embedded && payload.coverUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="rv2-song__cover" src={payload.coverUrl!} alt="" />
            ) : null}
            <p className="rv2-live__eyebrow">Song</p>
            <h1>{payload.title}</h1>
            <p className="rv2-song__artist">
              {embedded || !artistHref ? (
                <span>{payload.artist}</span>
              ) : (
                <Link href={artistHref} prefetch className="rv2-song__hero-link">
                  {payload.artist}
                </Link>
              )}
            </p>
            {payload.album ? (
              <p className="rv2-song__album">
                <span>Album</span>
                {!embedded && albumHref ? (
                  <Link href={albumHref} prefetch className="rv2-song__hero-link">
                    {payload.album}
                  </Link>
                ) : (
                  payload.album
                )}
              </p>
            ) : null}
            {year ? (
              <p className="rv2-song__year">
                {!embedded && yearHref ? (
                  <Link href={yearHref} prefetch className="rv2-song__hero-link">
                    {year}
                  </Link>
                ) : (
                  year
                )}
              </p>
            ) : null}
            {track?.chartRunLabel ? (
              <p className="rv2-song__subtitle">{track.chartRunLabel}</p>
            ) : null}
            <p className="rv2-song__rvtr-id">{payload.rvtr}</p>
            {!embedded ? (
              <>
                {content.sections.find((section) => section.id === "song-journey")?.summary ? (
                  <p className="rv2-song__summary">
                    {content.sections.find((section) => section.id === "song-journey")?.summary}
                  </p>
                ) : null}
                <div className="rv2-song__continue-label">Explore This Song</div>
                <nav className="rv2-song__explore-links" aria-label="Explore this song">
                  {journeyWeeks > 0 ? <a href="#song-journey">Journey</a> : null}
                  {storyText || payload.storyCards.length ? <a href="#song-story">Story</a> : null}
                  {moment?.href ? <Link href={moment.href} prefetch>Chart</Link> : null}
                  {albumHref ? <Link href={albumHref} prefetch>Album</Link> : null}
                  {artistHref ? <Link href={artistHref} prefetch>Artist</Link> : null}
                  {yearHref && year ? <Link href={yearHref} prefetch>Year {year}</Link> : null}
                </nav>
                {journeyWeeks > 0 ? (
                  <p className="rv2-song__continue-cue">Continue below ↓ Song Journey</p>
                ) : null}
              </>
            ) : null}
          </header>

          {journeyWeeks > 0 && track ? (
            <div id="song-journey" className="rv2-song__journey-stage" aria-labelledby="song-journey-heading">
              <h2 id="song-journey-heading" className="rv2-song__journey-title">
                Song Journey
              </h2>
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

          {moment ? (
            <section id="song-story" className="rv-exp-chapter rv-exp-story" aria-labelledby="rv-defining-moment-heading">
              <header className="rv-exp-chapter__head">
                <h2 id="rv-defining-moment-heading">DEFINING MOMENT</h2>
              </header>
              <div className="rv-exp-story__cards">
                <article className="rv-exp-story__card">
                  <h3>{moment.label}</h3>
                  <p className="rv-exp-story__body">{moment.detail}</p>
                  {moment.href ? (
                    <Link href={moment.href} className="rv-exp-discover__card" prefetch>
                      Open chart week
                    </Link>
                  ) : null}
                </article>
              </div>
            </section>
          ) : null}

          {storyText ? (
            <section className="rv-exp-chapter rv-exp-story" aria-labelledby="rv-song-story-heading">
              <header className="rv-exp-chapter__head">
                <h2 id="rv-song-story-heading">The Story</h2>
              </header>
              <div className="rv-exp-story__cards">
                <article className="rv-exp-story__card">
                  <p className="rv-exp-story__body">{storyText}</p>
                </article>
              </div>
            </section>
          ) : null}

          {payload.storyCards.length > 0 ? (
            <section className="rv-exp-chapter rv-exp-story" aria-labelledby="rv-package-story-heading">
              <header className="rv-exp-chapter__head">
                <h2 id="rv-package-story-heading">Story Cards</h2>
              </header>
              <div className="rv-exp-story__cards">
                {payload.storyCards.map((card) => (
                  <article key={`${card.headline}-${card.body.slice(0, 24)}`} className="rv-exp-story__card">
                    <h3>{card.headline}</h3>
                    <p className="rv-exp-story__body">{card.body}</p>
                    {card.sourceUrl ? (
                      <a href={card.sourceUrl} target="_blank" rel="noopener noreferrer">
                        Source ↗
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {payload.trivia.length > 0 ? (
            <section className="rv-exp-chapter rv-exp-story" aria-labelledby="rv-trivia-heading">
              <header className="rv-exp-chapter__head">
                <h2 id="rv-trivia-heading">TRIVIA</h2>
              </header>
              <ul className="rv-song-trivia">
                {payload.trivia.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {payload.timeline.length > 0 ? (
            <section className="rv-exp-chapter rv-exp-story" aria-labelledby="rv-timeline-heading">
              <header className="rv-exp-chapter__head">
                <h2 id="rv-timeline-heading">TIMELINE</h2>
              </header>
              <ol className="rv-song-timeline">
                {payload.timeline.map((event) => (
                  <li key={event.id}>
                    <strong>
                      {event.year ? `${event.year} · ` : ""}
                      {event.title}
                    </strong>
                    {event.description ? <p>{event.description}</p> : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {track && track.relatedTracks.length > 0 ? (
            <section className="rv-exp-chapter rv-exp-discover" aria-labelledby="rv-related-music-heading">
              <header className="rv-exp-chapter__head">
                <h2 id="rv-related-music-heading">RELATED MUSIC</h2>
              </header>
              <p className="rv-exp-story__context">
                More songs from the same artist in the Retroverse chart graph.
              </p>
              <ul className="rv-exp-discover__rail">
                {Array.from(new Map(track.relatedTracks.map((song) => [song.rvtr, song])).values())
                  .slice(0, 6)
                  .map((song) => (
                    <li key={song.rvtr}>
                      <Link
                        href={song.href}
                        className="rv-exp-discover__card"
                        prefetch
                        aria-label={`${song.title}, related because it is by the same artist`}
                      >
                        <span className="rv-exp-discover__copy">
                          <span className="rv-exp-discover__title">{song.title}</span>
                          <span>
                            Same artist
                            {song.releaseYear ? ` · ${song.releaseYear}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}

          {localContent?.sections?.overview?.text ? (
            <section className="rv-exp-chapter rv-exp-story" aria-labelledby="rv-overview-heading">
              <header className="rv-exp-chapter__head">
                <h2 id="rv-overview-heading">OVERVIEW</h2>
              </header>
              <p className="rv-exp-story__body">{localContent.sections.overview.text}</p>
            </section>
          ) : null}

          {localContent?.sections?.whyItMattered?.text ? (
            <section className="rv-exp-chapter rv-exp-story" aria-labelledby="rv-why-heading">
              <header className="rv-exp-chapter__head">
                <h2 id="rv-why-heading">WHY IT MATTERED</h2>
              </header>
              <p className="rv-exp-story__body">{localContent.sections.whyItMattered.text}</p>
            </section>
          ) : null}

          {localContent?.credits?.items?.length ? (
            <section className="rv-exp-chapter rv-exp-story" aria-labelledby="rv-credits-heading">
              <header className="rv-exp-chapter__head">
                <h2 id="rv-credits-heading">CREDITS</h2>
              </header>
              <dl className="rv-song-credits">
                {localContent.credits.items.map((item) => (
                  <div key={`${item.label}-${item.value}`}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {localContent?.media?.items?.length ? (
            <section className="rv-exp-chapter rv-exp-story" aria-labelledby="rv-media-heading">
              <header className="rv-exp-chapter__head">
                <h2 id="rv-media-heading">WATCH OR LISTEN</h2>
              </header>
              <div className="rv-song-media">
                {localContent.media.items.map((item) => (
                  <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.label ?? "Open media"} ↗
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {localContent?.sources?.length ? (
            <section className="rv-exp-chapter rv-exp-story" aria-labelledby="rv-sources-heading">
              <header className="rv-exp-chapter__head">
                <h2 id="rv-sources-heading">SOURCES</h2>
              </header>
              <ul>
                {localContent.sources.map((source) => (
                  <li key={source.id}>
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.name} ↗
                      </a>
                    ) : (
                      <span>{source.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </LivingSongShell>
      </div>

      {!embedded ? (
        <ExternalDiscoveryLinks
          entityType="song"
          title={payload.title}
          artist={payload.artist}
          album={payload.album}
          year={payload.year}
        />
      ) : null}

      {!embedded && track ? (
        <CanonicalPublicTrace
          enabled={traceEnabled}
          rvtr={payload.rvtr}
          artistId={track.artistId}
          albumId={track.primaryAlbum?.albumId ?? null}
          primaryAlbum={track.primaryAlbum?.title ?? null}
          resolverPath={[...payload.resolverPath, ...track.resolverPath]}
          discoverySources={discoverySourcesForPage("song")}
          loaderTimings={track.loaderTimings}
        />
      ) : null}
    </>
  );
}
