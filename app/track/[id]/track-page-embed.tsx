"use client";

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
import "./track-page-embed.css";

type Props = {
  data: TrackPageData;
};

function formatPeakLine(data: TrackPageData): string | null {
  const parts: string[] = [];
  if (data.peakHot100 != null) parts.push(`Peak #${data.peakHot100}`);
  if (data.chartWeeks > 0) {
    parts.push(`${data.chartWeeks} week${data.chartWeeks === 1 ? "" : "s"}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function TrackPageEmbed({ data }: Props) {
  const yearLabel = formatSongYear(data.releaseYear);
  const peakLine = formatPeakLine(data);
  const sparse = trackPageIsSparse(data);

  return (
    <article className="track-embed" aria-label={`${data.title} by ${data.artistName}`}>
      <header className="track-embed__header">
        <div className="track-embed__cover-wrap">
          <ArtistCover
            src={data.coverUrl}
            alt=""
            className="track-embed__cover"
            fallbackClassName="track-embed__cover-fallback"
            fallbackVariant="plate"
            placeholderContext={{
              artist: data.artistName,
              album: data.albums[0]?.title ?? data.title,
              releaseYear: data.releaseYear ?? data.albums[0]?.releaseYear ?? null,
              rval: data.albums[0]?.rval ?? undefined,
            }}
          />
        </div>
        <div className="track-embed__identity">
          <p className="track-embed__label">Now playing</p>
          <h2 className="track-embed__title">{data.title}</h2>
          <p className="track-embed__artist-line">
            <Link href={data.artistHref} prefetch className="track-embed__artist">
              {data.artistName}
            </Link>
            {data.releaseYear != null ? (
              <>
                <span className="track-embed__dot"> · </span>
                <span className="track-embed__year">{yearLabel}</span>
              </>
            ) : null}
          </p>
          {peakLine ? <p className="track-embed__stats">{peakLine}</p> : null}
        </div>
      </header>

      {sparse ? (
        <p className="track-embed__sparse" role="status">
          Nothing in the archive yet — this recording is still being indexed.
        </p>
      ) : null}

      <TrackAlbumsSection data={data} />
      <TrackChartSection data={data} />
      <TrackRelatedSection data={data} />
    </article>
  );
}
