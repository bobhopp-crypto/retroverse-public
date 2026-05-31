"use client";

import Link from "next/link";

import {
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
  className,
}: SongActionsProps) {
  const inspectHref = songInspectHref(target);
  const trackHref = songPageHrefForTarget(target);
  const artistHref = songArtistHref(target);
  const yearHref = songRvYearHref(target);
  const chartsHref = songChartsHref(target);

  const stopBubble = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`song-actions song-actions--${layout}${minimal ? " song-actions--minimal" : ""}${className ? ` ${className}` : ""}`}
      onClick={stopBubble}
      role="group"
      aria-label={`Actions for ${target.title}`}
    >
      <button
        type="button"
        className="song-actions__btn"
        aria-label={`Play ${target.title} (coming soon)`}
        disabled
        onClick={stopBubble}
      >
        ▶
      </button>
      <button
        type="button"
        className="song-actions__btn"
        aria-label={`Add ${target.title} to queue (coming soon)`}
        disabled
        onClick={stopBubble}
      >
        +
      </button>
      {!minimal && trackHref ? (
        <ActionLink href={trackHref} label={`Open ${target.title}`} onClick={stopBubble}>
          ↗
        </ActionLink>
      ) : null}
      {!minimal && artistHref ? (
        <ActionLink href={artistHref} label={`Open ${target.artist}`} onClick={stopBubble}>
          ★
        </ActionLink>
      ) : null}
      {!minimal && yearHref ? (
        <ActionLink href={yearHref} label={`Open RV year for ${target.title}`} onClick={stopBubble}>
          Y
        </ActionLink>
      ) : null}
      {!minimal && chartsHref ? (
        <ActionLink href={chartsHref} label={`Chart journey for ${target.artist}`} onClick={stopBubble}>
          ⌁
        </ActionLink>
      ) : null}
      <ActionLink href={inspectHref} label={`Inspect ${target.title}`} onClick={stopBubble}>
        ◎
      </ActionLink>
    </div>
  );
}
