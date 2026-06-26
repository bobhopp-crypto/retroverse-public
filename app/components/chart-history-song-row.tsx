"use client";

import Link from "next/link";

import { SongActions } from "@/app/components/song-actions";
import {
  formatSongWeeksLabel,
  formatSongYear,
} from "@/lib/artist/format-track-card";
import type { ChartHistorySongRowData } from "@/lib/songs/chart-history-song-row";
import { songActionTargetFromParts } from "@/lib/songs/song-actions";

import { TrackCoverageBadge } from "@/app/components/track-coverage-badge";
import "@/app/components/track-coverage.css";

import { ChartHistoryJourneyBar } from "./chart-history-journey-bar";

import "./chart-history-song-row.css";

type Props = {
  song: ChartHistorySongRowData;
  artistName: string;
  artistSlug: string;
  showCoverageBadge?: boolean;
};

function defaultMetaLine(song: ChartHistorySongRowData): string {
  const year = formatSongYear(song.firstChartYear);
  const weeks = formatSongWeeksLabel(song.chartWeeks);
  const library =
    song.coverageStatus != null
      ? null
      : song.inLibrary === true
        ? "In Library"
        : song.inLibrary === false
          ? "—"
          : null;
  return [year !== "—" ? year : null, weeks || null, library].filter(Boolean).join(" • ");
}

export function ChartHistorySongRow({ song, artistName, artistSlug, showCoverageBadge = false }: Props) {
  const meta = song.metaLine ?? defaultMetaLine(song);

  return (
    <li className="chart-history-song-row">
      <div className="chart-history-song-row__body">
        <Link href={song.trackHref} prefetch className="chart-history-song-row__title">
          {song.title}
        </Link>
        <ChartHistoryJourneyBar peak={song.peakHot100} />
        <p className="chart-history-song-row__meta">{meta}</p>
        {showCoverageBadge && song.coverageStatus ? (
          <TrackCoverageBadge status={song.coverageStatus} />
        ) : null}
      </div>
      <SongActions
        layout="inline"
        minimal
        className="chart-history-song-row__actions"
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
