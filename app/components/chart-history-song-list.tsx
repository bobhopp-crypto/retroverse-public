"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ChartHistorySongRowData } from "@/lib/songs/chart-history-song-row";
import {
  sortChartedSongs,
  type ArtistSongSortMode,
} from "@/lib/songs/sort-charted-songs";

import { ChartHistorySongRow } from "./chart-history-song-row";

import "./chart-history-song-list.css";

type Props = {
  artistName: string;
  artistSlug: string;
  songs: ChartHistorySongRowData[];
  mode?: "page" | "embed";
  previewLimit?: number;
  songsHref?: string;
  moreLabel?: string;
  /** Songs page — Date / Performance toggle. Exhibit embed leaves this off. */
  showSortControls?: boolean;
  defaultSortMode?: ArtistSongSortMode;
  showCoverageBadges?: boolean;
};

export function ChartHistorySongList({
  artistName,
  artistSlug,
  songs,
  mode = "page",
  previewLimit,
  songsHref,
  moreLabel = "All songs →",
  showSortControls = false,
  defaultSortMode = "date",
  showCoverageBadges = false,
}: Props) {
  const isEmbed = mode === "embed";
  const [sortMode, setSortMode] = useState<ArtistSongSortMode>(defaultSortMode);

  const ordered = useMemo((): ChartHistorySongRowData[] => {
    if (isEmbed || !showSortControls) return songs;
    return sortChartedSongs(songs, sortMode);
  }, [isEmbed, showSortControls, songs, sortMode]);

  const visible =
    previewLimit != null && previewLimit > 0 ? ordered.slice(0, previewLimit) : ordered;

  return (
    <section
      className={
        isEmbed ? "chart-history-song-list chart-history-song-list--embed" : "chart-history-song-list chart-history-song-list--page"
      }
      aria-labelledby={isEmbed ? "artist-songs-preview" : "artist-charted-songs"}
    >
      {!isEmbed ? (
        <header className="chart-history-song-list__head">
          <div className="chart-history-song-list__head-row">
            <div>
              <p className="chart-history-song-list__eyebrow">Singles · Hot 100</p>
              <h2 id="artist-charted-songs" className="chart-history-song-list__title">
                Charted songs
              </h2>
              <p className="chart-history-song-list__count">
                {songs.length === 0
                  ? "No Hot 100 chart entries on file"
                  : `${songs.length} charted song${songs.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {showSortControls && songs.length > 0 ? (
              <div className="chart-history-song-list__sort" role="group" aria-label="Sort songs">
                <button
                  type="button"
                  className={`chart-history-song-list__sort-btn${sortMode === "date" ? " chart-history-song-list__sort-btn--active" : ""}`}
                  aria-pressed={sortMode === "date"}
                  onClick={() => setSortMode("date")}
                >
                  Date
                </button>
                <button
                  type="button"
                  className={`chart-history-song-list__sort-btn${sortMode === "performance" ? " chart-history-song-list__sort-btn--active" : ""}`}
                  aria-pressed={sortMode === "performance"}
                  onClick={() => setSortMode("performance")}
                >
                  Performance
                </button>
              </div>
            ) : null}
          </div>
        </header>
      ) : (
        <h2 id="artist-songs-preview" className="sr-only">
          Singles chronology
        </h2>
      )}

      {visible.length > 0 ? (
        <ol className="chart-history-song-list__rows">
          {visible.map((song) => (
            <ChartHistorySongRow
              key={song.rvtr}
              song={song}
              artistName={artistName}
              artistSlug={artistSlug}
              showCoverageBadge={showCoverageBadges}
            />
          ))}
        </ol>
      ) : (
        <p className="chart-history-song-list__empty" role="status">
          Nothing charted on the Hot 100 yet — check back as the archive grows.
        </p>
      )}

      {isEmbed && songsHref && songs.length > 0 ? (
        <Link href={songsHref} prefetch className="chart-history-song-list__more">
          {moreLabel}
        </Link>
      ) : null}
    </section>
  );
}
