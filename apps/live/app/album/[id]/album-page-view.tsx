import type { ReactNode } from "react";
import Link from "next/link";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import { ExternalDiscoveryLinks } from "@/components/public/ExternalDiscoveryLinks";
import { ChartJourney } from "@/components/retroverse/experience/ChartJourney";
import { buildChartJourneyStory } from "@/lib/chart-journey/chart-journey-story";
import { buildChartJourney } from "@/lib/chart-journey/build-chart-journey";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import type { AlbumBreakoutSong, AlbumPageData } from "@/lib/album/load-album-page";
import type { SimilarAlbumMatch } from "@/lib/album/album-chart-similarity";
import { formatSongYear } from "@/lib/artist/format-track-card";
import { discoveryShelf } from "@/lib/public/discovery-contract";

import { AlbumExplorerTrackRows } from "./album-explorer-track-rows";
import { AlbumHeroCover } from "./album-hero-cover";

import "./album-page-v1.css";

type AlbumPageViewProps = {
  data: AlbumPageData;
};

type ExploreCard = {
  title: string;
  subtitle: string;
  href: string;
};

type FactCard = {
  label: string;
  value: ReactNode;
};

type JourneyMilestone = {
  label: string;
  detail: string;
  date: string;
  kind: "entry" | "top-40" | "top-10" | "peak" | "number-one";
};

type SongMilestone = Omit<JourneyMilestone, "detail"> & {
  detail: string;
  href: string;
};

function buildEditorialSubtitle(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) return "";

  const sentenceEnd = trimmed.search(/[.!?](?:\s|$)/);
  if (sentenceEnd > 0 && sentenceEnd <= 180) {
    return trimmed.slice(0, sentenceEnd + 1);
  }
  if (trimmed.length <= 160) return trimmed;

  const cut = trimmed.slice(0, 157).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : 157)}…`;
}

function buildHeroStats(data: AlbumPageData): Array<{ label: string; value: string }> {
  const stats: Array<{ label: string; value: string }> = [];

  if (data.b200Peak != null) {
    stats.push({ label: "Peak position", value: `#${data.b200Peak}` });
  }
  if (data.chartWeeks > 0) {
    stats.push({ label: "Weeks on chart", value: String(data.chartWeeks) });
  }
  if (data.weeksAtNumberOne > 0) {
    stats.push({
      label: "Weeks at #1",
      value: String(data.weeksAtNumberOne),
    });
  }

  return stats;
}

function buildJourneySummary(data: AlbumPageData): string | null {
  if (data.trajectoryWeeks.length === 0) return null;
  const model = buildChartJourney({
    weeks: data.trajectoryWeeks,
    peak: data.b200Peak,
    chartLabel: data.chartRunLabel,
    maxRank: 200,
  });
  if (!model) return null;
  return buildChartJourneyStory(model);
}

function buildFactCards(data: AlbumPageData): FactCard[] {
  const info = data.info;
  const cards: FactCard[] = [];

  if (info.label) cards.push({ label: "Label", value: info.label });
  if (info.genres.length > 0) {
    cards.push({ label: "Genres", value: info.genres.join(" · ") });
  }
  if (info.certifications.length > 0) {
    cards.push({ label: "Certifications", value: info.certifications.join(" · ") });
  }
  if (info.awards.length > 0) {
    cards.push({ label: "Awards", value: info.awards.join(" · ") });
  }
  if (info.majorSingles.length > 0) {
    cards.push({
      label: "Singles",
      value: info.majorSingles.map((single) => `"${single}"`).join(" · "),
    });
  }
  if (info.releaseDate) {
    cards.push({ label: "Release date", value: info.releaseDate });
  }

  cards.push({
    label: "Artist",
    value: (
      <Link href={info.artistHref} prefetch>
        {data.artistName}
      </Link>
    ),
  });

  if (info.yearHref && data.releaseYear != null) {
    cards.push({
      label: "Year",
      value: (
        <Link href={info.yearHref} prefetch>
          {data.releaseYear}
        </Link>
      ),
    });
  } else if (data.releaseYear != null) {
    cards.push({ label: "Year", value: String(data.releaseYear) });
  }

  return cards;
}

