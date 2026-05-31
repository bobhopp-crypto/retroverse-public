"use client";

import Link from "next/link";

import { SongActions } from "@/app/components/song-actions";
import { RetroverseSingleMarker } from "@/app/components/retroverse-single-marker";
import {
  formatSongPeakLabel,
  formatSongWeeksLabel,
  formatSongYear,
} from "@/lib/artist/format-track-card";
import { peakJourneyFill, type RetroverseSongRowData } from "@/lib/songs/retroverse-song-row";
import { songActionTargetFromParts } from "@/lib/songs/song-actions";

import "./retroverse-song-row.css";

type Props = {
  song: RetroverseSongRowData;
  artistName: string;
  artistSlug: string;
};

export function RetroverseSongRow({ song, artistName, artistSlug }: Props) {
  const fill = peakJourneyFill(song.peakHot100);
  const peakLabel = formatSongPeakLabel(song.peakHot100);
  const year = formatSongYear(song.firstChartYear);
  const weeks = formatSongWeeksLabel(song.chartWeeks);
  const library = song.inLibrary ? "In Library" : "—";

  const metaParts = [year !== "—" ? year : null, weeks || null, library].filter(Boolean);

  return (
    <li className="rv-song-row">
      <RetroverseSingleMarker className="rv-song-row__marker" />
      <div className="rv-song-row__body">
        <Link href={song.trackHref} prefetch className="rv-song-row__title">
          {song.title}
        </Link>
        <div className="rv-song-row__journey" aria-label={`Peak ${peakLabel}`}>
          <span className="rv-song-row__peak">{peakLabel}</span>
          <div className="rv-song-row__journey-track">
            <span className="rv-song-row__journey-fill" style={{ width: `${fill}%` }} />
          </div>
        </div>
        <p className="rv-song-row__meta">{metaParts.join(" • ")}</p>
      </div>
      <SongActions
        layout="inline"
        minimal
        className="rv-song-row__actions"
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
