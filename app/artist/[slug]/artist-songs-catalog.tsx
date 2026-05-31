"use client";

import Link from "next/link";

import type { ArtistChartedSong } from "@/lib/artist/charted-song-types";

import { ArtistSongGuideRow } from "./artist-song-guide-row";

import "./artist-songs-catalog.css";

type Props = {
  artistName: string;
  artistSlug: string;
  songs: ArtistChartedSong[];
  previewLimit?: number;
  songsHref?: string;
};

export function ArtistSongsCatalog({
  artistName,
  artistSlug,
  songs,
  previewLimit,
  songsHref,
}: Props) {
  const isPreview = previewLimit != null && previewLimit > 0;
  const visible = isPreview ? songs.slice(0, previewLimit) : songs;

  return (
    <section
      className={isPreview ? "artist-songs-preview" : "artist-songs-catalog"}
      aria-labelledby={isPreview ? "artist-songs-preview" : "artist-charted-songs"}
    >
      {!isPreview ? (
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
      ) : (
        <h2 id="artist-songs-preview" className="sr-only">
          Top charted songs
        </h2>
      )}

      {visible.length > 0 ? (
        <ol className="artist-songs-catalog__list">
          {visible.map((song) => (
            <ArtistSongGuideRow
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

      {isPreview && songsHref && songs.length > previewLimit! ? (
        <Link href={songsHref} prefetch className="artist-songs-preview__more">
          All charted songs →
        </Link>
      ) : null}
    </section>
  );
}
