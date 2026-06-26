import Link from "next/link";

import { ChartJourney } from "@/components/retroverse/experience/ChartJourney";
import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { formatSongYear } from "@/lib/artist/format-track-card";
import type { TrackPageData } from "@/lib/track/load-track-page";

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
      <ul className="track-albums__list">
        {data.albums.map((album) => {
          const body = (
            <>
              <span className="track-album-module__cover-wrap">
                <ArtistCover
                  src={album.coverUrl}
                  alt=""
                  className="track-album-module__cover"
                  fallbackClassName="track-album-module__cover-fallback"
                  fallbackVariant="plate"
                  placeholderContext={{
                    artist: data.artistName,
                    album: album.title,
                    releaseYear: album.releaseYear,
                  }}
                  plateDensity="compact"
                />
              </span>
              <span className="track-album-module__text">
                <span className="track-album-module__title">{album.title}</span>
                {album.releaseYear != null ? (
                  <span className="track-album-module__year">
                    {formatSongYear(album.releaseYear)}
                  </span>
                ) : null}
              </span>
            </>
          );

          return (
            <li key={album.rval ?? album.title}>
              {album.href ? (
                <Link href={album.href} prefetch className="track-album-module">
                  {body}
                </Link>
              ) : (
                <div className="track-album-module track-album-module--static">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TrackChartSection({ data }: SectionProps) {
  if (data.trajectoryWeeks.length === 0) return null;

  return (
    <section className="track-journey" aria-label="Chart journey">
      <ChartJourney
        weeks={data.trajectoryWeeks}
        peak={data.peakHot100}
        chartLabel={data.chartRunLabel}
        focusTrackId={data.rvtr}
        releaseYear={data.releaseYear}
        variant="exhibit"
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
