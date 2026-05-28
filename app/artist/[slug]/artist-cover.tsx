"use client";

import { useState } from "react";

import {
  albumPlaceholderStyle,
  computeAlbumPlaceholderVariant,
  type AlbumPlaceholderContext,
} from "@/lib/artwork/album-placeholder-variant";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  /** plate = calm archival gradient; vinyl = decorative deck (artist tiles) */
  fallbackVariant?: "plate" | "vinyl";
  /** Deterministic era/artist placeholder when cover URL missing or broken. */
  placeholderContext?: AlbumPlaceholderContext;
};

export function ArtistCover({
  src,
  alt,
  className = "",
  fallbackClassName = "artist-cover-fallback",
  fallbackVariant = "vinyl",
  placeholderContext,
}: Props) {
  const [broken, setBroken] = useState(false);
  const show = Boolean(src?.trim()) && !broken;

  if (!show) {
    const ph =
      placeholderContext != null
        ? computeAlbumPlaceholderVariant(placeholderContext)
        : null;
    const phStyle =
      placeholderContext != null ? albumPlaceholderStyle(placeholderContext) : undefined;

    return (
      <div
        className={`${fallbackClassName}${ph ? " cover-fallback--variant" : ""}`}
        style={phStyle}
        data-ph-era={ph?.era}
        data-ph-compilation={ph?.isCompilation ? "1" : undefined}
        aria-hidden
      >
        {fallbackVariant === "vinyl" ? <span className="artist-cover-fallback__vinyl" /> : null}
        {ph && fallbackVariant === "plate" ? (
          <span className="cover-fallback__initials">{ph.initials}</span>
        ) : null}
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
