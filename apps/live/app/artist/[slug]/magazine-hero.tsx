"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";

import { toneStyle } from "@/components/magazine/tone";
import {
  hasInternalBackEntry,
  RETROVERSE_HISTORY_EVENT,
} from "@/lib/navigation/internal-history";
import type { FlatTone } from "@/lib/theme/magazine-palette";

type Props = {
  name: string;
  heroImageUrl: string | null;
  initials: string;
  kicker: string;
  kickerTone: FlatTone;
  dek: string;
  dekTone: FlatTone;
  wordmark: FlatTone;
};

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function MagazineHero({
  name,
  heroImageUrl,
  initials,
  kicker,
  kickerTone,
  dek,
  dekTone,
  wordmark,
}: Props) {
  const router = useRouter();
  const [photo, setPhoto] = useState(Boolean(heroImageUrl));
  const [canBack, setCanBack] = useState(false);

  useEffect(() => {
    const sync = () => setCanBack(hasInternalBackEntry());
    sync();
    window.addEventListener(RETROVERSE_HISTORY_EVENT, sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener(RETROVERSE_HISTORY_EVENT, sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  return (
    <header className={photo ? "rv-mag-hero" : "rv-mag-hero rv-mag-hero--type"} aria-label={`${name} artist page`}>
      <div className="rv-mag-hero__mast">
        <Link
          href="/search"
          prefetch
          className="rv-mag-wordmark"
          style={toneStyle(wordmark)}
          aria-label={canBack ? "Back" : "Retroverse"}
          onClick={(event) => {
            if (isModifiedClick(event) || !canBack) return;
            event.preventDefault();
            router.back();
          }}
        >
          Retroverse
        </Link>
        <span>Artist In Depth</span>
      </div>
      {photo && heroImageUrl ? (
        <img src={heroImageUrl} alt="" onError={() => setPhoto(false)} />
      ) : (
        <div className="rv-mag-hero__initials" aria-hidden>
          {initials}
        </div>
      )}
      <div className="rv-mag-hero__title">
        <span className="rv-mag-tag" style={toneStyle(kickerTone)}>
          {kicker}
        </span>
        <h1 className="rv-mag-display">{name}</h1>
        <p className="rv-mag-hero__dek" style={toneStyle(dekTone)}>
          {dek}
        </p>
      </div>
    </header>
  );
}
