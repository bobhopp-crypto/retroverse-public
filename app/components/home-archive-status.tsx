"use client";

import { useEffect, useState } from "react";

const ARCHIVE_FACTS = [
  "Chart weeks preserved · 1958–2025",
  "Billboard Hot 100 archive active",
  "RV years ready to explore",
  "Albums, tracks, and artists linked in the graph",
  "Now indexing the stacks… quietly",
] as const;

const ROTATE_MS = 5200;

export function HomeArchiveStatus() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % ARCHIVE_FACTS.length);
    }, ROTATE_MS);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="home-directory__status" aria-live="polite">
      <div className="home-directory__status-chips" aria-label="Archive coverage">
        <span className="home-directory__chip home-directory__chip--teal">
          32,000+ recordings indexed
        </span>
        <span className="home-directory__chip home-directory__chip--rust">Hot 100 active</span>
        <span className="home-directory__chip home-directory__chip--brass">1958–2025</span>
      </div>
      <p className="home-directory__status-fact">{ARCHIVE_FACTS[index]}</p>
    </div>
  );
}
