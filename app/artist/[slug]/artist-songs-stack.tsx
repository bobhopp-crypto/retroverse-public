"use client";

import { SongsJukeboxReel } from "@/app/components/songs-jukebox-reel";
import { artistTrackToJukeboxRow } from "@/lib/songs/jukebox-row";
import type { ArtistTrackCard } from "@/lib/artist/types";

type Props = {
  tracks: ArtistTrackCard[];
  artistName: string;
};

/** Artist Songs — vertical 3-card stack (styles in artist-page.css only). */
export function ArtistSongsStack({ tracks, artistName }: Props) {
  const rows = tracks.map((t) => artistTrackToJukeboxRow(t, artistName));
  if (rows.length === 0) return null;

  return (
    <div className="artist-songs-stack">
      <SongsJukeboxReel rows={rows} idPrefix="artist-song-reel" />
    </div>
  );
}
