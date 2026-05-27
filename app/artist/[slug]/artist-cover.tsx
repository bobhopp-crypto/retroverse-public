"use client";

import { useState } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  /** plate = calm archival gradient; vinyl = decorative deck (artist tiles) */
  fallbackVariant?: "plate" | "vinyl";
};

export function ArtistCover({
  src,
  alt,
  className = "",
  fallbackClassName = "artist-cover-fallback",
  fallbackVariant = "vinyl",
}: Props) {
  const [broken, setBroken] = useState(false);
  const show = Boolean(src?.trim()) && !broken;

  if (!show) {
    return (
      <div className={fallbackClassName} aria-hidden>
        {fallbackVariant === "vinyl" ? <span className="artist-cover-fallback__vinyl" /> : null}
      </div>
    );
  }

  return (
    <img
      src={src!}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
    />
  );
}
