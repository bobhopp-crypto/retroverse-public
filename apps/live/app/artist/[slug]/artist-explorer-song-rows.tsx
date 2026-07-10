"use client";

import Link from "next/link";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { buildYouTubeSearchUrl } from "@/lib/ops/youtube-search";
import { playTrackByRvtr } from "@/lib/playback/play-track-client";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";

export type ArtistExplorerSongRow = {
  rvtr: string;
  title: string;
  artistName: string;
  year: number | null;
  peakHot100: number | null;
  coverUrl: string | null;
  trackHref: string;
  coverageStatus: TrackCoverageStatus;
};

function rowHasDirectPlay(status: TrackCoverageStatus): boolean {
  return status === "owned" || status === "youtube";
}

function ExplorerPlayButton({
  row,
}: {
  row: ArtistExplorerSongRow;
}) {
  const direct = rowHasDirectPlay(row.coverageStatus);

  return (
    <button
      type="button"
      className={[
        "explorer-btn",
        "explorer-btn--play",
        direct ? "explorer-btn--play-direct" : "explorer-btn--play-search",
      ].join(" ")}
      aria-label={direct ? `Play ${row.title}` : `Search YouTube for ${row.title}`}
      onClick={(event) => {
        event.stopPropagation();
        if (direct && row.rvtr) {
          void playTrackByRvtr({ rvtr: row.rvtr, title: row.title, artist: row.artistName });
          return;
        }
        window.open(buildYouTubeSearchUrl(row.artistName, row.title), "_blank", "noopener,noreferrer");
      }}
    >
      ▶
    </button>
  );
}

function ExplorerLibraryButton({ row }: { row: ArtistExplorerSongRow }) {
  const inLibrary = row.coverageStatus === "owned";

  return (
    <button
      type="button"
      className={[
        "explorer-btn",
        inLibrary ? "explorer-btn--library-check" : "explorer-btn--library-acquire",
      ].join(" ")}
      aria-label={
        inLibrary ? `${row.title} is in your library` : `Acquire ${row.title} into library (coming soon)`
      }
      disabled
      title={inLibrary ? "In VirtualDJ library" : "Acquire into VirtualDJ library (coming soon)"}
    >
      {inLibrary ? "✓" : "+"}
    </button>
  );
}

function ArtistExplorerSongRowItem({ row }: { row: ArtistExplorerSongRow }) {
  const rankLabel = row.peakHot100 != null ? String(row.peakHot100) : "—";

  const mainBlock = (
    <>
      <span className="explorer-row__rank">{rankLabel}</span>
      <div className="explorer-row__main">
        <ArtistCover
          src={row.coverUrl}
          alt=""
          className="explorer-row__art"
          fallbackClassName="explorer-row__art explorer-row__art--fallback"
          fallbackVariant="vinyl"
          placeholderContext={{
            artist: row.artistName,
            album: row.title,
            releaseYear: row.year,
            rval: row.rvtr,
          }}
        />
        <div className="explorer-row__text">
          <p className="explorer-row__title">{row.title}</p>
          {row.year != null ? (
            <p className="explorer-row__artist">{row.year}</p>
          ) : (
            <p className="explorer-row__artist artist-explorer-row__meta-spacer" aria-hidden="true">
              &nbsp;
            </p>
          )}
        </div>
      </div>
    </>
  );

  const hitArea = row.trackHref ? (
    <Link href={row.trackHref} prefetch className="explorer-row__hit">
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
          <ExplorerPlayButton row={row} />
          <ExplorerLibraryButton row={row} />
        </div>
      </article>
    </li>
  );
}

type Props = {
  songs: ArtistExplorerSongRow[];
};

export function ArtistExplorerSongRows({ songs }: Props) {
  if (songs.length === 0) return null;

  return (
    <ol className="explorer-rows artist-explorer-rows">
      {songs.map((row) => (
        <ArtistExplorerSongRowItem key={row.rvtr} row={row} />
      ))}
    </ol>
  );
}
