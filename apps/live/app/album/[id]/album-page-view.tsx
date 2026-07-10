import type { ReactNode } from "react";
import Link from "next/link";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { ChartJourney } from "@/components/retroverse/experience/ChartJourney";
import { buildChartJourneyStory } from "@/lib/chart-journey/chart-journey-story";
import { buildChartJourney } from "@/lib/chart-journey/build-chart-journey";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import type { AlbumPageData } from "@/lib/album/load-album-page";
import type { SimilarAlbumMatch } from "@/lib/album/album-chart-similarity";
import { formatSongYear } from "@/lib/artist/format-track-card";

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

export function AlbumPageView({ data }: AlbumPageViewProps) {
  const yearLabel = formatSongYear(data.releaseYear);
  const heroStats = buildHeroStats(data);
  const editorialSubtitle = data.description ? buildEditorialSubtitle(data.description) : "";
  const journeySummary = buildJourneySummary(data);
  const hasChart = data.trajectoryWeeks.length > 0;
  const factCards = buildFactCards(data);
  const exploreCards = buildExploreCards(data);

  return (
    <Rv2PublicShell className="rv2-album rv2-album-editorial" activeNav="search">
      <article className="album-ed" aria-label={`${data.title} album experience`}>
        <header className="album-ed__hero">
          <Link href="/search" prefetch className="album-ed__back">
            ← Search
          </Link>

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
            <h2 id="album-chart" className="album-ed__section-title">
              The chart journey
            </h2>
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
            {journeySummary ? (
              <div className="album-ed__journey-story-wrap">
                <p className="album-ed__journey-story">{journeySummary}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {data.similarChartJourneys.length > 0 ? (
          <section
            className="album-ed__section album-ed__section--journeys"
            aria-labelledby="album-similar-journeys"
          >
            <h2 id="album-similar-journeys" className="album-ed__section-title">
              Albums with similar chart journeys
            </h2>
            <p className="album-ed__section-lead">
              Albums with similar chart journeys share comparable Billboard 200 arcs — how they
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
                      <span className="album-ed__journey-card-title">{album.title}</span>
                      <span className="album-ed__journey-card-artist">{album.artistName}</span>
                      <span className="album-ed__journey-card-meta">{similarAlbumMeta(album)}</span>
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
              Keep exploring
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
    </Rv2PublicShell>
  );
}
