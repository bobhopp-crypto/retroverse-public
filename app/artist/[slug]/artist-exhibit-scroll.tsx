"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Props = { slug: string };

function scrollStorageKey(slug: string, pathname: string): string {
  return `retroverse:artist-scroll:${slug}:${pathname}`;
}

export function ArtistExhibitScroll({ slug }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    const key = scrollStorageKey(slug, pathname);
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const y = Number.parseInt(saved, 10);
      if (Number.isFinite(y) && y > 0) {
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    }

    return () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };
  }, [slug, pathname]);

  return null;
}
