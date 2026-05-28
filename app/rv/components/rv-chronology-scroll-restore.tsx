"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { matchRvChronologyPath } from "@/lib/rv/rv-chronology-paths";

function scrollStorageKey(pathname: string): string {
  return `rv-chronology-scroll:${pathname}`;
}

/** Persist scroll per `/rv/...` route so browser back restores chronology position. */
export function RvChronologyScrollRestore() {
  const pathname = usePathname();

  useEffect(() => {
    if (!matchRvChronologyPath(pathname)) return;

    const key = scrollStorageKey(pathname);
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const y = Number(raw);
      if (Number.isFinite(y) && y >= 0) {
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    }

    return () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };
  }, [pathname]);

  return null;
}