function buildExploreCards(data: AlbumPageData): ExploreCard[] {
  const cards: ExploreCard[] = [];
  const info = data.info;

  cards.push({
    title: data.artistName,
    subtitle: "Artist",
    href: data.artistHref,
  });

  if (info.yearHref && data.releaseYear != null) {
    cards.push({
      title: String(data.releaseYear),
      subtitle: "Year",
      href: info.yearHref,
    });
  }

  const firstLinkedTrack = data.tracks.find((track) => track.href);
  if (firstLinkedTrack?.href) {
    cards.push({
      title:
        data.tracks.length > 1
          ? `${data.tracks.length} songs on this album`
          : firstLinkedTrack.title,
      subtitle: "Songs",
      href: firstLinkedTrack.href,
    });
  } else if (data.tracks.length > 0) {
    cards.push({
      title: `${data.tracks.length} tracks`,
      subtitle: "Songs",
      href: data.artistHref,
    });
  }

  const chartWeek = info.relatedExperiences.find((link) =>
    /chart week/i.test(link.label),
  );
  if (chartWeek) {
    cards.push({
      title: chartWeek.label,
      subtitle: "Chart week",
      href: chartWeek.href,
    });
  }

  const relatedAlbum = data.similarChartJourneys[0];
  if (relatedAlbum) {
    cards.push({
      title: relatedAlbum.title,
      subtitle: "Related album",
      href: relatedAlbum.href,
    });
  }

  return cards;
}

function similarAlbumMeta(album: SimilarAlbumMatch): string {
  const parts: string[] = [];
  if (album.releaseYear != null) parts.push(String(album.releaseYear));
  if (album.reason) parts.push(album.reason);
  return parts.join(" · ");
}

function buildJourneyMilestones(data: AlbumPageData): JourneyMilestone[] {
  const weeks = data.trajectoryWeeks;
  const entry = weeks[0];
  if (!entry) return [];

  const milestones: JourneyMilestone[] = [
    {
      label: "Chart entry",
      detail: `Debuts at #${entry.rank}`,
      date: entry.issueDate,
      kind: "entry",
    },
  ];
  const firstTop40 = weeks.find((week) => week.rank <= 40);
  const firstTop10 = weeks.find((week) => week.rank <= 10);
  const firstNumberOne = weeks.find((week) => week.rank === 1);
  const peakWeek = weeks.find((week) => week.rank === data.b200Peak);

  if (firstTop40 && firstTop40 !== entry) {
    milestones.push({
      label: "Top 40",
      detail: "Breaks into the upper chart",
      date: firstTop40.issueDate,
      kind: "top-40",
    });
  }
  if (firstTop10 && firstTop10 !== firstTop40) {
    milestones.push({
      label: "Top 10",
      detail: "Reaches the chart’s top tier",
      date: firstTop10.issueDate,
      kind: "top-10",
    });
  }
  if (firstNumberOne) {
    milestones.push({
      label: "#1 week",
      detail: "Reaches #1",
      date: firstNumberOne.issueDate,
      kind: "number-one",
    });
  } else if (peakWeek && peakWeek !== entry) {
    milestones.push({
      label: "Peak week",
      detail: `Reaches its high at #${peakWeek.rank}`,
      date: peakWeek.issueDate,
      kind: "peak",
    });
  }

  return milestones.slice(0, 4);
}

function formatMilestoneDate(date: string): string {
  const value = new Date(`${date.slice(0, 10)}T12:00:00`);
  return Number.isNaN(value.getTime())
    ? date
    : new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(value);
}

function journeyPattern(reason: string): { label: string; detail: string; kind: string } {
  const source = reason.toLowerCase();
  if (source.includes("slow climb")) {
    return { label: "Slow climb", detail: "A patient rise into view", kind: "slow-climb" };
  }
  if (source.includes("fast rise") || source.includes("near-top debut")) {
    return { label: "Explosive debut", detail: "Arrived near the summit", kind: "fast-rise" };
  }
  if (source.includes("long chart run") || source.includes("post-peak")) {
    return { label: "Long endurance", detail: "Stayed in the conversation", kind: "endurance" };
  }
  if (source.includes("returns")) {
    return { label: "Return journey", detail: "Found its way back", kind: "return" };
  }
  if (source.includes("peak")) {
    return { label: "Shared summit", detail: "Reached similar heights", kind: "summit" };
  }
  return { label: "Kindred arc", detail: "A familiar chart life", kind: "kindred" };
}

