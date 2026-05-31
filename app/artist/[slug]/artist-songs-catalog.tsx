"use client";

import Link from "next/link";

import { SongActions } from "@/app/components/song-actions";
import {
  formatSongPeakLabel,
  formatSongWeeksLabel,
  formatSongYear,
} from "@/lib/artist/format-track-card";
import type { ArtistChartedSong } from "@/lib/artist/charted-song-types";
import { songActionTargetFromParts } from "@/lib/songs/song-actions";

import { RetroverseSingleMarker } from "./retroverse-single-marker";

import "./artist-songs-catalog.css";

type Props = {
  artistName: string;
  artistSlug: string;
  songs: ArtistChartedSong[];
};

function peakBarFill(peak: number | null): number {
  if (peak == null || peak < 1 || peak > 100) return 0;
  return Math.round(((101 - peak) / 100) * 100);
}

function formatSecondaryMeta(song: ArtistChartedSong): string {
  const parts: string[] = [];
  if (song.albumTitle?.trim()) parts.push(song.albumTitle.trim());
  const year = formatSongYear(song.firstChartYear);
  if (year !== "—") parts.push(year);
  const weeks = formatSongWeeksLabel(song.chartWeeks);
  if (weeks) parts.push(weeks);
  return parts.join(" · ");
}

function ArtistSongRow({
  song,
  artistName,
  artistSlug,
}: {
  song: ArtistChartedSong;
  artistName: string;
  artistSlug: string;
}) {
  const fill = peakBarFill(song.peakHot100);
  const meta = formatSecondaryMeta(song);

  return (
    <li className="artist-song-row">
      <RetroverseSingleMarker className="artist-song-row__marker" />
      <div className="artist-song-row__main">
        <Link href={song.trackHref} prefetch className="artist-song-row__title-link">
          {song.title}
        </Link>
        {meta ? <p className="artist-song-row__meta">{meta}</p> : null}
        {fill > 0 ? (
          <div className="artist-song-row__peak-bar-wrap" aria-hidden>
            <div className="artist-song-row__peak-bar">
              <span
                className="artist-song-row__peak-bar-fill"
                style={{ width: `${fill}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
      <div className="artist-song-row__stamp" aria-label={`Peak ${formatSongPeakLabel(song.peakHot100)}`}>
        <span className="artist-song-row__stamp-peak">{formatSongPeakLabel(song.peakHot100)}</span>
        <span className="artist-song-row__stamp-label">Peak</span>
      </div>
      <SongActions
        layout="inline"
        className="artist-song-row__actions"
        target={songActionTargetFromParts({
          title: song.title,
          artist: artistName,
          rvtr: song.rvtr,
          href: song.trackHref,
          artistSlug,
          chartYear: song.firstChartYear,
        })}
      />
    </li>
  );
}

export function ArtistSongsCatalog({ artistName, artistSlug, songs }: Props) {
  return (
    <section className="artist-songs-catalog" aria-labelledby="artist-charted-songs">
      <header className="artist-songs-catalog__head">
        <p className="artist-songs-catalog__eyebrow">Singles · Hot 100</p>
        <h2 id="artist-charted-songs" className="artist-songs-catalog__title">
          Charted songs
        </h2>
        <p className="artist-songs-catalog__count">
          {songs.length === 0
            ? "No Hot 100 chart entries on file"
            : `${songs.length} charted song${songs.length === 1 ? "" : "s"}`}
        </p>
      </header>

      {songs.length > 0 ? (
        <ol className="artist-songs-catalog__list">
          {songs.map((song) => (
            <ArtistSongRow
              key={song.rvtr}
              song={song}
              artistName={artistName}
              artistSlug={artistSlug}
            />
          ))}
        </ol>
      ) : (
        <p className="artist-songs-catalog__empty" role="status">
          Nothing charted on the Hot 100 yet — check back as the archive grows.
        </p>
      )}
    </section>
  );
}
