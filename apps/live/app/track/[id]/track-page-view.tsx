import Link from "next/link";

import { TrackEventBackLink, TrackExhibitNav } from "@/app/components/track-exhibit-nav";
import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { formatSongYear } from "@/lib/artist/format-track-card";
import type { TrackPageData } from "@/lib/track/load-track-page";

import {
  TrackAlbumsSection,
  TrackChartSection,
  TrackRelatedSection,
  trackPageIsSparse,
} from "./track-page-sections";
import { PublicTrackPlayButton } from "@/app/components/public-track-play-button";

import "@/app/components/public-track-play-button.css";
import "@/app/components/track-exhibit-nav.css";
import "./track-page.css";

type TrackPageViewProps = {
  data: TrackPageData;
  sundayEventActive?: boolean;
};

export function TrackPageView({ data, sundayEventActive = false }: TrackPageViewProps) {
  const yearLabel = formatSongYear(data.releaseYear);
  const exhibitSparse = trackPageIsSparse(data);

  return (
    <div className={`track-exhibit${exhibitSparse ? " track-exhibit--sparse" : ""}`}>
      <div className="track-exhibit__grain" aria-hidden />

      <TrackExhibitNav sundayEventActive={sundayEventActive} />

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
            }}
          />
        </div>
        <div className="track-hero__identity">
          {sundayEventActive ? <TrackEventBackLink /> : null}
          <p className="track-hero__eyebrow">From the archive</p>
          <div className="track-hero__title-row">
            <h1 className="track-hero__title">{data.title}</h1>
            <PublicTrackPlayButton
              rvtr={data.rvtr}
              title={data.title}
              artist={data.artistName}
            />
          </div>
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
        <Link href="/sunday-nights" prefetch>
          Sunday Nights
        </Link>
        <Link href="/search" prefetch>
          Search
        </Link>
        <Link href="/search" prefetch>
          Artists
        </Link>
        <Link href="/retroverse-2/charts" prefetch>
          Years
        </Link>
      </nav>
    </div>
  );
}
