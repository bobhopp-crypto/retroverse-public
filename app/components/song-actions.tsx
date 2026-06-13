"use client";

import Link from "next/link";

import { playTrackByRvtr } from "@/lib/playback/play-track-client";
import {
  rvtrFromToken,
  songArtistHref,
  songChartsHref,
  songInspectHref,
  songPageHrefForTarget,
  songRvYearHref,
  type SongActionTarget,
} from "@/lib/songs/song-actions";

import "./song-actions.css";

type SongActionsProps = {
  target: SongActionTarget;
  layout?: "stack" | "inline";
  /** Hub rows: ▶ + ◎ only */
  minimal?: boolean;
  /** Omit disabled or href-less actions (chart cards). */
  omitUnavailable?: boolean;
  className?: string;
};

function ActionLink({
  href,
  label,
  children,
  onClick,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  onClick: (event: React.MouseEvent) => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="song-actions__btn song-actions__btn--link"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export function SongActions({
  target,
  layout = "stack",
  minimal = false,
  omitUnavailable = false,
  className,
}: SongActionsProps) {
  const inspectHref = songInspectHref(target);
  const trackHref = songPageHrefForTarget(target);
  const artistHref = songArtistHref(target);
  const yearHref = songRvYearHref(target);
  const chartsHref = songChartsHref(target);
  const rvtr = rvtrFromToken(target.rvtr);

  const stopBubble = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const handlePlay = (event: React.MouseEvent) => {
    stopBubble(event);
    if (!rvtr) return;
    void playTrackByRvtr({
      rvtr,
      title: target.title,
      artist: target.artist,
    });
  };

  return (
    <div
      className={`song-actions song-actions--${layout}${minimal ? " song-actions--minimal" : ""}${className ? ` ${className}` : ""}`}
      onClick={stopBubble}
      role="group"
      aria-label={`Actions for ${target.title}`}
    >
      {(rvtr || !omitUnavailable) ? (
        <button
          type="button"
          className="song-actions__btn"
          aria-label={rvtr ? `Play ${target.title}` : `Play ${target.title} (no RVTR)`}
          disabled={!rvtr}
          onClick={handlePlay}
        >
          ▶
        </button>
      ) : null}
      {!omitUnavailable ? (
        <button
          type="button"
          className="song-actions__btn"
          aria-label={`Add ${target.title} to queue (coming soon)`}
          disabled
          onClick={stopBubble}
        >
          +
        </button>
      ) : null}
      {!minimal && !omitUnavailable && trackHref ? (
        <ActionLink href={trackHref} label={`Open ${target.title}`} onClick={stopBubble}>
          ↗
        </ActionLink>
      ) : null}
      {omitUnavailable && trackHref ? (
        <ActionLink href={trackHref} label={`Open ${target.title}`} onClick={stopBubble}>
          ↗
        </ActionLink>
      ) : null}
      {!minimal && !omitUnavailable && artistHref ? (
        <ActionLink href={artistHref} label={`Open ${target.artist}`} onClick={stopBubble}>
          ★
        </ActionLink>
      ) : null}
      {!minimal && !omitUnavailable && yearHref ? (
        <ActionLink href={yearHref} label={`Open RV year for ${target.title}`} onClick={stopBubble}>
          Y
        </ActionLink>
      ) : null}
      {!minimal && !omitUnavailable && chartsHref ? (
        <ActionLink href={chartsHref} label={`Chart journey for ${target.artist}`} onClick={stopBubble}>
          ⌁
        </ActionLink>
      ) : null}
      {!omitUnavailable ? (
        <ActionLink href={inspectHref} label={`Inspect ${target.title}`} onClick={stopBubble}>
          ◎
        </ActionLink>
      ) : null}
    </div>
  );
}
