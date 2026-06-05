import Link from "next/link";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { formatSongYear } from "@/lib/artist/format-track-card";
import type { TrackPageData } from "@/lib/track/load-track-page";

import {
  TrackAlbumsSection,
  TrackChartSection,
  TrackRelatedSection,
  trackPageIsSparse,
} from "./track-page-sections";
import "./track-page.css";

type TrackPageViewProps = {
  data: TrackPageData;
};

export function TrackPageView({ data }: TrackPageViewProps) {
  const yearLabel = formatSongYear(data.releaseYear);
  const exhibitSparse = trackPageIsSparse(data);

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
              album: data.albums[0]?.title ?? data.title,
              releaseYear: data.releaseYear ?? data.albums[0]?.releaseYear ?? null,
              rval: data.albums[0]?.rval ?? undefined,
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

      <TrackAlbumsSection data={data} />
      <TrackChartSection data={data} />
      <TrackRelatedSection data={data} />

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
