"use client";

import Link from "next/link";
import { useState } from "react";

import { AlbumCoverCuratorModal } from "@/app/components/album-cover-curator-modal";

import { ArtistCover } from "./artist-cover";

type Props = {
  pgAlbumId: number;
  title: string;
  releaseYear: number | null;
  rval: string | null;
  coverUrl: string | null;
  artistName: string;
  href: string;
};

export function ArtistAlbumTile({
  pgAlbumId,
  title,
  releaseYear,
  rval,
  coverUrl: initialCover,
  artistName,
  href,
}: Props) {
  const [coverUrl, setCoverUrl] = useState(initialCover);
  const [curatorOpen, setCuratorOpen] = useState(false);

  return (
    <>
      <article className="artist-album-tile artist-album-tile--curated">
        <Link href={href} prefetch className="artist-album-tile__link">
          <ArtistCover
            src={coverUrl}
            alt=""
            className="artist-album-tile__cover"
            fallbackClassName="artist-album-tile__fallback"
            fallbackVariant="plate"
            plateDensity="compact"
            placeholderContext={{
              rval: rval ?? undefined,
              artist: artistName,
              album: title,
              releaseYear,
            }}
          />
          <p className="artist-album-tile__title">{title}</p>
          <p className="artist-album-tile__meta">{releaseYear ?? "—"}</p>
        </Link>
        {rval ? (
          <button
            type="button"
            className="artist-album-tile__curator"
            aria-label={`Curate cover for ${title}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCuratorOpen(true);
            }}
          >
            ◎
          </button>
        ) : null}
      </article>
      {curatorOpen && rval ? (
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
