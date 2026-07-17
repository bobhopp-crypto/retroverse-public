"use client";

import { useEffect, useState } from "react";

import { ArchiveCoverPlate } from "@/components/artwork/ArchiveCoverPlate";

type RvYearCoverProps = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  /** Future public artwork feedback hook — e.g. year-hero-cover, year-chart-cover */
  artworkSlot?: string;
  loading?: "lazy" | "eager";
  artist?: string;
  title?: string;
  onArtworkError?: () => void;
};

export function RvYearCover({
  src,
  alt = "",
  className = "",
  fallbackClassName = "rv-year-cover-fallback",
  artworkSlot,
  loading = "lazy",
  artist = "RetroVerse",
  title = alt || "Record",
  onArtworkError,
}: RvYearCoverProps) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  const usable = Boolean(src?.trim()) && !broken;

  if (!usable) {
    return (
      <span className={className} data-artwork-slot={artworkSlot}>
        <ArchiveCoverPlate
          context={{ artist, album: title }}
          className={fallbackClassName}
          density="compact"
        />
      </span>
    );
  }

  return (
    <img
      className={className}
      src={src!}
      alt={alt}
      loading={loading}
      decoding="async"
      data-artwork-slot={artworkSlot}
      onError={() => {
        setBroken(true);
        onArtworkError?.();
      }}
    />
  );
}
