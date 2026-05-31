"use client";

import { useState } from "react";

import { AlbumCoverCuratorModal } from "@/app/components/album-cover-curator-modal";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";

type Props = {
  rval: string;
  title: string;
  artistName: string;
  releaseYear: number | null;
  coverUrl: string | null;
};

export function AlbumHeroCover({
  rval,
  title,
  artistName,
  releaseYear,
  coverUrl: initialCover,
}: Props) {
  const [coverUrl, setCoverUrl] = useState(initialCover);
  const [curatorOpen, setCuratorOpen] = useState(false);

  return (
    <>
      <div className="album-hero-cover">
        <ArtistCover
          src={coverUrl}
          alt=""
          className="track-hero__cover"
          fallbackClassName="track-hero__cover-fallback"
          fallbackVariant="plate"
          placeholderContext={{
            rval,
            artist: artistName,
            album: title,
            releaseYear,
          }}
        />
        <button
          type="button"
          className="album-hero-cover__curator"
          aria-label={`Curate cover for ${title}`}
          onClick={() => setCuratorOpen(true)}
        >
          ◎
        </button>
      </div>
      {curatorOpen ? (
        <AlbumCoverCuratorModal
          rval={rval}
          albumTitle={title}
          artistName={artistName}
          releaseYear={releaseYear}
          coverUrl={coverUrl}
          onClose={() => setCuratorOpen(false)}
          onAccepted={(next) => {
            if (next) setCoverUrl(next);
          }}
        />
      ) : null}
    </>
  );
}
