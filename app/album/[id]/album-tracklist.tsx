"use client";

import Link from "next/link";

import { PublicTrackPlayButton } from "@/app/components/public-track-play-button";
import type { AlbumTrackRow } from "@/lib/album/load-album-page";

import "./album-tracklist.css";

type Props = {
  tracks: AlbumTrackRow[];
  artistName: string;
};

export function AlbumTracklist({ tracks, artistName }: Props) {
  return (
    <ol className="album-tracklist__list">
      {tracks.map((track) => (
        <li key={`${track.position}-${track.title}`} className="album-tracklist__item">
          <div className="album-tracklist__row">
            <span className="album-tracklist__position">{track.position}</span>
            <PublicTrackPlayButton
              rvtr={track.rvtr}
              title={track.title}
              artist={artistName}
              size="sm"
            />
            {track.href ? (
              <Link href={track.href} prefetch className="album-tracklist__title album-tracklist__title--link">
                {track.title}
              </Link>
            ) : (
              <span className="album-tracklist__title">{track.title}</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
