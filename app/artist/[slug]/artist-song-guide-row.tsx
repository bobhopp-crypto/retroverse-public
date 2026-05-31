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

function peakBarFill(peak: number | null): number {
  if (peak == null || peak < 1 || peak > 100) return 0;
  return Math.round(((101 - peak) / 100) * 100);
}

export function ArtistSongGuideRow({
  song,
  artistName,
  artistSlug,
}: {
  song: ArtistChartedSong;
  artistName: string;
  artistSlug: string;
}) {
  const fill = peakBarFill(song.peakHot100);
  const year = formatSongYear(song.firstChartYear);
  const weeks = formatSongWeeksLabel(song.chartWeeks);
  const plays = song.inLibrary ? "In library" : "—";

  return (
    <li className="artist-song-row">
      <RetroverseSingleMarker className="artist-song-row__marker" />
      <Link href={song.trackHref} prefetch className="artist-song-row__title-link">
        {song.title}
      </Link>
      <div className="artist-song-row__stats">
        <span className="artist-song-row__stat artist-song-row__stat--peak">
          {formatSongPeakLabel(song.peakHot100)}
        </span>
        {fill > 0 ? (
          <div className="artist-song-row__peak-bar" aria-hidden>
            <span className="artist-song-row__peak-bar-fill" style={{ width: `${fill}%` }} />
          </div>
        ) : null}
        <span className="artist-song-row__stat-sep">·</span>
        <span className="artist-song-row__stat">{year}</span>
        {weeks ? (
          <>
            <span className="artist-song-row__stat-sep">·</span>
            <span className="artist-song-row__stat">{weeks}</span>
          </>
        ) : null}
        <span className="artist-song-row__stat-sep">·</span>
        <span className="artist-song-row__stat">{plays}</span>
      </div>
      <SongActions
        layout="inline"
        minimal
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