function breakoutLabels(song: AlbumBreakoutSong, songs: AlbumBreakoutSong[]): string[] {
  const labels: string[] = [];
  const bestPeak = Math.min(...songs.map((item) => item.peakHot100));
  const longestRun = Math.max(...songs.map((item) => item.chartWeeks));
  const datedSongs = songs.filter((item) => item.firstChartDate);
  const firstDate = datedSongs.length ? [...datedSongs].sort((a, b) => a.firstChartDate!.localeCompare(b.firstChartDate!))[0]?.firstChartDate : null;
  const finalDate = datedSongs.length ? [...datedSongs].sort((a, b) => b.firstChartDate!.localeCompare(a.firstChartDate!))[0]?.firstChartDate : null;

  if (song.peakHot100 === bestPeak) labels.push("Highest peak");
  if (song.chartWeeks === longestRun) labels.push("Longest-running single");
  if (song.firstChartDate && song.firstChartDate === firstDate) labels.push("First charting single");
  if (song.firstChartDate && song.firstChartDate === finalDate && firstDate !== finalDate) {
    labels.push("Final charting single");
  }
  return [...new Set(labels)];
}

function buildSongMilestones(songs: AlbumBreakoutSong[]): SongMilestone[] {
  const milestones: SongMilestone[] = [];
  for (const song of songs) {
    const entry = song.trajectoryWeeks[0];
    const top40 = song.trajectoryWeeks.find((week) => week.rank <= 40);
    const top10 = song.trajectoryWeeks.find((week) => week.rank <= 10);
    const numberOne = song.trajectoryWeeks.find((week) => week.rank === 1);
    const events: Array<{
      label: string;
      kind: SongMilestone["kind"];
      week: AlbumBreakoutSong["trajectoryWeeks"][number] | undefined;
    }> = [
      { label: "Hot 100 entry", kind: "entry", week: entry },
      { label: "Top 40", kind: "top-40", week: top40 },
      { label: "Top 10", kind: "top-10", week: top10 },
      { label: "#1", kind: "number-one", week: numberOne },
    ];
    for (const event of events) {
      if (!event.week) continue;
      milestones.push({
        label: event.label,
        detail: song.title,
        date: event.week.issueDate,
        kind: event.kind,
        href: song.href,
      });
    }
  }
  return milestones.sort((a, b) => a.date.localeCompare(b.date));
}

function BreakoutFingerprint({ song }: { song: AlbumBreakoutSong }) {
  if (song.trajectoryWeeks.length === 0) return null;
  return (
    <div className="album-ed__breakout-fingerprint" aria-label={`${song.title} Hot 100 weekly fingerprint`}>
      {song.trajectoryWeeks.map((week) => (
        <span key={week.issueDate} className="album-ed__breakout-week" aria-hidden>
          <span
            className="album-ed__breakout-bar"
            style={{ width: `${Math.max(4, 101 - week.rank)}%` }}
          />
        </span>
      ))}
    </div>
  );
}

