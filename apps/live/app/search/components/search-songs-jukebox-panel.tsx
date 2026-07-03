"use client";

import { useMemo } from "react";
import { SongsJukeboxReel } from "@/app/components/songs-jukebox-reel";
import { songResultToJukeboxRow } from "@/lib/songs/jukebox-row";
import type { SongResult } from "@/lib/search/types";

type Props = {
  id?: string;
  title?: string;
  viewAllHref: string;
  viewAllLabel: string;
  songs: SongResult[];
};

/** Songs only — vertical song stack. Not a carousel; not DiscoverCard. */
export function SearchSongsJukeboxPanel({
  id = "songs",
  title = "Songs",
  viewAllHref,
  viewAllLabel,
  songs,
}: Props) {
  const rows = useMemo(() => songs.map(songResultToJukeboxRow), [songs]);
  const stackKey = rows.map((r) => r.id).join("|");

  if (songs.length === 0 || rows.length === 0) {
    return null;
  }

  return (
    <section
      className="search-songs-jukebox"
      data-songs-ui="song-stack"
      aria-labelledby={`${id}-heading`}
    >
      <div className="search-songs-jukebox__header">
        <h2 id={`${id}-heading`} className="search-songs-jukebox__title">
          {title}
        </h2>
        <a className="search-songs-jukebox__view-all" href={viewAllHref}>
          {viewAllLabel}
        </a>
      </div>

      <div className="search-songs-jukebox__stack">
        <SongsJukeboxReel
          key={stackKey}
          rows={rows}
          idPrefix="search-song-reel"
        />
      </div>
    </section>
  );
}
