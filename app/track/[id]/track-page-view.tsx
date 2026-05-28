import Link from "next/link";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { formatSongYear } from "@/lib/artist/format-track-card";
import type { TrackPageData } from "@/lib/track/load-track-page";

import { TrackChartRunRail } from "./track-chart-run-rail";
import "./track-page.css";

type TrackPageViewProps = {
  data: TrackPageData;
};

export function TrackPageView({ data }: TrackPageViewProps) {
  const yearLabel = formatSongYear(data.releaseYear);
  const hasTrajectory = data.trajectoryWeeks.length > 0;
  const exhibitSparse =
    data.albums.length === 0 && !hasTrajectory && data.relatedTracks.length === 0;

  return (
    <div className={`track-exhibit${exhibitSparse ? " track-exhibit--sparse" : ""}`}>
      <div className="track-exhibit__grain" aria-hidden />

      <header className="track-topbar">
        <Link href="/" className="track-logo" prefetch>
          Retroverse
        </Link>
        <span className="track-file-tag">Song</span>
      </header>

      <section className="track-hero" aria-label={`${data.title} song page`}>
        <div className="track-hero__cover-wrap">
          <ArtistCover
            src={data.coverUrl}
            alt=""
            className="track-hero__cover"
            fallbackClassName="track-hero__cover-fallback"
            fallbackVariant="plate"
            placeholderContext={{
              artist: data.artistName,
              album: data.title,
              releaseYear: data.releaseYear,
            }}
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
          {exhibitSparse ? (
            <p className="track-sparse-message" role="status">
              Nothing in the archive yet — this recording is still being indexed.
            </p>
          ) : null}
        </div>
      </section>

      {data.albums.length > 0 ? (
        <section className="track-albums" aria-labelledby="track-on-albums">
          <div className="track-section-head">
            <h2 id="track-on-albums">Appears on</h2>
          </div>
          <ul className="track-related__list">
            {data.albums.map((album) => (
              <li key={album.href}>
                <Link href={album.href} prefetch className="track-related__row">
                  <span className="track-related__title">{album.title}</span>
                  <span className="track-related__meta">
                    {formatSongYear(album.releaseYear)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasTrajectory ? (
        <section className="track-journey" aria-labelledby="track-chart-journey">
          <div className="track-section-head track-section-head--journey">
            <h2 id="track-chart-journey">Chart history</h2>
            {data.rvYearHref ? (
              <Link href={data.rvYearHref} prefetch className="track-section-link">
                {yearLabel}
              </Link>
            ) : null}
          </div>
          <TrackChartRunRail
            weeks={data.trajectoryWeeks}
            peak={data.peakHot100}
            chartLabel={data.chartRunLabel}
          />
        </section>
      ) : null}

      {data.relatedTracks.length > 0 ? (
        <section className="track-related" aria-labelledby="track-related-songs">
          <div className="track-section-head track-section-head--dark">
            <h2 id="track-related-songs">Related recordings</h2>
          </div>
          <ul className="track-related__list">
            {data.relatedTracks.map((song) => (
              <li key={song.rvtr}>
                <Link href={song.href} prefetch className="track-related__row">
                  <span className="track-related__title">{song.title}</span>
                  <span className="track-related__meta">
                    {formatSongYear(song.releaseYear)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
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
