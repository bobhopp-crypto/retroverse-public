"use client";

import { playTrackByRvtr } from "@/lib/playback/play-track-client";

import "./public-track-play-button.css";

type Props = {
  rvtr: string | null | undefined;
  title: string;
  artist: string;
  className?: string;
  size?: "sm" | "md";
  disabled?: boolean;
};

export function PublicTrackPlayButton({
  rvtr,
  title,
  artist,
  className,
  size = "md",
  disabled = false,
}: Props) {
  const canPlay = Boolean(rvtr?.trim()) && !disabled;

  return (
    <button
      type="button"
      className={`public-track-play${size === "sm" ? " public-track-play--sm" : ""}${className ? ` ${className}` : ""}`}
      aria-label={canPlay ? `Play ${title}` : `Play unavailable for ${title}`}
      disabled={!canPlay}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!rvtr?.trim()) return;
        void playTrackByRvtr({ rvtr, title, artist });
      }}
    >
      ▶
    </button>
  );
}
