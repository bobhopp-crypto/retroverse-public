"use client";

import Link from "next/link";

import { songInspectHref, type SongActionTarget } from "@/lib/songs/song-actions";

import "./song-actions.css";

type SongActionsProps = {
  target: SongActionTarget;
  layout?: "stack" | "inline";
  className?: string;
};

export function SongActions({ target, layout = "stack", className }: SongActionsProps) {
  const inspectHref = songInspectHref(target);

  const stopBubble = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`song-actions song-actions--${layout}${className ? ` ${className}` : ""}`}
      onClick={stopBubble}
      role="group"
      aria-label={`Actions for ${target.title}`}
    >
      <button
        type="button"
        className="song-actions__btn"
        aria-label={`Play ${target.title}`}
        onClick={stopBubble}
      >
        ▶
      </button>
      <button
        type="button"
        className="song-actions__btn"
        aria-label={`Add ${target.title}`}
        onClick={stopBubble}
      >
        +
      </button>
      <Link
        href={inspectHref}
        className="song-actions__btn song-actions__btn--link"
        aria-label={`Inspect ${target.title}`}
        onClick={stopBubble}
      >
        ◎
      </Link>
    </div>
  );
}
