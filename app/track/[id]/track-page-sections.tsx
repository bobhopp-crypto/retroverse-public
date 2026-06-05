import Link from "next/link";

import { formatSongYear } from "@/lib/artist/format-track-card";
import type { TrackPageData } from "@/lib/track/load-track-page";

import { TrackChartRunRail } from "./track-chart-run-rail";

type SectionProps = {
  data: TrackPageData;
};

export function TrackAlbumsSection({ data }: SectionProps) {
  if (data.albums.length === 0) return null;

  return (
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
  );
}

export function TrackChartSection({ data }: SectionProps) {
  const yearLabel = formatSongYear(data.releaseYear);
  if (data.trajectoryWeeks.length === 0) return null;

  return (
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
        portalFocusTrackId={data.rvtr}
      />
    </section>
  );
}

export function TrackRelatedSection({ data }: SectionProps) {
  if (data.relatedTracks.length === 0) return null;

  return (
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
  );
}

export function trackPageIsSparse(data: TrackPageData): boolean {
  return (
    data.albums.length === 0 &&
    data.trajectoryWeeks.length === 0 &&
    data.relatedTracks.length === 0
  );
}
