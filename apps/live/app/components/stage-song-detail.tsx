"use client";

import { vdjbxStillUrl } from "@/lib/vdjbx-catalog";

export type StageSong = {
  videoKey: string;
  title: string;
  artist: string;
  year?: number | null;
};

export type StageSongDetailMode = "info" | "jukebox";

type StageSongDetailProps = {
  song: StageSong;
  mode: StageSongDetailMode;
  requestsEnabled: boolean;
  queuePosition?: number;
  pending: boolean;
  onClose: () => void;
  onRequest?: (video: StageSong) => void;
};

export function StageSongDetail({ song, mode, requestsEnabled, queuePosition, pending, onClose, onRequest }: StageSongDetailProps) {
  const requested = Boolean(queuePosition);
  const still = vdjbxStillUrl(song.videoKey);

  return (
    <div className="rv-detail-layer" role="presentation" onClick={onClose}>
      <section className="rv-detail" role="dialog" aria-label="Song details" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="rv-detail-close" aria-label="Close song details" onClick={onClose}>×</button>
        <div className="rv-detail-head">
          <div className="rv-detail-frame">
            {still ? <img src={still} alt="" /> : <div className="rv-detail-frame__fallback" aria-hidden="true">♫</div>}
          </div>
          <h2>{song.title}</h2>
          <p className="rv-detail-artist">{song.artist}</p>
          {song.year != null ? <p className="rv-detail-year">{song.year}</p> : null}
          {mode === "jukebox" && requestsEnabled ? (
            <button
              type="button"
              className={`rv-detail-request${requested ? " is-requested" : ""}`}
              disabled={pending || requested}
              onClick={() => onRequest?.(song)}
            >
              {pending ? "Opening…" : requested ? "REQUEST SENT THIS VISIT" : "REQUEST THIS VIDEO"}
            </button>
          ) : null}
        </div>
        <div className="rv-detail-body">
          <section className="rv-detail-section rv-detail-section--ask">
            <button
              type="button"
              className="rv-detail-ask"
              onClick={() => {
                const currentSong = { title: song.title, artist: song.artist, year: song.year ?? null };
                window.dispatchEvent(new CustomEvent("retroverse:song-context", { detail: currentSong }));
                window.dispatchEvent(new CustomEvent("retroverse:open-arvey", { detail: { currentSong } }));
                onClose();
              }}
            >
              Chat about this song
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}

export function toStageSong(video: { videoKey: string; title: string; artist: string; year?: number | null }): StageSong {
  return { videoKey: video.videoKey, title: video.title, artist: video.artist, year: video.year ?? null };
}