export function AlbumPageView({ data }: AlbumPageViewProps) {
  const yearLabel = formatSongYear(data.releaseYear);
  const heroStats = buildHeroStats(data);
  const editorialSubtitle = data.description ? buildEditorialSubtitle(data.description) : "";
  const journeySummary = buildJourneySummary(data);
  const hasChart = data.trajectoryWeeks.length > 0;
  const factCards = buildFactCards(data);
  const exploreCards = buildExploreCards(data);
  const journeyMilestones = buildJourneyMilestones(data);
  const songMilestones = buildSongMilestones(data.breakoutSongs);

  return (
    <Rv2PublicShell className="rv2-album rv2-album-editorial" activeNav="search" showTopBroadcastBanner={false}>
      <article className="album-ed" aria-label={`${data.title} album experience`}>
        <header className="album-ed__hero">
          <RetroverseBack
            fallbackHref="/search"
            fallbackLabel="Search"
            className="album-ed__back"
          />

          <div className="album-ed__hero-stage">
            <div className="album-ed__cover-wrap">
              <AlbumHeroCover
                rval={data.rval}
                title={data.title}
                artistName={data.artistName}
                releaseYear={data.releaseYear}
                coverUrl={data.coverUrl}
              />
            </div>

            <div className="album-ed__hero-copy">
              <p className="album-ed__kicker">Album</p>
              <h1 className="album-ed__title">{data.title}</h1>
              <p className="album-ed__artist-line">
                <Link href={data.artistHref} prefetch className="album-ed__hero-link">
                  {data.artistName}
                </Link>
              </p>
              {data.releaseYear != null ? (
                <p className="album-ed__year-line">
                  {data.info.yearHref ? (
                    <Link href={data.info.yearHref} prefetch className="album-ed__hero-link">
                      {yearLabel}
                    </Link>
                  ) : (
                    <span>{yearLabel}</span>
                  )}
                </p>
              ) : null}

              {heroStats.length > 0 ? (
                <dl className="album-ed__hero-stats">
                  {heroStats.map((stat) => (
                    <div key={stat.label} className="album-ed__hero-stat">
                      <dt>{stat.label}</dt>
                      <dd>{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {editorialSubtitle ? (
                <p className="album-ed__hero-subtitle">{editorialSubtitle}</p>
              ) : null}
            </div>
          </div>
        </header>

        {data.description ? (
          <section
            className="album-ed__section album-ed__section--editorial"
            aria-labelledby="album-why-mattered"
          >
            <h2 id="album-why-mattered" className="album-ed__section-title">
              Why this album mattered
            </h2>
            <p className="album-ed__editorial-text">{data.description}</p>
          </section>
        ) : null}

        {data.tracks.length > 0 ? (
          <section className="album-ed__section album-ed__section--music" aria-labelledby="album-music">
            <h2 id="album-music" className="album-ed__section-title">
              The music
            </h2>
            <AlbumExplorerTrackRows
              tracks={data.tracks}
              artistName={data.artistName}
              albumTitle={data.title}
              releaseYear={data.releaseYear}
              albumCoverUrl={data.coverUrl}
              rval={data.rval}
            />
          </section>
        ) : null}

        {hasChart ? (
          <section className="album-ed__section album-ed__section--chart" aria-labelledby="album-chart">
            <div className="album-ed__journey-heading">
              <div>
                <p className="album-ed__section-kicker">One bar, one chart week</p>
                <h2 id="album-chart" className="album-ed__section-title">
                  The chart journey
                </h2>
              </div>
              <p className="album-ed__journey-prompt">Tap any week to open its place in the story.</p>
            </div>
            <div className="album-ed__journey-stage" data-compare-ready="true">
              {journeyMilestones.length > 0 ? (
                <aside className="album-ed__milestones" aria-label="Album journey milestones">
                  <p className="album-ed__milestones-kicker">Milestones</p>
                  <ol className="album-ed__milestones-list">
                    {journeyMilestones.map((milestone) => (
                      <li key={`${milestone.kind}-${milestone.date}`} className={`album-ed__milestone album-ed__milestone--${milestone.kind}`}>
                        <span className="album-ed__milestone-mark" aria-hidden />
                        <span className="album-ed__milestone-copy">
                          <span className="album-ed__milestone-label">{milestone.label}</span>
                          <span className="album-ed__milestone-detail">{milestone.detail}</span>
                        </span>
                        <time className="album-ed__milestone-date" dateTime={milestone.date}>
                          {formatMilestoneDate(milestone.date)}
                        </time>
                      </li>
                    ))}
                  </ol>
                  {songMilestones.length > 0 ? (
                    <>
                      <p className="album-ed__milestones-kicker album-ed__milestones-kicker--songs">
                        Breakout songs on the Hot 100
                      </p>
                      <ol className="album-ed__milestones-list album-ed__milestones-list--songs">
                        {songMilestones.map((milestone) => (
                          <li key={`${milestone.href}-${milestone.kind}-${milestone.date}`} className={`album-ed__milestone album-ed__milestone--${milestone.kind}`}>
                            <span className="album-ed__milestone-mark" aria-hidden />
                            <Link href={milestone.href} prefetch className="album-ed__milestone-copy">
                              <span className="album-ed__milestone-label">{milestone.label}</span>
                              <span className="album-ed__milestone-detail">{milestone.detail}</span>
                            </Link>
                            <time className="album-ed__milestone-date" dateTime={milestone.date}>
                              {formatMilestoneDate(milestone.date)}
                            </time>
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : null}
                </aside>
              ) : null}
              <ChartJourney
                weeks={data.trajectoryWeeks}
                peak={data.b200Peak}
                chartLabel={data.chartRunLabel}
                maxRank={200}
                releaseYear={data.releaseYear}
                variant="rv2"
                hideTimeline
                summary={null}
                className="album-ed__chart-journey"
              />
            </div>
            {journeySummary ? (
              <div className="album-ed__journey-story-wrap">
                <p className="album-ed__journey-story">{journeySummary}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {data.breakoutSongs.length > 0 ? (
          <section className="album-ed__section album-ed__section--breakouts" aria-labelledby="album-breakout-songs">
            <p className="album-ed__section-kicker">The songs behind the run</p>
            <h2 id="album-breakout-songs" className="album-ed__section-title">
              {discoveryShelf("albumBreakoutSongs").displayLabel}
            </h2>
            <p className="album-ed__section-lead">
              The album’s tracks with chart history. Open a song to follow its full journey.
            </p>
            <ol className="album-ed__breakout-list">
              {data.breakoutSongs.map((song) => {
                const labels = breakoutLabels(song, data.breakoutSongs);
                return (
                  <li key={song.rvtr}>
                    <Link href={song.href} prefetch className="album-ed__breakout-card">
                      <div className="album-ed__breakout-head">
                        <span className="album-ed__breakout-title">{song.title}</span>
                        <span className="album-ed__breakout-artist">{data.artistName}</span>
                      </div>
                      <dl className="album-ed__breakout-stats">
                        <div><dt>Hot 100 peak</dt><dd>#{song.peakHot100}</dd></div>
                        <div><dt>Weeks on chart</dt><dd>{song.chartWeeks}</dd></div>
                      </dl>
                      <BreakoutFingerprint song={song} />
                      {labels.length > 0 ? (
                        <span className="album-ed__breakout-labels">{labels.join(" · ")}</span>
                      ) : null}
                      <span className="album-ed__breakout-cta">Open song journey →</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        {data.similarChartJourneys.length > 0 ? (
          <section
            className="album-ed__section album-ed__section--journeys"
            aria-labelledby="album-similar-journeys"
          >
            <h2 id="album-similar-journeys" className="album-ed__section-title">
              {discoveryShelf("albumSimilarJourneys").displayLabel}
            </h2>
            <p className="album-ed__section-lead">
              Albums with similar chart journeys share comparable chart arcs — how they
              climbed, peaked, and endured on the chart.
            </p>
            <ul className="album-ed__journey-grid">
              {data.similarChartJourneys.map((album) => (
                <li key={album.rval}>
                  <Link href={album.href} prefetch className="album-ed__journey-card">
                    <ArtistCover
                      src={album.coverUrl ?? data.coverUrl}
                      alt=""
                      className="album-ed__journey-card-art"
                      fallbackClassName="album-ed__journey-card-art album-ed__journey-card-art--fallback"
                      fallbackVariant="plate"
                      placeholderContext={{
                        artist: album.artistName,
                        album: album.title,
                        releaseYear: album.releaseYear,
                        rval: album.rval,
                      }}
                    />
                    <div className="album-ed__journey-card-copy">
                      {(() => {
                        const pattern = journeyPattern(album.reason);
                        return (
                          <span className="album-ed__journey-pattern">
                            <span className={`album-ed__journey-pattern-line album-ed__journey-pattern-line--${pattern.kind}`} aria-hidden />
                            <span>{pattern.label}</span>
                          </span>
                        );
                      })()}
                      <span className="album-ed__journey-card-title">{album.title}</span>
                      <span className="album-ed__journey-card-artist">{album.artistName}</span>
                      <span className="album-ed__journey-card-meta">
                        {journeyPattern(album.reason).detail} · {similarAlbumMeta(album)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {factCards.length > 0 ? (
          <section className="album-ed__section album-ed__section--facts" aria-labelledby="album-facts">
            <h2 id="album-facts" className="album-ed__section-title">
              Album facts
            </h2>
            <ul className="album-ed__facts-grid">
              {factCards.map((fact) => (
                <li key={fact.label} className="album-ed__fact-card">
                  <span className="album-ed__fact-label">{fact.label}</span>
                  <span className="album-ed__fact-value">{fact.value}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {exploreCards.length > 0 ? (
          <section
            className="album-ed__section album-ed__section--explore"
            aria-labelledby="album-keep-exploring"
          >
            <h2 id="album-keep-exploring" className="album-ed__section-title">
              {discoveryShelf("albumRelatedEntities").displayLabel}
            </h2>
            <ul className="album-ed__explore-grid">
              {exploreCards.map((card) => (
                <li key={`${card.subtitle}-${card.href}`}>
                  <Link href={card.href} prefetch className="album-ed__explore-card">
                    <span className="album-ed__explore-card-kicker">{card.subtitle}</span>
                    <span className="album-ed__explore-card-title">{card.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
      <ExternalDiscoveryLinks
        entityType="album"
        artist={data.artistName}
        album={data.title}
      />
    </Rv2PublicShell>
  );
}
