"use client";

import { useEffect, useState } from "react";

import { ArchiveCoverPlate } from "@/components/artwork/ArchiveCoverPlate";
import type { AlbumPlaceholderContext } from "@/lib/artwork/album-placeholder-variant";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  /** plate = archival metadata plate; vinyl = decorative deck (artist hero tiles) */
  fallbackVariant?: "plate" | "vinyl";
  placeholderContext?: AlbumPlaceholderContext;
  plateDensity?: "default" | "compact" | "dense";
};

export function ArtistCover({
  src,
  alt,
  className = "",
  fallbackClassName = "artist-cover-fallback",
  fallbackVariant = "vinyl",
  placeholderContext,
  plateDensity = "default",
}: Props) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  const show = Boolean(src?.trim()) && !broken;

  if (!show) {
    if (placeholderContext) {
      return (
        <ArchiveCoverPlate
          context={placeholderContext}
          className={fallbackClassName}
          density={plateDensity}
        />
      );
    }

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
