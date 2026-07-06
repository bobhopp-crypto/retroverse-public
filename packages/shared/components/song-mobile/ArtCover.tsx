"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  label: string;
  className: string;
};

/**
 * Cover art with a graceful fallback. Retroverse cover URLs are graph-owned
 * and occasionally not yet uploaded — this never shows a broken-image icon
 * on a public experience; it shows an on-brand monogram tile instead.
 */
export function ArtCover({ src, alt, label, className }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    const initial = label.trim().charAt(0).toUpperCase() || "?";
    return (
      <span className={`${className} song-mx__art-fallback`} aria-hidden="true">
        {initial}
      </span>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
