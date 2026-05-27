import Link from "next/link";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { TrackChartRunRail } from "@/app/track/[id]/track-chart-run-rail";
import {
  formatSongPeakLabel,
  formatSongWeeksLabel,
  formatSongYear,
} from "@/lib/artist/format-track-card";
import type { AlbumPageData } from "@/lib/album/load-album-page";

import "../../track/[id]/track-page.css";
import "./album-page.css";

type AlbumPageViewProps = {
  data: AlbumPageData;
};

function formatChartDate(value: string): string {
  const d = value.slice(0, 10);
  if (d.length < 10) return value;
  const [y, m, day] = d.split("-");
  const month = new Date(Number(y), Number(m) - 1, Number(day)).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return month;
}

export function AlbumPageView({ data }: AlbumPageViewProps) {
  const peakLabel = formatSongPeakLabel(data.b200Peak);
  const weeksLabel = formatSongWeeksLabel(data.chartWeeks);
  const yearLabel = formatSongYear(data.releaseYear);
  const hasTrajectory = data.trajectoryWeeks.length > 0;

  return (
    <div className="track-exhibit album-exhibit">
      <div className="track-exhibit__grain" aria-hidden />

      <header className="track-topbar">
        <Link href="/" className="track-logo" prefetch>
          Retroverse
        </Link>
        <span className="track-file-tag">Album</span>
      </header>

      <section className="track-hero" aria-label={`${data.title} album page`}>
        <div className="track-hero__cover-wrap">
          <ArtistCover
            src={data.coverUrl}
            alt=""
            className="track-hero__cover"
            fallbackClassName="track-hero__cover-fallback"
            fallbackVariant="plate"
          />
        </div>
        <div className="track-hero__identity">
          <p className="track-hero__eyebrow">From the archive</p>
          <h1 className="track-hero__title">{data.title}</h1>
          <p className="track-hero__artist-line">
            <Link href={data.artistHref} prefetch className="track-hero__artist">
              {data.artistName}
            </Link>
            {data.releaseYear != null ? (
              <>
                <span className="track-hero__dot"> · </span>
                <span className="track-hero__year">{yearLabel}</span>
              </>
            ) : null}
          </p>
        </div>
      </section>

      {data.tracks.length > 0 ? (
        <section className="album-tracklist" aria-labelledby="album-tracks">
          <div className="track-section-head track-section-head--dark">
            <h2 id="album-tracks">Tracks</h2>
            <Link href={data.artistHref} prefetch className="track-section-link track-section-link--light">
              {data.artistName} →
            </Link>
          </div>
          <ol className="album-tracklist__list">
            {data.tracks.map((track) => (
              <li key={`${track.position}-${track.title}`} className="album-tracklist__item">
                {track.href ? (
                  <Link href={track.href} prefetch className="album-tracklist__row album-tracklist__row--link">
                    <span className="album-tracklist__position">{track.position}</span>
                    <span className="album-tracklist__title">{track.title}</span>
                  </Link>
                ) : (
                  <div className="album-tracklist__row">
                    <span className="album-tracklist__position">{track.position}</span>
                    <span className="album-tracklist__title">{track.title}</span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {hasTrajectory ? (
        <section className="track-journey" aria-labelledby="album-chart-journey">
          <div className="track-section-head track-section-head--journey">
            <h2 id="album-chart-journey">Album journey</h2>
            {data.rvYearHref ? (
              <Link href={data.rvYearHref} className="track-section-link">
                Open {yearLabel} →
              </Link>
            ) : null}
          </div>
          <p className="track-journey__lead album-journey__lead">
            <strong>{peakLabel}</strong>
            {weeksLabel ? (
              <>
                {" "}
                · {weeksLabel} on chart
              </>
            ) : null}
            {data.firstChartDate ? (
              <>
                {" "}
                · from {formatChartDate(data.firstChartDate)}
              </>
            ) : null}
          </p>
          <TrackChartRunRail
            weeks={data.trajectoryWeeks}
            peak={data.b200Peak}
            chartLabel={data.chartRunLabel}
            scaleFloorLabel="#200"
            maxRank={200}
            ariaLabel="Album chart journey"
            panelClassName="album-trajectory-panel"
          />
        </section>
      ) : null}


      <nav className="exhibit-footer-nav" aria-label="Site">
        <Link href="/" prefetch>
          Home
        </Link>
        <Link href="/search" prefetch>
          Search
        </Link>
        <Link href={data.artistHref} prefetch>
          {data.artistName}
        </Link>
      </nav>
    </div>
  );
}
