import Link from "next/link";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { ChartJourney } from "@/components/retroverse/experience/ChartJourney";
import { buildChartJourneyStory } from "@/lib/chart-journey/chart-journey-story";
import { buildChartJourney } from "@/lib/chart-journey/build-chart-journey";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import type { AlbumPageData } from "@/lib/album/load-album-page";
import { formatSongYear } from "@/lib/artist/format-track-card";

import { AlbumExplorerTrackRows } from "./album-explorer-track-rows";
import { AlbumHeroCover } from "./album-hero-cover";

import "./album-page-v1.css";

type AlbumPageViewProps = {
  data: AlbumPageData;
};

function buildHeroMeta(data: AlbumPageData): string[] {
  const parts: string[] = [];
  if (data.b200Peak != null) {
    parts.push(`Peak #${data.b200Peak} on Billboard 200`);
  }
  if (data.weeksAtNumberOne > 0) {
    parts.push(`${data.weeksAtNumberOne} week${data.weeksAtNumberOne === 1 ? "" : "s"} at #1`);
  } else if (data.weeksAtPeak > 0 && data.b200Peak != null) {
    parts.push(`${data.weeksAtPeak} week${data.weeksAtPeak === 1 ? "" : "s"} at peak`);
  }
  if (data.chartWeeks > 0) {
    parts.push(`${data.chartWeeks} chart weeks`);
  }
  return parts;
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

export function AlbumPageView({ data }: AlbumPageViewProps) {
  const yearLabel = formatSongYear(data.releaseYear);
  const heroMeta = buildHeroMeta(data);
  const journeySummary = buildJourneySummary(data);
  const hasChart = data.trajectoryWeeks.length > 0;
  const info = data.info;

  const infoRows: Array<{ label: string; value: string }> = [];
  if (info.releaseDate) infoRows.push({ label: "Release date", value: info.releaseDate });
  if (info.label) infoRows.push({ label: "Label", value: info.label });
  if (info.genres.length > 0) infoRows.push({ label: "Genres", value: info.genres.join(" · ") });
  if (info.certifications.length > 0) {
    infoRows.push({ label: "Certifications", value: info.certifications.join(" · ") });
  }
  if (info.awards.length > 0) infoRows.push({ label: "Awards", value: info.awards.join(" · ") });
  if (info.majorSingles.length > 0) {
    infoRows.push({ label: "Major singles", value: info.majorSingles.map((s) => `"${s}"`).join(" · ") });
  }

  return (
    <Rv2PublicShell className="rv2-album rv2-explorer" activeNav="search">
      <div className="explorer album-v1">
        <header className="album-v1__hero" aria-label={`${data.title} album page`}>
          <Link href="/search" prefetch className="explorer__back">
            ← Search
          </Link>

          <div className="album-v1__hero-main">
            <div className="album-v1__cover-wrap">
              <AlbumHeroCover
                rval={data.rval}
                title={data.title}
                artistName={data.artistName}
                releaseYear={data.releaseYear}
                coverUrl={data.coverUrl}
              />
            </div>
            <div className="album-v1__identity">
              <p className="album-v1__eyebrow">Album</p>
              <h1 className="album-v1__name">{data.title}</h1>
              <p className="album-v1__artist-line">
                <Link href={data.artistHref} prefetch className="album-v1__artist-link">
                  {data.artistName}
                </Link>
                {data.releaseYear != null && info.yearHref ? (
                  <>
                    <span className="album-v1__dot"> · </span>
                    <Link href={info.yearHref} prefetch className="album-v1__year-link">
                      {yearLabel}
                    </Link>
                  </>
                ) : data.releaseYear != null ? (
                  <>
                    <span className="album-v1__dot"> · </span>
                    <span className="album-v1__year">{yearLabel}</span>
                  </>
                ) : null}
              </p>
              {heroMeta.length > 0 ? (
                <p className="album-v1__tagline">{heroMeta.join(" · ")}</p>
              ) : null}
            </div>
          </div>
        </header>

        {data.description ? (
          <section className="album-v1__section album-v1__overview" aria-labelledby="album-description">
            <h2 id="album-description" className="album-v1__section-title">
              About this album
            </h2>
            <p className="album-v1__overview-text">{data.description}</p>
          </section>
        ) : null}

        {data.tracks.length > 0 ? (
          <section className="album-v1__section" aria-labelledby="album-tracks">
            <h2 id="album-tracks" className="album-v1__section-title">
              Tracks
            </h2>
            <p className="album-v1__section-lead">Tap a row for the song page when available</p>
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
          <section className="album-v1__section album-v1__chart" aria-labelledby="album-chart-journey">
            <h2 id="album-chart-journey" className="album-v1__section-title">
              Chart journey
            </h2>
            <ChartJourney
              weeks={data.trajectoryWeeks}
              peak={data.b200Peak}
              chartLabel={data.chartRunLabel}
              maxRank={200}
              releaseYear={data.releaseYear}
              variant="rv2"
              hideTimeline
              summary={journeySummary}
              className="album-v1__chart-journey"
            />
          </section>
        ) : null}

        {data.similarChartJourneys.length > 0 ? (
          <section className="album-v1__section" aria-labelledby="album-similar">
            <h2 id="album-similar" className="album-v1__section-title">
              Albums with a similar chart journey
            </h2>
            <ul className="album-v1__similar-list">
              {data.similarChartJourneys.map((album) => (
                <li key={album.rval}>
                  <Link href={album.href} prefetch className="album-v1__similar-card">
                    <ArtistCover
                      src={album.coverUrl ?? data.coverUrl}
                      alt=""
                      className="album-v1__similar-art"
                      fallbackClassName="album-v1__similar-art album-v1__similar-art--fallback"
                      fallbackVariant="plate"
                      placeholderContext={{
                        artist: album.artistName,
                        album: album.title,
                        releaseYear: album.releaseYear,
                        rval: album.rval,
                      }}
                    />
                    <div className="album-v1__similar-copy">
                      <span className="album-v1__similar-title">{album.title}</span>
                      <span className="album-v1__similar-artist">{album.artistName}</span>
                      {album.releaseYear != null ? (
                        <span className="album-v1__similar-year">{album.releaseYear}</span>
                      ) : null}
                      <span className="album-v1__similar-reason">{album.reason}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {infoRows.length > 0 || info.relatedExperiences.length > 0 ? (
          <section className="album-v1__section album-v1__info" aria-labelledby="album-info">
            <h2 id="album-info" className="album-v1__section-title">
              Other information
            </h2>
            {infoRows.length > 0 ? (
              <dl className="album-v1__info-list">
                {infoRows.map((row) => (
                  <div key={row.label} className="album-v1__info-row">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
                <div className="album-v1__info-row">
                  <dt>Artist</dt>
                  <dd>
                    <Link href={info.artistHref} prefetch>
                      {data.artistName}
                    </Link>
                  </dd>
                </div>
                {info.yearHref ? (
                  <div className="album-v1__info-row">
                    <dt>Year</dt>
                    <dd>
                      <Link href={info.yearHref} prefetch>
                        {data.releaseYear}
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
            {info.relatedExperiences.length > 0 ? (
              <ul className="album-v1__related-links">
                {info.relatedExperiences.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} prefetch className="album-v1__related-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <footer className="album-v1__footer">
          <Link href="/" prefetch className="album-v1__footer-link album-v1__footer-link--live">
            Return to Live
          </Link>
          <Link href="/search" prefetch className="album-v1__footer-link">
            Search
          </Link>
          <Link href={data.artistHref} prefetch className="album-v1__footer-link">
            {data.artistName}
          </Link>
        </footer>
      </div>
    </Rv2PublicShell>
  );
}
