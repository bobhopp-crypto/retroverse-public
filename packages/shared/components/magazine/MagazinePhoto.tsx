"use client";

import { useState, type ReactNode } from "react";

type Props = {
  sources: string[];
  alt: string;
  className?: string;
  fallback: ReactNode;
};

/** Tries each source, then the fallback tile. A bad cover never leaves a broken image. */
export function MagazinePhoto({ sources, alt, className, fallback }: Props) {
  const [index, setIndex] = useState(0);
  const src = sources[index];
  if (!src) return fallback;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setIndex((current) => current + 1)}
    />
  );
}
