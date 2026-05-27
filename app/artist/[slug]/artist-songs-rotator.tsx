"use client";

import { SongsJukeboxReel } from "@/app/components/songs-jukebox-reel";
import { artistTrackToJukeboxRow } from "@/lib/songs/jukebox-row";
import type { ArtistTrackCard } from "@/lib/artist/types";

type Props = {
  tracks: ArtistTrackCard[];
  artistName: string;
};

export function ArtistSongsRotator({ tracks, artistName }: Props) {
  const rows = tracks.map((t) => artistTrackToJukeboxRow(t, artistName));
  return <SongsJukeboxReel rows={rows} idPrefix="artist-song-reel" restraint />;
}
