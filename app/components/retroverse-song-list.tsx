"use client";

import Link from "next/link";

import type { ArtistChartedSong } from "@/lib/artist/charted-song-types";

import { RetroverseSongRow } from "./retroverse-song-row";

import "./retroverse-song-list.css";

type Props = {
  artistName: string;
  artistSlug: string;
  songs: ArtistChartedSong[];
  /** Full page — show header. Omit for exhibit embed. */
  mode?: "page" | "embed";
  previewLimit?: number;
  songsHref?: string;
  moreLabel?: string;
};

export function RetroverseSongList({
  artistName,
  artistSlug,
  songs,
  mode = "page",
  previewLimit,
  songsHref,
  moreLabel = "All singles →",
}: Props) {
  const isEmbed = mode === "embed";
  const visible =
    previewLimit != null && previewLimit > 0 ? songs.slice(0, previewLimit) : songs;

  return (
    <section
      className={isEmbed ? "rv-song-list rv-song-list--embed" : "rv-song-list rv-song-list--page"}
      aria-labelledby={isEmbed ? "artist-songs-preview" : "artist-charted-songs"}
    >
      {!isEmbed ? (
        <header className="rv-song-list__head">
          <p className="rv-song-list__eyebrow">Singles · Hot 100</p>
          <h2 id="artist-charted-songs" className="rv-song-list__title">
            Charted songs
          </h2>
          <p className="rv-song-list__count">
            {songs.length === 0
              ? "No Hot 100 chart entries on file"
              : `${songs.length} charted song${songs.length === 1 ? "" : "s"}`}
          </p>
        </header>
      ) : (
        <h2 id="artist-songs-preview" className="sr-only">
          Singles chronology
        </h2>
      )}

      {visible.length > 0 ? (
        <ol className="rv-song-list__rows">
          {visible.map((song) => (
            <RetroverseSongRow
              key={song.rvtr}
              song={song}
              artistName={artistName}
              artistSlug={artistSlug}
            />
          ))}
        </ol>
      ) : (
        <p className="rv-song-list__empty" role="status">
          Nothing charted on the Hot 100 yet — check back as the archive grows.
        </p>
      )}

      {isEmbed && songsHref && songs.length > 0 ? (
        <Link href={songsHref} prefetch className="rv-song-list__more">
          {moreLabel}
        </Link>
      ) : null}
    </section>
  );
}
