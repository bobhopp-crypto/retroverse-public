"use client";

import Link from "next/link";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { buildYouTubeSearchUrl } from "@/lib/ops/youtube-search";
import { playTrackByRvtr } from "@/lib/playback/play-track-client";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";
import type { AlbumTrackRow } from "@/lib/album/load-album-page";

type Props = {
  tracks: AlbumTrackRow[];
  artistName: string;
  albumTitle: string;
  releaseYear: number | null;
  albumCoverUrl: string | null;
  rval: string;
};

function rowHasDirectPlay(status: TrackCoverageStatus): boolean {
  return status === "owned" || status === "youtube";
}

function AlbumExplorerPlayButton({
  track,
  artistName,
}: {
  track: AlbumTrackRow;
  artistName: string;
}) {
  const direct = rowHasDirectPlay(track.coverageStatus);

  return (
    <button
      type="button"
      className={[
        "explorer-btn",
        "explorer-btn--play",
        direct ? "explorer-btn--play-direct" : "explorer-btn--play-search",
      ].join(" ")}
      aria-label={direct ? `Play ${track.title}` : `Search YouTube for ${track.title}`}
      onClick={(event) => {
        event.stopPropagation();
        if (direct && track.rvtr) {
          void playTrackByRvtr({ rvtr: track.rvtr, title: track.title, artist: artistName });
          return;
        }
        window.open(buildYouTubeSearchUrl(artistName, track.title), "_blank", "noopener,noreferrer");
      }}
    >
      ▶
    </button>
  );
}

function AlbumExplorerLibraryButton({ track }: { track: AlbumTrackRow }) {
  const inLibrary = track.coverageStatus === "owned";

  return (
    <button
      type="button"
      className={[
        "explorer-btn",
        inLibrary ? "explorer-btn--library-check" : "explorer-btn--library-acquire",
      ].join(" ")}
      aria-label={
        inLibrary ? `${track.title} is in your library` : `Acquire ${track.title} into library (coming soon)`
      }
      disabled
      title={inLibrary ? "In VirtualDJ library" : "Acquire into VirtualDJ library (coming soon)"}
    >
      {inLibrary ? "✓" : "+"}
    </button>
  );
}

function AlbumExplorerTrackRow({
  track,
  artistName,
  albumTitle,
  releaseYear,
  albumCoverUrl,
  rval,
}: {
  track: AlbumTrackRow;
  artistName: string;
  albumTitle: string;
  releaseYear: number | null;
  albumCoverUrl: string | null;
  rval: string;
}) {
  const mainBlock = (
    <>
      <span className="explorer-row__rank">{track.position}</span>
      <div className="explorer-row__main">
        <ArtistCover
          src={track.coverUrl ?? albumCoverUrl}
          alt=""
          className="explorer-row__art"
          fallbackClassName="explorer-row__art explorer-row__art--fallback"
          fallbackVariant="plate"
          placeholderContext={{
            artist: artistName,
            album: albumTitle,
            releaseYear,
            rval,
          }}
        />
        <div className="explorer-row__text">
          <p className="explorer-row__title">{track.title}</p>
          <p className="explorer-row__artist album-explorer-row__meta-spacer" aria-hidden="true">
            &nbsp;
          </p>
        </div>
      </div>
    </>
  );

  const hitArea = track.href ? (
    <Link href={track.href} prefetch className="explorer-row__hit">
      {mainBlock}
    </Link>
  ) : (
    <div className="explorer-row__hit explorer-row__hit--static">{mainBlock}</div>
  );

  return (
    <li className="explorer-row-item">
      <article className="explorer-row">
        {hitArea}
        <div className="explorer-row__actions">
          <AlbumExplorerPlayButton track={track} artistName={artistName} />
          <AlbumExplorerLibraryButton track={track} />
        </div>
      </article>
    </li>
  );
}

export function AlbumExplorerTrackRows({
  tracks,
  artistName,
  albumTitle,
  releaseYear,
  albumCoverUrl,
  rval,
}: Props) {
  if (tracks.length === 0) return null;

  return (
    <ol className="explorer-rows album-explorer-rows">
      {tracks.map((track) => (
        <AlbumExplorerTrackRow
          key={`${track.position}-${track.title}`}
          track={track}
          artistName={artistName}
          albumTitle={albumTitle}
          releaseYear={releaseYear}
          albumCoverUrl={albumCoverUrl}
          rval={rval}
        />
      ))}
    </ol>
  );
}
